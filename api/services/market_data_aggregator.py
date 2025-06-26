from datetime import datetime
import yfinance as yf
from fastapi.concurrency import run_in_threadpool
import pandas as pd

from api.schemas.market_data import (
    EnrichedMarketData,
    Fundamentals,
    NewsArticle,
    OHLCV,
    TradingInfo,
    SymbolSearchResult,
    SymbolSearchResponse,
)
from api.services.technical_indicator_service import calculate_indicators

# Official lists taken from yfinance documentation / source
_ALLOWED_PERIODS: set[str] = {
    "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max",
}

_ALLOWED_INTERVALS: set[str] = {
    "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo",
}

async def get_enriched_market_data(
    symbol: str,
    *,
    period: str | None = None,
    interval: str | None = None,
) -> EnrichedMarketData:
    """
    Fetches, calculates, and aggregates comprehensive market data for a given stock symbol.
    
    Parameters
    ----------
    symbol : str
        Stock symbol, e.g. "AAPL".
    period : str | None, default None
        yfinance period such as "1y", "5d", "max".  If not supplied we
        default to 18 months using `period="18mo"` (historic behaviour).
    interval : str | None, default None
        yfinance interval such as "1d", "15m".  Leave `None` to let
        yfinance pick a sensible default for the chosen *period*.
    
    This function is designed to be run in a threadpool to avoid blocking the
    async event loop due to synchronous I/O calls in the yfinance library.
    
    Args:
        symbol: The stock ticker symbol (e.g., "AAPL").
        period: yfinance period string.
        interval: yfinance interval string.
    Raises
    ------
    ValueError
        If an unsupported *period* or *interval* is supplied.
    Returns:
        An EnrichedMarketData object containing all fetched and calculated data.
    """

    # --------------------------- Validation ---------------------------
    period_normalised, interval_normalised = _validate_and_normalize_parameters(period, interval)

    # -------------------------------- Strategy --------------------------------
    # We fetch **the maximum period allowed by Yahoo for the chosen interval**.
    # This reduces subsequent network calls: changing *period* on the client
    # merely zooms the chart instead of hitting the backend again.  We still
    # accept the *period* parameter but use it only for trimming after the full
    # dataset (needed for indicator calculations) has been retrieved.

    def _max_fetch_period_for_interval(i: str | None) -> str:
        """Return the longest period supported by Yahoo for a given interval."""
        if i in {"1m"}:
            return "30d"
        if i in {"2m", "5m", "15m", "30m"}:
            return "60d"
        if i in {"60m", "90m", "1h"}:
            return "730d"  # 2y (approx)
        # For daily and above we can safely ask for 'max'
        return "max"
    
    yf_interval = interval_normalised  # May be None (let Yahoo pick default daily)

    yf_period_extended = _max_fetch_period_for_interval(yf_interval) if yf_interval else "max"

    def fetch_and_process():
        ticker = yf.Ticker(symbol)

        hist_df = _fetch_historical_data(ticker, symbol, yf_period_extended, yf_interval)
            
        # Get company info for fundamentals
        info = ticker.info
        
        # Get latest news
        news = ticker.news
        
        # Calculate technical indicators and get both the updated DataFrame and latest values
        hist_df_with_indicators, technicals = calculate_indicators(hist_df.copy())

        # Rename columns to be Pydantic-friendly
        column_mapping = {
            'SMA_20': 'sma_20', 'SMA_50': 'sma_50', 'SMA_100': 'sma_100',
            'SMA_150': 'sma_150', 'SMA_200': 'sma_200', 'RSI_14': 'rsi_14'
        }
        hist_df_with_indicators.rename(columns=column_mapping, inplace=True)
        
        trimmed_df = _trim_dataframe_to_period(hist_df_with_indicators, period_normalised)

        historical_prices = []
        for index, row in trimmed_df.iterrows():
            safe_row = row.where(pd.notna(row), None).to_dict()
            historical_prices.append(
                OHLCV(
                    date=index.to_pydatetime(),
                    open=safe_row["Open"],
                    high=safe_row["High"],
                    low=safe_row["Low"],
                    close=safe_row["Close"],
                    volume=int(safe_row["Volume"]),
                    sma_20=safe_row.get('sma_20'),
                    sma_50=safe_row.get('sma_50'),
                    sma_100=safe_row.get('sma_100'),
                    sma_150=safe_row.get('sma_150'),
                    sma_200=safe_row.get('sma_200'),
                    rsi_14=safe_row.get('rsi_14'),
                )
            )
        
        earnings_timestamp = info.get("earningsTimestamp")
        
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
        
        trading_info = TradingInfo(
            market_state=info.get("marketState"),
            regular_market_change_percent=info.get("regularMarketChangePercent"),
            pre_market_price=info.get("preMarketPrice"),
            pre_market_change_percent=info.get("preMarketChangePercent"),
            post_market_price=info.get("postMarketPrice"),
            post_market_change_percent=info.get("postMarketChangePercent"),
        )
        
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
            current_price=info.get("currentPrice") or trimmed_df.iloc[-1]["Close"],
            historical_prices=historical_prices,
            technicals=technicals,
            fundamentals=fundamentals,
            trading_info=trading_info,
            news=formatted_news,
        )

    return await run_in_threadpool(fetch_and_process)


