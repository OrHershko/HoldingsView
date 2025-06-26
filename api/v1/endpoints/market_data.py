from fastapi import APIRouter, status, Depends, HTTPException, Query
from pydantic import BaseModel

from api.auth.firebase import get_current_user
from api.tasks import (
    get_enriched_market_data_task,
    run_deep_dive_analysis_task,
    run_trading_strategy_task,
)
from api.schemas.task import TaskStatus
from api.services import market_data_aggregator
from api.schemas.market_data import SymbolSearchResponse

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