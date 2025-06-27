from fastapi import APIRouter, status, Depends, HTTPException, Query
from pydantic import BaseModel
import logging

from api.auth.firebase import get_current_user
from api.services.market_data_service import MarketDataService, get_market_data_service
from api.tasks import (
    get_enriched_market_data_task,
    run_deep_dive_analysis_task,
    run_trading_strategy_task,
)
from api.schemas.task import TaskStatus
from api.services import market_data_aggregator
from api.schemas.market_data import SymbolSearchResponse, OptionChain

router = APIRouter()


class AiRequestBody(BaseModel):
    language: str = "English"


@router.post(
    "/{symbol}",
    response_model=TaskStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Enriched Market Data Fetch For Symbol",
    dependencies=[Depends(get_current_user)],
)
def trigger_market_data_for_symbol(
    symbol: str,
    period: str | None = Query(
        None,
        description="yfinance period string, e.g. '1y', '5d', 'max'. Leave empty for default.",
    ),
    interval: str | None = Query(
        None,
        description="yfinance interval string, e.g. '1d', '15m'. Leave empty for default.",
    ),
):
    """
    Submits a background task to fetch and analyze market data for a symbol.
    This endpoint returns immediately with a `task_id`. Use the
    `/api/v1/tasks/{task_id}` endpoint to check the status and retrieve the
    result once the task is complete.
    """
    task = get_enriched_market_data_task.delay(symbol.upper(), period=period, interval=interval)
    return TaskStatus(task_id=task.id, status="PENDING")


@router.post(
    "/{symbol}/analyze",
    response_model=TaskStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI-Powered Deep Dive Stock Analysis",
    dependencies=[Depends(get_current_user)],
)
async def analyze_stock(symbol: str, request: AiRequestBody):
    """
    Submits a background task to generate a detailed narrative analysis for a stock.

    This endpoint first fetches comprehensive market data and then queues a
    background job for the AI to analyze it. It returns immediately with a `task_id`.
    Use the `/tasks/{task_id}` endpoint to poll for the result.
    """
    try:
        enriched_data = await market_data_aggregator.get_enriched_market_data(
            symbol.upper()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    task = run_deep_dive_analysis_task.delay(enriched_data.model_dump(mode="json"), language=request.language)
    return TaskStatus(task_id=task.id, status="PENDING")


@router.post(
    "/{symbol}/strategize",
    response_model=TaskStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI-Powered Trading Strategy Generation",
    dependencies=[Depends(get_current_user)],
)
async def get_trading_strategy(symbol: str, request: AiRequestBody):
    """
    Submits a background task to generate a short-term, actionable trading strategy.

    This endpoint first fetches comprehensive market data and then queues a
    background job for the AI to analyze it. It returns immediately with a `task_id`.
    Use the `/tasks/{task_id}` endpoint to poll for the structured result.
    """
    try:
        enriched_data = await market_data_aggregator.get_enriched_market_data(
            symbol.upper()
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch market data: {e}",
        )

    task = run_trading_strategy_task.delay(enriched_data.model_dump(mode="json"), language=request.language)
    return TaskStatus(task_id=task.id, status="PENDING")


@router.get(
    "/search",
    response_model=SymbolSearchResponse,
    summary="Search for stock symbols",
    dependencies=[Depends(get_current_user)],
)
async def search_stocks(query: str = Query(..., min_length=1, description="Search query for stock symbols or names")):
    return await market_data_aggregator.search_symbols(query)


@router.get(
    "/prices",
    response_model=dict,
    summary="Get Current Prices",
    description="Get current market prices for one or more stock symbols.",
    dependencies=[Depends(get_current_user)],
)
async def get_current_prices(
    symbols: str = Query(..., description="Comma-separated list of symbols, e.g., 'AAPL,GOOGL,TSLA'")
):
    """
    Get current market prices for the provided symbols.
    Returns a dictionary with symbol as key and price data as value.
    """
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        if not symbol_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one symbol is required."
            )
        
        # Import here to avoid circular imports
        from api.services import market_data_service
        prices = await market_data_service.get_current_prices(symbol_list)
        
        if not prices:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No price data found for the provided symbols."
            )
        
        return prices
    except Exception as e:
        logging.error(f"Error fetching prices for symbols {symbols}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching prices: {str(e)}"
        )


@router.get(
    "/{symbol}/option-expirations",
    response_model=list[str],
    summary="Get Option Expiration Dates",
    description="Retrieve available option expiration dates for a given stock symbol.",
)
def get_option_expirations(
    symbol: str,
    market_data_service: MarketDataService = Depends(get_market_data_service),
):
    """
    Get available option expiration dates for a given symbol.
    """
    try:
        expirations = market_data_service.get_option_expiration_dates(symbol)
        if not expirations:
            logging.info(f"No option expirations found for {symbol}")
            return []
        return expirations
    except ValueError as e:
        logging.info(f"No option expirations found for {symbol}")
        return []
    except Exception as e:
        logging.error(f"Error fetching option expirations for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching option expirations: {str(e)}",
        )


@router.get(
    "/{symbol}/option-chain",
    response_model=OptionChain,
    summary="Get Option Chain",
    description="Retrieve the full option chain (calls and puts) for a given stock symbol and expiration date.",
)
def get_option_chain(
    symbol: str,
    expiration_date: str,
    market_data_service: MarketDataService = Depends(get_market_data_service),
):
    """
    Get the option chain for a given symbol and expiration date.
    """
    try:
        chain = market_data_service.get_option_chain(symbol, expiration_date)
        if not chain:
            logging.info(f"No option chain found for {symbol} on {expiration_date}")
            return None
        return chain
    except Exception as e:
        logging.error(f"Error fetching option chain for {symbol} on {expiration_date}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching the option chain: {str(e)}",
        )