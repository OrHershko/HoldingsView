from typing import List, Literal
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from api.auth.firebase import get_current_user, get_db
from api.crud import crud_portfolio, crud_transaction, crud_portfolio_snapshot
from api.models.user import User
from api.schemas.ai import AnalysisResult
from api.schemas.holding import CalculatedHolding
from api.schemas.performance import PortfolioPerformanceData
from api.schemas.portfolio import (
    PortfolioCreate,
    PortfolioRead,
    PortfolioReadWithHoldings,
    PortfolioUpdate,
)
from api.schemas.transaction import TransactionCreate, TransactionRead
from api.services import ai_analyzer, market_data_service
from api.services.portfolio_analyzer import calculate_holdings_from_transactions
from api.tasks import create_portfolio_snapshot
from api.core.config import settings

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

    # 3. Fetch current prices and daily changes for these symbols.
    market_data = await market_data_service.get_current_prices(unique_symbols)

    # 4. Enrich holdings with market data and calculate market value, P/L, etc.
    enriched_holdings: List[CalculatedHolding] = []
    total_todays_change = 0.0
    for holding in base_holdings:
        symbol_data = market_data.get(holding.symbol)
        current_price = None
        todays_change = 0.0
        todays_change_percent = 0.0

        if symbol_data is not None:
            if isinstance(symbol_data, dict):
                current_price = symbol_data.get("price")
                todays_change = symbol_data.get("change", 0.0)
                todays_change_percent = symbol_data.get("change_percent", 0.0)
            else:
                # Handle legacy float format
                current_price = symbol_data

        if current_price is not None:
            holding.current_price = current_price
            holding.market_value = holding.quantity * current_price
            holding.unrealized_gain_loss = (
                holding.market_value - holding.total_cost_basis
            )
            if holding.total_cost_basis > 0:
                holding.unrealized_gain_loss_percent = (
                    holding.unrealized_gain_loss / holding.total_cost_basis
                ) * 100
            else:
                holding.unrealized_gain_loss_percent = 0.0

            # Add today's change data
            holding.todays_change = todays_change
            holding.todays_change_percent = todays_change_percent

            # Add to portfolio's total change
            total_todays_change += holding.quantity * todays_change
        enriched_holdings.append(holding)

    # 5. Calculate portfolio-level summary from enriched holdings.
    total_market_value = sum(
        h.market_value for h in enriched_holdings if h.market_value is not None
    )
    total_cost_basis = sum(h.total_cost_basis for h in enriched_holdings)

    total_unrealized_gain_loss = 0.0
    if total_market_value > 0 and total_cost_basis > 0:
        total_unrealized_gain_loss = total_market_value - total_cost_basis

    total_unrealized_gain_loss_percent = 0.0
    if total_cost_basis > 0:
        total_unrealized_gain_loss_percent = (
            total_unrealized_gain_loss / total_cost_basis
        ) * 100

    total_todays_change_percent = 0.0
    if total_market_value > 0 and total_todays_change != 0:
        # Prevent division by zero if total value was zero before today's change
        value_before_change = total_market_value - total_todays_change
        if value_before_change != 0:
            total_todays_change_percent = (
                total_todays_change / value_before_change
            ) * 100

    # 6. Combine portfolio data with calculated holdings and summary for the response.
    portfolio_response_data = {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "user_id": portfolio.user_id,
        "created_at": portfolio.created_at,
        "updated_at": portfolio.updated_at,
        "holdings": enriched_holdings,
        "transactions": portfolio.transactions,
        "total_market_value": total_market_value,
        "total_cost_basis": total_cost_basis,
        "total_unrealized_gain_loss": total_unrealized_gain_loss,
        "total_unrealized_gain_loss_percent": total_unrealized_gain_loss_percent,
        "total_todays_change": total_todays_change,
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

    # --- Start of new validation logic ---
    if transaction_in.transaction_type == "SELL":
        # portfolio.transactions is available due to eager loading in crud_portfolio.get
        calculated_holdings = calculate_holdings_from_transactions(
            portfolio.transactions
        )

        current_holding = next(
            (
                h
                for h in calculated_holdings
                if h.symbol.upper() == transaction_in.symbol.upper()
            ),
            None,
        )

        current_quantity = current_holding.quantity if current_holding else 0.0

        if current_quantity < transaction_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient quantity of {transaction_in.symbol}. "
                    f"Current holding: {current_quantity}, "
                    f"attempting to sell: {transaction_in.quantity}"
                ),
            )
    # --- End of new validation logic ---

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


# --- Performance Endpoint ---
@router.get(
    "/{portfolio_id}/performance",
    response_model=PortfolioPerformanceData,
    summary="Get Historical Portfolio Performance",
)
def get_portfolio_performance(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    timespan: Literal["1M", "3M", "6M", "1Y", "ALL"] = Query(
        "1Y", description="The time range for the performance data."
    ),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the historical performance data for a specific portfolio.

    This endpoint returns a time-series of daily snapshots, each containing the
    total market value and cost basis, ready for charting.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    end_date = date.today()
    if timespan == "1M":
        start_date = end_date - timedelta(days=30)
    elif timespan == "3M":
        start_date = end_date - timedelta(days=90)
    elif timespan == "6M":
        start_date = end_date - timedelta(days=180)
    elif timespan == "1Y":
        start_date = end_date - timedelta(days=365)
    else:  # ALL
        start_date = date.min

    snapshots = crud_portfolio_snapshot.get_snapshots_by_portfolio(
        db=db, portfolio_id=portfolio_id, start_date=start_date, end_date=end_date
    )

    return PortfolioPerformanceData(
        portfolio_id=portfolio_id, performance_history=snapshots
    )


# --- Debug Endpoint ---
@router.post(
    "/{portfolio_id}/trigger-snapshot",
    summary="[DEBUG] Manually trigger a snapshot calculation",
    include_in_schema=settings.ENVIRONMENT == "development",  # Only show in docs for dev
)
def trigger_snapshot_for_portfolio(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    A debug endpoint to manually trigger the background task for creating
    a portfolio snapshot. Useful for testing without waiting for the nightly job.
    """
    if settings.ENVIRONMENT != "development":
        raise HTTPException(
            status_code=403, detail="This endpoint is only available in development."
        )

    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    task = create_portfolio_snapshot.delay(portfolio_id)
    return {"message": "Snapshot creation task dispatched.", "task_id": task.id}