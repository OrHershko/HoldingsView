import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch

from api.services import market_data_service


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