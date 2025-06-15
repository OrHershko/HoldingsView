from fastapi import APIRouter, HTTPException, status, Depends
from api.auth.firebase import get_current_user
from api.schemas.market_data import EnrichedMarketData
from api.services import market_data_aggregator

router = APIRouter()

@router.get(
    "/{symbol}",
    response_model=EnrichedMarketData,
    summary="Get Enriched Market Data for a Symbol",
    dependencies=[Depends(get_current_user)] # Secure this endpoint
)
async def get_market_data_for_symbol(symbol: str):
    """
    Retrieve comprehensive market data for a single stock symbol.
    
    This includes:
    - Current price and historical OHLCV data.
    - Calculated technical indicators (SMA, RSI, MACD, etc.).
    - Key fundamental data (Market Cap, P/E, EPS, etc.).
    - Latest news articles.
    """
    try:
        data = await market_data_aggregator.get_enriched_market_data(symbol)
        return data
    except (ValueError, KeyError, IndexError) as e:
        # Catch potential errors from yfinance if a symbol is invalid or data is missing
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not retrieve market data for symbol '{symbol}'. Error: {e}",
        )