def _fetch_historical_data(ticker, symbol, yf_period, yf_interval):
    """Fetch historical price data from yfinance ticker."""
    if not ticker:
        raise ValueError(f"Could not find ticker for symbol: {symbol}")
    
    # Fetch historical price data with requested granularity
    # Only pass interval if it's not None, otherwise let yfinance choose default
    if yf_interval is not None:
        hist_df = ticker.history(period=yf_period, interval=yf_interval)
    else:
        hist_df = ticker.history(period=yf_period)
    
    if hist_df.empty:
        raise ValueError(f"Could not fetch historical data for symbol: {symbol}")
    
    return hist_df

def _validate_and_normalize_parameters(period: str | None, interval: str | None):
    period_normalised = period.lower() if period is not None else None
    interval_normalised = interval.lower() if interval is not None else None

    if period_normalised and period_normalised not in _ALLOWED_PERIODS:
        raise ValueError(
            f"Unsupported period '{period}'. Allowed values: {', '.join(sorted(_ALLOWED_PERIODS))}."
        )

    if interval_normalised and interval_normalised not in _ALLOWED_INTERVALS:
        raise ValueError(
            f"Unsupported interval '{interval}'. Allowed values: {', '.join(sorted(_ALLOWED_INTERVALS))}."
        )

    # yfinance requires period when interval < 1d; enforce that early
    if interval_normalised and interval_normalised not in {"1d", "5d", "1wk", "1mo", "3mo"} and not period_normalised:
        raise ValueError("A 'period' must be supplied when using an intraday interval (under 1d).")
    
    return period_normalised, interval_normalised

def _trim_dataframe_to_period(df: pd.DataFrame, period_str: str | None) -> pd.DataFrame:
    """Return slice of *df* matching the requested *period*. When *period*
    is None or 'max' the DataFrame is returned unchanged.  For 'ytd' we
    slice from 1-Jan of the current year.  For the remaining period
    strings we use a pandas offset alias (preferred) or a date delta
    approximation.
    """
    if not period_str or period_str == "max":
        return df

    if period_str == "ytd":
        jan_first = datetime(datetime.utcnow().year, 1, 1)
        return df[df.index >= jan_first]

    alias_map = {
        "1d": "1D",
        "5d": "5D",
        "1mo": "1M",
        "3mo": "3M",
        "6mo": "6M",
        "1y": "1Y",
        "2y": "2Y",
        "5y": "5Y",
        "10y": "10Y",
    }
    offset = alias_map.get(period_str)
    if offset:
        try:
            return df.iloc[-offset:]
        except Exception:
            # In case .last() fails (e.g., intraday index), fall back to timedelta
            pass

    delta_days_map = {
        "1d": 1,
        "5d": 5,
        "1mo": 30,
        "3mo": 90,
        "6mo": 180,
        "1y": 365,
        "2y": 730,
        "5y": 1825,
        "10y": 3650,
    }
    days = delta_days_map.get(period_str)
    if days:
        cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=days)
        return df[df.index >= cutoff]

    return df

async def search_symbols(query: str) -> SymbolSearchResponse:
    """
    Search for stock symbols using yfinance's Search class.
    Returns a SymbolSearchResponse with a list of SymbolSearchResult.
    Only returns stocks (EQUITY) and ETFs (ETF).
    """
    def do_search():
        s = yf.Search(query)
        return getattr(s, 'quotes', [])

    quotes = await run_in_threadpool(do_search)
    results = [
        SymbolSearchResult(**q)
        for q in quotes
        if 'symbol' in q and q.get('quoteType') in {'EQUITY', 'ETF'}
    ]
    return SymbolSearchResponse(results=results)