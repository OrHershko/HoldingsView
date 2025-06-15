from datetime import datetime
import yfinance as yf
from fastapi.concurrency import run_in_threadpool

from api.schemas.market_data import (
    EnrichedMarketData,
    Fundamentals,
    NewsArticle,
    OHLCV,
)
from api.services.technical_indicator_service import calculate_indicators

async def get_enriched_market_data(symbol: str) -> EnrichedMarketData:
    """
    Fetches, calculates, and aggregates comprehensive market data for a given stock symbol.
    
    This function is designed to be run in a threadpool to avoid blocking the
    async event loop due to synchronous I/O calls in the yfinance library.
    
    Args:
        symbol: The stock ticker symbol (e.g., "AAPL").
        
    Returns:
        An EnrichedMarketData object containing all fetched and calculated data.
    """

    def fetch_and_process():
        # yfinance.Ticker is a convenient way to get all data for a symbol
        ticker = yf.Ticker(symbol)
        
        # 1. Fetch historical price data for technical analysis
        # We fetch 1.5 years of data to ensure enough points for a 200-day SMA.
        hist_df = ticker.history(period="18mo")
        if hist_df.empty:
            raise ValueError(f"Could not fetch historical data for symbol: {symbol}")
            
        # 2. Get company info for fundamentals
        info = ticker.info
        
        # 3. Get latest news
        news = ticker.news
        
        # --- Processing and Calculation ---
        
        # Calculate technical indicators from the historical data
        technicals = calculate_indicators(hist_df.copy()) # Pass a copy
        
        # Format historical data into Pydantic models
        historical_prices = [
            OHLCV(
                date=index.date(),
                open=row["Open"],
                high=row["High"],
                low=row["Low"],
                close=row["Close"],
                volume=row["Volume"],
            )
            for index, row in hist_df.iterrows()
        ]
        
        # Assemble fundamentals, safely getting values from the info dict
        fundamentals = Fundamentals(
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            eps=info.get("trailingEps"),
            dividend_yield=info.get("dividendYield"),
            beta=info.get("beta"),
            sector=info.get("sector"),
            industry=info.get("industry"),
            week_52_high=info.get("fiftyTwoWeekHigh"),
            week_52_low=info.get("fiftyTwoWeekLow"),
            description=info.get("longBusinessSummary"),
        )
        
        # Format news articles
        formatted_news = [
            NewsArticle(
                title=item.get("title"),
                publisher=item.get("publisher"),
                link=item.get("link"),
                provider_publish_time=datetime.fromtimestamp(item.get("providerPublishTime")),
            )
            for item in news if "providerPublishTime" in item
        ]
        
        # Assemble the final, enriched data object
        return EnrichedMarketData(
            symbol=symbol.upper(),
            current_price=hist_df.iloc[-1]["Close"], # Use last close as current price
            historical_prices=historical_prices,
            technicals=technicals,
            fundamentals=fundamentals,
            news=formatted_news,
        )

    # Run the synchronous yfinance blocking calls in a separate thread
    return await run_in_threadpool(fetch_and_process)