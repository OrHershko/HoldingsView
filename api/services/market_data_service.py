from typing import List, Dict

import yfinance as yf
import pandas as pd
from fastapi.concurrency import run_in_threadpool

def _fetch_prices_sync(symbols: List[str]) -> Dict[str, float]:
    """
    The synchronous core of the price fetching logic using yfinance.download.
    This function is designed to be run in a separate thread.
    It's more efficient than yf.Tickers for just getting current prices.
    """
    prices: Dict[str, float] = {}
    
    try:
        # We fetch 2 days of data to ensure we get the last closing price
        # even if the market is closed today.
        # progress=False disables the progress bar in logs.
        data: pd.DataFrame = yf.download(
            tickers=symbols, 
            period="2d", 
            progress=False,
        )

        if data.empty:
            return {}

        # The result for multiple tickers has multi-level columns (e.g., ('Close', 'AAPL')).
        # We select the 'Close' prices.
        close_prices = data['Close']

        # The last row contains the most recent price for each ticker.
        # This will be a Pandas Series for multiple tickers, or a scalar for single ticker.
        last_prices = close_prices.iloc[-1]

        # Handle both single ticker (scalar) and multiple tickers (Series) cases
        if isinstance(last_prices, pd.Series):
            # Multiple tickers - convert series to dict and remove NaN values
            prices = last_prices.dropna().to_dict()
        else:
            # Single ticker - last_prices is a scalar
            if pd.notna(last_prices) and len(symbols) == 1:
                prices = {symbols[0]: float(last_prices)}
            else:
                prices = {}

    except Exception as e:
        # Broad exception catch as yfinance can have various internal issues.
        print(f"An error occurred while fetching data with yfinance.download: {e}")
        return {} # Fail gracefully
        
    return prices


async def get_current_prices(symbols: List[str]) -> Dict[str, float]:
    """
    Fetches the current market price for a list of stock symbols using yfinance.
    It runs the synchronous yfinance calls in a thread pool to avoid blocking
    the FastAPI event loop.

    Args:
        symbols: A list of unique stock symbols.

    Returns:
        A dictionary mapping each symbol to its current price.
        If a symbol is not found or an error occurs, it will be omitted.
    """
    if not symbols:
        return {}
    
    # Use run_in_threadpool to execute the blocking I/O call.
    # The first argument is the sync function, followed by its arguments.
    return await run_in_threadpool(_fetch_prices_sync, symbols)