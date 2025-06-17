from typing import List, Dict

import yfinance as yf
import pandas as pd
from fastapi.concurrency import run_in_threadpool

def _fetch_prices_sync(symbols: List[str]) -> Dict[str, Dict[str, float]]:
    """
    The synchronous core of the price fetching logic using yfinance.download.
    This function is designed to be run in a separate thread.
    It returns price, today's change, and today's change percentage.
    """
    results: Dict[str, Dict[str, float]] = {}
    
    try:
        # We fetch 2 days of data to calculate change from the previous close.
        data: pd.DataFrame = yf.download(
            tickers=symbols, 
            period="2d", 
            progress=False,
        )

        if data.empty or len(data) < 2:
            return {}

        close_prices_df = data.get('Close')
        # If single ticker, it's a Series, not a DataFrame slice.
        if isinstance(close_prices_df, pd.Series):
            close_prices_df = close_prices_df.to_frame(name=symbols[0])

        last_prices = close_prices_df.iloc[-1]
        prev_prices = close_prices_df.iloc[-2]

        changes = last_prices - prev_prices
        percent_changes = (changes / prev_prices) * 100

        for symbol in close_prices_df.columns:
            price = last_prices.get(symbol)
            if pd.notna(price):
                change = changes.get(symbol, 0.0)
                change_percent = percent_changes.get(symbol, 0.0)

                results[symbol] = {
                    "price": float(price),
                    "change": float(change) if pd.notna(change) else 0.0,
                    "change_percent": float(change_percent) if pd.notna(change_percent) else 0.0,
                }

    except Exception as e:
        # Broad exception catch as yfinance can have various internal issues.
        print(f"An error occurred while fetching data with yfinance.download: {e}")
        return {} 
        
    return results


async def get_current_prices(symbols: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Fetches current market price and daily change for a list of stock symbols.
    It runs the synchronous yfinance calls in a thread pool.

    Args:
        symbols: A list of unique stock symbols.

    Returns:
        A dictionary mapping each symbol to a dict with 'price', 'change', 
        and 'change_percent'.
        If a symbol is not found or an error occurs, it will be omitted.
    """
    if not symbols:
        return {}
    
    # yfinance is case-insensitive but can be particular. Uppercasing is safer.
    unique_symbols = list(set(s.upper() for s in symbols))
    return await run_in_threadpool(_fetch_prices_sync, unique_symbols)