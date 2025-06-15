from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.auth.firebase import get_current_user, get_db
from api.crud import crud_portfolio, crud_transaction
from api.models.user import User
from api.schemas.ai import AnalysisResult
from api.schemas.holding import CalculatedHolding
from api.schemas.portfolio import (
    PortfolioCreate,
    PortfolioRead,
    PortfolioReadWithHoldings,
    PortfolioUpdate,
)
from api.schemas.transaction import TransactionCreate, TransactionRead
from api.services import ai_analyzer, market_data_service
from api.services.portfolio_analyzer import calculate_holdings_from_transactions

router = APIRouter()


# --- Portfolio Endpoints ---
@router.post(
    "",
    response_model=PortfolioRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Portfolio",
)
def create_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_in: PortfolioCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new portfolio for the current user.
    """
    portfolio = crud_portfolio.create_with_owner(
        db=db, obj_in=portfolio_in, user_id=current_user.id
    )
    return portfolio


@router.get("", response_model=List[PortfolioRead], summary="List User's Portfolios")
def read_portfolios(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all portfolios for the current user.
    """
    portfolios = crud_portfolio.get_multi_by_user(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )
    return portfolios


@router.get(
    "/{portfolio_id}",
    response_model=PortfolioReadWithHoldings,
    summary="Get Portfolio by ID with Full Analysis",
)
async def read_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific portfolio by ID, including its holdings calculated with
    live market data.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # 1. Calculate base holdings (symbol, quantity, cost basis) from transactions.
    base_holdings = calculate_holdings_from_transactions(portfolio.transactions)
    
    # 2. Get unique symbols from the calculated holdings to fetch market data.
    unique_symbols = [h.symbol for h in base_holdings]
    
    # 3. Fetch current prices for these symbols.
    market_prices = await market_data_service.get_current_prices(unique_symbols)
    
    # 4. Enrich holdings with market data and calculate market value, P/L, etc.
    enriched_holdings: List[CalculatedHolding] = []
    for holding in base_holdings:
        current_price = market_prices.get(holding.symbol)
        if current_price:
            holding.current_price = current_price
            holding.market_value = holding.quantity * current_price
            holding.unrealized_gain_loss = holding.market_value - holding.total_cost_basis
            if holding.total_cost_basis > 0:
                holding.unrealized_gain_loss_percent = (holding.unrealized_gain_loss / holding.total_cost_basis) * 100
            else:
                holding.unrealized_gain_loss_percent = 0.0
        enriched_holdings.append(holding)

    # 5. Calculate portfolio-level summary from enriched holdings.
    total_market_value = sum(h.market_value for h in enriched_holdings if h.market_value is not None)
    total_cost_basis = sum(h.total_cost_basis for h in enriched_holdings)
    
    total_unrealized_gain_loss = 0.0
    if total_market_value > 0 and total_cost_basis > 0:
        total_unrealized_gain_loss = total_market_value - total_cost_basis
    
    total_unrealized_gain_loss_percent = 0.0
    if total_cost_basis > 0:
        total_unrealized_gain_loss_percent = (total_unrealized_gain_loss / total_cost_basis) * 100

    # 6. Combine portfolio data with calculated holdings and summary for the response.
    portfolio_response_data = {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "user_id": portfolio.user_id,
        "created_at": portfolio.created_at,
        "updated_at": portfolio.updated_at,
        "holdings": enriched_holdings,
        "total_market_value": total_market_value,
        "total_cost_basis": total_cost_basis,
        "total_unrealized_gain_loss": total_unrealized_gain_loss,
        "total_unrealized_gain_loss_percent": total_unrealized_gain_loss_percent,
    }

    return PortfolioReadWithHoldings(**portfolio_response_data)


@router.put("/{portfolio_id}", response_model=PortfolioRead, summary="Update Portfolio")
def update_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    portfolio_in: PortfolioUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update a portfolio's details.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio = crud_portfolio.update(db=db, db_obj=portfolio, obj_in=portfolio_in)
    return portfolio


@router.delete(
    "/{portfolio_id}", response_model=PortfolioRead, summary="Delete Portfolio"
)
def delete_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a portfolio and all its associated transactions.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    deleted_portfolio = crud_portfolio.remove(
        db=db, id=portfolio_id, user_id=current_user.id
    )
    return deleted_portfolio


# --- Transaction Endpoints ---
@router.post(
    "/{portfolio_id}/transactions",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add Transaction to Portfolio",
)
def create_transaction(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    transaction_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new transaction (BUY or SELL) and add it to a portfolio.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    transaction = crud_transaction.create_with_portfolio(
        db=db, obj_in=transaction_in, portfolio_id=portfolio_id
    )
    return transaction


@router.delete(
    "/{portfolio_id}/transactions/{transaction_id}",
    response_model=TransactionRead,
    summary="Delete Transaction from Portfolio",
)
def delete_transaction(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    transaction_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a specific transaction from a portfolio.
    This is a hard delete and should be used with caution.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    transaction = crud_transaction.get(db=db, id=transaction_id)
    if not transaction or transaction.portfolio_id != portfolio_id:
        raise HTTPException(
            status_code=404, detail="Transaction not found in this portfolio"
        )

    deleted_transaction = crud_transaction.remove(db=db, id=transaction_id)
    return deleted_transaction


# --- AI Analysis Endpoint ---
@router.post(
    "/{portfolio_id}/analyze",
    response_model=AnalysisResult,
    summary="Get AI Analysis for Portfolio",
)
async def get_portfolio_analysis(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Triggers an AI-powered analysis for a specific portfolio's current holdings.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # We only need the base holdings (cost basis, etc.) for the AI analysis prompt.
    calculated_holdings = calculate_holdings_from_transactions(portfolio.transactions)
    
    if not calculated_holdings:
        return AnalysisResult(content="Portfolio has no holdings to analyze.")

    analysis_content = await ai_analyzer.analyze_portfolio(calculated_holdings)
    return AnalysisResult(content=analysis_content)