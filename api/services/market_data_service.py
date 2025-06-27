from typing import List, Dict

import yfinance as yf
import pandas as pd
from fastapi.concurrency import run_in_threadpool
import logging

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

class MarketDataService:
    def get_ticker(self, symbol: str):
        """
        Get a yfinance Ticker object for the given symbol.
        """
        return yf.Ticker(symbol)

    def get_option_expiration_dates(self, symbol: str) -> list[str]:
        """
        Get available option expiration dates for a symbol.
        """
        try:
            ticker = self.get_ticker(symbol)
            if not ticker:
                raise ValueError(f"No ticker found for symbol: {symbol}")

            expirations = ticker.options
            return expirations
        except Exception as e:
            logging.error(f"Error fetching option expiration dates for {symbol} from yfinance: {e}")
            return []

    def get_option_chain(self, symbol: str, expiration_date: str) -> dict | None:
        """
        Get the option chain for a symbol and expiration date.
        """
        try:
            ticker = self.get_ticker(symbol)
            if not ticker:
                raise ValueError(f"No ticker found for symbol: {symbol}")

            chain = ticker.option_chain(expiration_date)
            if not chain:
                raise ValueError(f"No chain found for symbol: {symbol} on {expiration_date}")
            
            # Define the fields we want to keep that match our OptionContract schema
            contract_fields = [
                'contractSymbol', 'strike', 'lastPrice', 'bid', 'ask', 
                'change', 'percentChange', 'volume', 'openInterest', 
                'impliedVolatility', 'inTheMoney'
            ]
            
            def clean_contracts(df):
                """Clean and filter contract data to match our schema."""
                if df.empty:
                    return []
                
                # Convert to dict and filter fields
                contracts = df.to_dict(orient="records")
                cleaned_contracts = []
                
                for contract in contracts:
                    cleaned_contract = {}
                    for field in contract_fields:
                        value = contract.get(field)
                        # Handle NaN values and ensure proper types
                        if pd.isna(value):
                            if field in ['volume', 'openInterest']:
                                cleaned_contract[field] = None
                            elif field in ['change', 'percentChange', 'lastPrice', 'bid', 'ask', 'strike', 'impliedVolatility']:
                                cleaned_contract[field] = 0.0
                            elif field == 'inTheMoney':
                                cleaned_contract[field] = False
                            elif field == 'contractSymbol':
                                cleaned_contract[field] = ""
                            else:
                                cleaned_contract[field] = None
                        else:
                            # Ensure numeric fields are properly converted
                            if field in ['strike', 'lastPrice', 'bid', 'ask', 'change', 'percentChange', 'impliedVolatility']:
                                try:
                                    cleaned_contract[field] = float(value)
                                except (ValueError, TypeError):
                                    cleaned_contract[field] = 0.0
                            elif field in ['volume', 'openInterest']:
                                try:
                                    cleaned_contract[field] = int(value) if value != 0 else None
                                except (ValueError, TypeError):
                                    cleaned_contract[field] = None
                            elif field == 'inTheMoney':
                                cleaned_contract[field] = bool(value)
                            else:
                                cleaned_contract[field] = str(value) if value is not None else ""
                
                    cleaned_contracts.append(cleaned_contract)
                
                return cleaned_contracts
            
            # Convert DataFrames to cleaned dicts for JSON serialization
            return {
                "calls": clean_contracts(chain.calls),
                "puts": clean_contracts(chain.puts),
            }
        except Exception as e:
            logging.error(f"Error fetching option chain for {symbol} on {expiration_date} from yfinance: {e}")
            return None

    def get_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
        """
        Get historical market data for a symbol.
        """
        try:
            ticker = yf.Ticker(symbol)
            return ticker.history(period=period, interval=interval)
        except Exception as e:
            logging.error(f"Error fetching historical data for {symbol} from yfinance: {e}")
            return pd.DataFrame()


def get_market_data_service() -> MarketDataService:
    """
    Dependency provider for MarketDataService.
    """
    return MarketDataService()