import pytest
import pandas as pd
import numpy as np
import json
from unittest.mock import patch, MagicMock

from api.services import market_data_service
from api.services.market_data_service import MarketDataService


@pytest.mark.asyncio
async def test_get_current_prices_success(mocker):
    """Tests successful fetching and parsing of prices for multiple tickers."""
    # 1. Mock yfinance.download output for multiple tickers
    mock_data = {
        ("Close", "AAPL"): [150.5, 151.5],
        ("Close", "GOOG"): [2705.0, 2715.0],
        ("Close", "INVALID"): [np.nan, np.nan],
    }
    mock_df = pd.DataFrame(
        mock_data, index=pd.to_datetime(["2023-10-26", "2023-10-27"])
    )
    mock_df.columns = pd.MultiIndex.from_tuples(mock_df.columns)
    mocker.patch("yfinance.download", return_value=mock_df)

    # 2. Call the function
    symbols = ["AAPL", "GOOG", "INVALID"]
    prices = await market_data_service.get_current_prices(symbols)

    # 3. Assert the new, correct data structure
    assert "INVALID" not in prices
    assert prices["AAPL"]["price"] == 151.5
    assert prices["AAPL"]["change"] == pytest.approx(1.0)  # 151.5 - 150.5
    assert prices["AAPL"]["change_percent"] == pytest.approx(
        (1.0 / 150.5) * 100
    )

    assert prices["GOOG"]["price"] == 2715.0
    assert prices["GOOG"]["change"] == pytest.approx(10.0)  # 2715.0 - 2705.0
    assert prices["GOOG"]["change_percent"] == pytest.approx(
        (10.0 / 2705.0) * 100
    )


@pytest.mark.asyncio
async def test_get_current_prices_with_yfinance_error(mocker):
    """Tests that the function handles exceptions from yfinance gracefully."""
    mocker.patch("yfinance.download", side_effect=Exception("Mock yfinance error"))
    prices = await market_data_service.get_current_prices(["AAPL"])
    assert prices == {}


@pytest.mark.asyncio
async def test_get_current_prices_empty_symbol_list():
    """Tests that an empty list returns an empty dict without calling yfinance."""
    with patch("yfinance.download") as mock_yf_download:
        prices = await market_data_service.get_current_prices([])
        assert prices == {}
        mock_yf_download.assert_not_called()


@pytest.mark.asyncio
async def test_get_current_prices_with_single_valid_ticker(mocker):
    """Tests the case for a single ticker, where DataFrame structure is simpler."""
    # 1. Mock yfinance.download output for a single ticker
    mock_data = {"Close": [200.5, 201.5]}
    mock_df = pd.DataFrame(
        mock_data, index=pd.to_datetime(["2023-10-26", "2023-10-27"])
    )
    mocker.patch("yfinance.download", return_value=mock_df)

    # 2. Call the function
    prices = await market_data_service.get_current_prices(["TSLA"])

    # 3. Assert the new, correct data structure
    assert "TSLA" in prices
    assert prices["TSLA"]["price"] == 201.5
    assert prices["TSLA"]["change"] == pytest.approx(1.0)  # 201.5 - 200.5
    assert prices["TSLA"]["change_percent"] == pytest.approx(
        (1.0 / 200.5) * 100
    )


@pytest.mark.asyncio
async def test_get_current_prices_insufficient_data(mocker):
    """Tests the case where yfinance returns less than 2 days of data."""
    mock_data = {"Close": [205.0]}
    mock_df = pd.DataFrame(mock_data, index=pd.to_datetime(["2023-10-27"]))
    mocker.patch("yfinance.download", return_value=mock_df)

    prices = await market_data_service.get_current_prices(["MSFT"])
    assert prices == {}


def test_get_option_chain_with_nan_values(mocker):
    """Tests that option chain data with NaN values is properly cleaned for JSON serialization."""
    # Create mock option chain data with NaN values
    mock_calls_data = {
        'contractSymbol': ['AAPL250103C00150000', 'AAPL250103C00155000'],
        'strike': [150.0, 155.0],
        'lastPrice': [10.5, np.nan],  # One valid, one NaN
        'bid': [9.8, 4.2],
        'ask': [10.2, np.nan],  # One valid, one NaN
        'change': [1.5, np.nan],
        'percentChange': [15.0, np.nan],
        'volume': [100, np.nan],  # Should become None
        'openInterest': [50, 25],
        'impliedVolatility': [0.25, np.nan],
        'inTheMoney': [True, False]
    }
    
    mock_puts_data = {
        'contractSymbol': ['AAPL250103P00145000'],
        'strike': [145.0],
        'lastPrice': [np.nan],  # NaN value
        'bid': [5.8],
        'ask': [6.2],
        'change': [np.nan],
        'percentChange': [np.nan],
        'volume': [75],
        'openInterest': [np.nan],  # Should become None
        'impliedVolatility': [np.nan],
        'inTheMoney': [False]
    }
    
    mock_calls_df = pd.DataFrame(mock_calls_data)
    mock_puts_df = pd.DataFrame(mock_puts_data)
    
    # Create mock option chain object
    mock_chain = MagicMock()
    mock_chain.calls = mock_calls_df
    mock_chain.puts = mock_puts_df
    
    # Mock the ticker and its option_chain method
    mock_ticker = MagicMock()
    mock_ticker.option_chain.return_value = mock_chain
    
    # Patch the get_ticker method
    service = MarketDataService()
    mocker.patch.object(service, 'get_ticker', return_value=mock_ticker)
    
    # Call the method
    result = service.get_option_chain('AAPL', '2025-01-03')
    
    # Verify we got a result
    assert result is not None
    assert 'calls' in result
    assert 'puts' in result
    
    # Test JSON serialization (this would fail before the fix)
    json_str = json.dumps(result)
    assert json_str is not None
    
    # Verify specific data cleaning
    calls = result['calls']
    puts = result['puts']
    
    # Check that NaN values were properly handled
    assert len(calls) == 2
    assert calls[0]['lastPrice'] == 10.5  # Valid value preserved
    assert calls[1]['lastPrice'] == 0.0   # NaN converted to 0.0
    assert calls[1]['ask'] == 0.0         # NaN converted to 0.0
    assert calls[1]['volume'] is None     # NaN volume becomes None
    
    assert len(puts) == 1
    assert puts[0]['lastPrice'] == 0.0    # NaN converted to 0.0
    assert puts[0]['openInterest'] is None # NaN openInterest becomes None
    assert puts[0]['impliedVolatility'] == 0.0  # NaN converted to 0.0


def test_get_option_chain_empty_data(mocker):
    """Tests that option chain handles empty DataFrames correctly."""
    # Create empty DataFrames
    mock_calls_df = pd.DataFrame()
    mock_puts_df = pd.DataFrame()
    
    # Create mock option chain object
    mock_chain = MagicMock()
    mock_chain.calls = mock_calls_df
    mock_chain.puts = mock_puts_df
    
    # Mock the ticker and its option_chain method
    mock_ticker = MagicMock()
    mock_ticker.option_chain.return_value = mock_chain
    
    # Patch the get_ticker method
    service = MarketDataService()
    mocker.patch.object(service, 'get_ticker', return_value=mock_ticker)
    
    # Call the method
    result = service.get_option_chain('AAPL', '2025-01-03')
    
    # Verify we got a result with empty lists
    assert result is not None
    assert result['calls'] == []
    assert result['puts'] == []
    
    # Test JSON serialization
    json_str = json.dumps(result)
    assert json_str is not None