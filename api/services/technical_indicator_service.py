import pandas as pd
import pandas_ta as ta

from api.schemas.market_data import TechnicalIndicators

def calculate_indicators(df: pd.DataFrame) -> TechnicalIndicators:
    """
    Calculates a set of technical indicators from a DataFrame of OHLCV data.
    
    Args:
        df: A pandas DataFrame with 'Open', 'High', 'Low', 'Close', 'Volume' columns.
        
    Returns:
        A Pydantic model containing the latest values for the calculated indicators.
    """
    if df.empty:
        return TechnicalIndicators()

    # Calculate indicators using pandas_ta. It appends columns to the DataFrame.
    try:
        df.ta.sma(length=20, append=True)
        df.ta.sma(length=50, append=True)
        df.ta.sma(length=100, append=True)
        df.ta.sma(length=150, append=True)
        df.ta.sma(length=200, append=True)
        df.ta.rsi(length=14, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
        df.ta.bbands(length=20, std=2, append=True)
    except Exception as e:
        # Log and return empty indicators if pandas_ta fails for any reason
        print(f"Technical indicator calculation failed: {e}")
        return TechnicalIndicators()
    
    # Get the last row of the DataFrame which contains the latest indicator values
    latest_indicators = df.iloc[-1]
    
    # Create the Pydantic model, handling potential NaN values by converting them to None
    return TechnicalIndicators(
        sma_20=latest_indicators.get('SMA_20'),
        sma_50=latest_indicators.get('SMA_50'),
        sma_100=latest_indicators.get('SMA_100'),
        sma_150=latest_indicators.get('SMA_150'),
        sma_200=latest_indicators.get('SMA_200'),
        rsi_14=latest_indicators.get('RSI_14'),
        macd_line=latest_indicators.get('MACD_12_26_9'),
        macd_signal=latest_indicators.get('MACDs_12_26_9'),
        macd_histogram=latest_indicators.get('MACDh_12_26_9'),
        bollinger_upper=latest_indicators.get('BBU_20_2.0'),
        bollinger_middle=latest_indicators.get('BBM_20_2.0'),
        bollinger_lower=latest_indicators.get('BBL_20_2.0'),
    )