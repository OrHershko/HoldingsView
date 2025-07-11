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

    # 2. Separate stock and options holdings for different market data fetching
    stock_holdings = [h for h in base_holdings if not h.is_option]
    options_holdings = [h for h in base_holdings if h.is_option]

    # 3. Fetch current prices for stock holdings
    stock_symbols = [h.symbol for h in stock_holdings]
    stock_market_data = await market_data_service.get_current_prices(stock_symbols) if stock_symbols else {}

    # 4. Get market data service for options
    market_service = market_data_service.get_market_data_service()

    # 5. Enrich holdings with market data and calculate market value, P/L, etc.
    enriched_holdings: List[CalculatedHolding] = []
    total_todays_change = 0.0
    
    # Process stock holdings
    for holding in stock_holdings:
        symbol_data = stock_market_data.get(holding.symbol)
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

    # Process options holdings
    for holding in options_holdings:
        current_price = None
        
        # Get option chain data for this underlying symbol and expiration
        if holding.underlying_symbol and holding.expiration_date:
            expiration_str = holding.expiration_date.strftime('%Y-%m-%d')
            option_chain = market_service.get_option_chain(holding.underlying_symbol, expiration_str)
            
            if option_chain:
                # Find the specific contract
                contracts = option_chain.get('calls' if holding.option_type == 'CALL' else 'puts', [])
                contract = next((c for c in contracts if c.get('strike') == holding.strike_price), None)
                
                if contract:
                    # Use the last price, or bid/ask midpoint if no last price
                    current_price = contract.get('lastPrice')
                    if not current_price or current_price == 0:
                        bid = contract.get('bid', 0)
                        ask = contract.get('ask', 0)
                        if bid > 0 and ask > 0:
                            current_price = (bid + ask) / 2
                        elif bid > 0:
                            current_price = bid
                        elif ask > 0:
                            current_price = ask

        if current_price is not None and current_price > 0:
            holding.current_price = current_price
            holding.market_value = holding.quantity * current_price * 100  # Options are priced per share but sold in contracts of 100
            holding.unrealized_gain_loss = (
                holding.market_value - holding.total_cost_basis
            )
            if holding.total_cost_basis > 0:
                holding.unrealized_gain_loss_percent = (
                    holding.unrealized_gain_loss / holding.total_cost_basis
                ) * 100
            else:
                holding.unrealized_gain_loss_percent = 0.0

        holding.todays_change = contract.get('change', 0.0) * 100
        holding.todays_change_percent = contract.get('percentChange', 0.0)

        enriched_holdings.append(holding)

    # 6. Calculate portfolio-level summary from enriched holdings.
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

    # 7. Combine portfolio data with calculated holdings and summary for the response.
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
        "total_todays_change_percent": total_todays_change_percent,
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
    Create a new transaction (BUY, SELL, OPTION_BUY, OPTION_SELL) and add it to a portfolio.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # --- Start of new validation logic ---
    if transaction_in.transaction_type == "SELL" and not getattr(transaction_in, 'is_option', False):
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


@router.put(
    "/{portfolio_id}/transactions/{transaction_id}",
    response_model=TransactionRead,
    summary="Update Transaction in Portfolio",
)
def update_transaction(
    *,
    db: Session = Depends(get_db),
    portfolio_id: int,
    transaction_id: int,
    transaction_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing transaction in a portfolio.
    """
    portfolio = crud_portfolio.get(db=db, id=portfolio_id, user_id=current_user.id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    transaction = crud_transaction.get(db=db, id=transaction_id)
    if not transaction or transaction.portfolio_id != portfolio_id:
        raise HTTPException(
            status_code=404, detail="Transaction not found in this portfolio"
        )

    # Validate SELL transactions for stocks (similar to create transaction)
    if transaction_in.transaction_type == "SELL" and not getattr(transaction_in, 'is_option', False):
        # Get all transactions except the one being updated for validation
        other_transactions = [t for t in portfolio.transactions if t.id != transaction_id]
        calculated_holdings = calculate_holdings_from_transactions(other_transactions)

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
                    f"Available to sell: {current_quantity}, "
                    f"attempting to sell: {transaction_in.quantity}"
                ),
            )

    updated_transaction = crud_transaction.update(
        db=db, db_obj=transaction, obj_in=transaction_in
    )
    return updated_transaction


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