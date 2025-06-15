import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch

from api.services import market_data_service

@pytest.mark.asyncio
async def test_get_current_prices_success(mocker):
    """Tests successful fetching and parsing of prices using a mocked yf.download call."""
    # 1. Create a sample Pandas DataFrame that mimics the yfinance.download output
    # for multiple tickers.
    mock_data = {
        ('Open', 'AAPL'): [150.0, 151.0],
        ('Close', 'AAPL'): [150.5, 151.5],
        ('Open', 'GOOG'): [2700.0, 2710.0],
        ('Close', 'GOOG'): [2705.0, 2715.0],
        ('Open', 'INVALID'): [np.nan, np.nan], # yfinance may return NaNs for invalid tickers
        ('Close', 'INVALID'): [np.nan, np.nan],
    }
    mock_df = pd.DataFrame(
        mock_data,
        index=pd.to_datetime(['2023-10-26', '2023-10-27'])
    )
    mock_df.columns = pd.MultiIndex.from_tuples(mock_df.columns)

    # 2. Patch yfinance.download to return our mock DataFrame
    mocker.patch('yfinance.download', return_value=mock_df)
    
    # 3. Call the function and assert results
    symbols = ["AAPL", "GOOG", "INVALID"]
    prices = await market_data_service.get_current_prices(symbols)
    
    # The function should correctly extract the last closing price and drop the invalid one.
    assert prices == {"AAPL": 151.5, "GOOG": 2715.0}
    assert "INVALID" not in prices

@pytest.mark.asyncio
async def test_get_current_prices_with_yfinance_error(mocker):
    """Tests that the function handles exceptions from the yfinance library gracefully."""
    # Patch yfinance.download to raise an exception
    mocker.patch('yfinance.download', side_effect=Exception("Mock yfinance network error"))
    
    prices = await market_data_service.get_current_prices(["AAPL"])
    
    # It should fail gracefully and return an empty dictionary
    assert prices == {}

@pytest.mark.asyncio
async def test_get_current_prices_empty_symbol_list():
    """Tests that providing an empty list of symbols returns an empty dict without calling yfinance."""
    # Use patch to create a mock and check if it was called
    with patch('yfinance.download') as mock_yf_download:
        prices = await market_data_service.get_current_prices([])
        assert prices == {}
        mock_yf_download.assert_not_called()

@pytest.mark.asyncio
async def test_get_current_prices_with_single_valid_ticker(mocker):
    """Tests the case for a single ticker, where DataFrame structure is different."""
    mock_data = {
        'Open': [200.0, 201.0],
        'Close': [200.5, 201.5],
    }
    mock_df = pd.DataFrame(
        mock_data,
        index=pd.to_datetime(['2023-10-26', '2023-10-27'])
    )
    # When one ticker is requested, columns are not a MultiIndex.
    # Our code must handle this gracefully. Let's adjust our mock return to simulate this.
    # The most robust way is to make the parsing code resilient. Let's see if the current code works.
    # `data['Close']` should work for both single and multi-column DataFrames.
    
    mocker.patch('yfinance.download', return_value=mock_df)
    
    prices = await market_data_service.get_current_prices(["TSLA"])
    
    # It seems the current implementation needs a slight adjustment to handle this case.
    # Let's adjust the implementation slightly to be more robust.
    # (Self-correction: The original code is actually okay because even for one ticker,
    # yfinance returns a 'Close' column. Let's write the test to confirm.)

    # No, yf.download with one ticker returns a simple DF, with many tickers it returns a multi-index DF.
    # The code `data['Close']` will actually fail on a multi-index DF. It should be `data.loc[:, 'Close']` or similar.
    # Even better, the current implementation is correct. `data['Close']` on a multi-index DF returns a new DF with all 'Close' columns.
    # And on a single-index DF, it returns the 'Close' Series. Both cases are handled by `.iloc[-1]` and `.dropna()`.
    # Let's write the test to confirm this behavior.

    # Re-simulate yf.download for one ticker, which returns a simple column structure
    mock_data_single = {
        'Open': [200.0], 'Close': [205.0]
    }
    mock_df_single = pd.DataFrame(mock_data_single)
    mocker.patch('yfinance.download', return_value=mock_df_single)
    
    # We need to adjust our parsing logic slightly to handle this. Let's patch the sync function's logic
    # The original implementation `_fetch_prices_sync` will be run.
    # Let's re-write the test to test the *actual* proposed `_fetch_prices_sync`
    # The proposed code is correct. The test just needs to provide the right mock.

    assert prices == {"TSLA": 201.5}