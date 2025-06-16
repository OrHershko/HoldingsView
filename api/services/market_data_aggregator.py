from datetime import datetime
import yfinance as yf
from fastapi.concurrency import run_in_threadpool

from api.schemas.market_data import (
    EnrichedMarketData,
    Fundamentals,
    NewsArticle,
    OHLCV,
    TradingInfo,
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
        ticker = yf.Ticker(symbol)

        if not ticker:
            raise ValueError(f"Could not find ticker for symbol: {symbol}")
        
        # 1. Fetch historical price data for technical analysis
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
        
        # Extract earnings timestamp safely
        earnings_timestamp = info.get("earningsTimestamp")
        
        # Assemble fundamentals with additional fields
        fundamentals = Fundamentals(
            market_cap=info.get("marketCap"),
            sector=info.get("sector"),
            industry=info.get("industry"),
            description=info.get("longBusinessSummary"),
            pe_ratio=info.get("trailingPE"),
            forward_pe_ratio=info.get("forwardPE"),
            price_to_book_ratio=info.get("priceToBook"),
            price_to_sales_ratio=info.get("priceToSalesTrailing12Months"),
            eps=info.get("trailingEps"),
            dividend_yield=info.get("dividendYield"),
            payout_ratio=info.get("payoutRatio"),
            beta=info.get("beta"),
            profit_margins=info.get("profitMargins"),
            return_on_equity=info.get("returnOnEquity"),
            total_debt=info.get("totalDebt"),
            total_cash=info.get("totalCash"),
            free_cashflow=info.get("freeCashflow"),
            week_52_high=info.get("fiftyTwoWeekHigh"),
            week_52_low=info.get("fiftyTwoWeekLow"),
            earnings_date=datetime.fromtimestamp(earnings_timestamp) if earnings_timestamp else None,
            analyst_recommendation=info.get("recommendationKey"),
            analyst_target_price=info.get("targetMeanPrice"),
            number_of_analyst_opinions=info.get("numberOfAnalystOpinions"),
        )
        
        # Populate trading information
        trading_info = TradingInfo(
            market_state=info.get("marketState"),
            regular_market_change_percent=info.get("regularMarketChangePercent"),
            pre_market_price=info.get("preMarketPrice"),
            pre_market_change_percent=info.get("preMarketChangePercent"),
            post_market_price=info.get("postMarketPrice"),
            post_market_change_percent=info.get("postMarketChangePercent"),
        )
        
        # Format news items with error handling
        formatted_news = []
        for item in news:
            try:
                content = item.get("content", {})
                
                title = content.get("title")
                publisher = content.get("provider", {}).get("displayName")
                link = content.get("canonicalUrl", {}).get("url")
                pub_date_str = content.get("pubDate")

                if not all([title, publisher, link, pub_date_str]):
                    continue

                # Convert the ISO 8601 date string to a datetime object
                # The .replace() handles the 'Z' (Zulu) timezone indicator.
                publish_time = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))

                formatted_news.append(
                    NewsArticle(
                        title=title,
                        publisher=publisher,
                        link=link,
                        provider_publish_time=publish_time,
                    )
                )
            except (TypeError, KeyError, ValueError) as e:
                print(f"Warning: Could not parse news item for {symbol}. Error: {e}. Item: {item}")
                continue
        
        return EnrichedMarketData(
            symbol=symbol.upper(),
            short_name=info.get("shortName"),
            long_name=info.get("longName"),
            current_price=info.get("currentPrice") or hist_df.iloc[-1]["Close"],
            historical_prices=historical_prices,
            technicals=technicals,
            fundamentals=fundamentals,
            trading_info=trading_info,
            news=formatted_news,
        )

    return await run_in_threadpool(fetch_and_process)