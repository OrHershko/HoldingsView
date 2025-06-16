import pytest
from unittest.mock import AsyncMock
from datetime import datetime
import httpx

from api.schemas.holding import CalculatedHolding
from api.schemas.market_data import (
    EnrichedMarketData,
    TechnicalIndicators,
    Fundamentals,
    NewsArticle,
    TradingInfo,
)
from api.services.ai_analyzer import (
    analyze_portfolio,
    format_holdings_for_prompt,
    format_stock_data_for_prompt,
    analyze_stock_deep_dive,
)
from api.core.config import settings


@pytest.fixture
def sample_calculated_holdings() -> list[CalculatedHolding]:
    """Provides a sample list of CalculatedHolding objects for testing."""
    return [
        CalculatedHolding(
            symbol="AAPL",
            quantity=10,
            average_cost_basis=150.0,
            total_cost_basis=1500.0,
        ),
        CalculatedHolding(
            symbol="TSLA",
            quantity=5,
            average_cost_basis=200.0,
            total_cost_basis=1000.0,
        ),
    ]


@pytest.fixture
def sample_enriched_data() -> EnrichedMarketData:
    """Provides a sample EnrichedMarketData object for testing."""
    return EnrichedMarketData(
        symbol="MSFT",
        short_name="Microsoft Corp.",
        current_price=300.00,
        historical_prices=[],
        technicals=TechnicalIndicators(
            sma_50=290.0, sma_200=270.0, rsi_14=65.0, macd_histogram=1.5
        ),
        fundamentals=Fundamentals(
            market_cap=2_200_000_000_000,
            pe_ratio=35.0,
            forward_pe_ratio=30.0,
            price_to_book_ratio=11.5,
            analyst_recommendation="buy",
            analyst_target_price=350.0,
            earnings_date=datetime(2025, 7, 25),
            sector="Technology",
            industry="Software - Infrastructure",
            description="A big tech company.",
        ),
        trading_info=TradingInfo(
            market_state="REGULAR",
            regular_market_change_percent=0.015
        ),
        news=[
            NewsArticle(
                title="MSFT launches new AI product",
                publisher="Tech News",
                link="",
                provider_publish_time=datetime.now(),
            )
        ],
    )


def test_format_holdings_for_prompt(
    sample_calculated_holdings: list[CalculatedHolding],
):
    """Tests that the holdings are formatted correctly into a string."""
    formatted_string = format_holdings_for_prompt(sample_calculated_holdings)
    assert "10.0000 shares of AAPL" in formatted_string
    assert "average cost basis of $150.00" in formatted_string
    assert "5.0000 shares of TSLA" in formatted_string
    assert "average cost basis of $200.00" in formatted_string


@pytest.mark.asyncio
async def test_analyze_portfolio_success(
    mocker, sample_calculated_holdings: list[CalculatedHolding]
):
    """Tests a successful analysis call, mocking the external API."""
    mock_response_content = "This is a successful AI analysis."
    mock_response_json = {"choices": [{"message": {"content": mock_response_content}}]}

    # Create a mock response object that can be awaited for its .json() method
    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value=mock_response_json)
    mock_response.raise_for_status = AsyncMock()

    # Patch the post method to return our mock response
    mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await analyze_portfolio(sample_calculated_holdings)

    assert result == mock_response_content


@pytest.mark.asyncio
async def test_analyze_portfolio_api_error(
    mocker, sample_calculated_holdings: list[CalculatedHolding]
):
    """Tests handling of an API request error."""
    mocker.patch(
        "httpx.AsyncClient.post",
        side_effect=httpx.RequestError("Mocked request error", request=None),
    )

    result = await analyze_portfolio(sample_calculated_holdings)
    assert "An error occurred while contacting the AI service" in result


@pytest.mark.asyncio
async def test_analyze_portfolio_no_api_key(
    mocker, sample_calculated_holdings: list[CalculatedHolding]
):
    """Tests that the function returns a config error if the API key is missing."""
    mocker.patch.object(settings, "OPENROUTER_API_KEY", None)

    result = await analyze_portfolio(sample_calculated_holdings)
    assert "AI analysis is not configured" in result


@pytest.mark.asyncio
async def test_analyze_portfolio_malformed_response(
    mocker, sample_calculated_holdings: list[CalculatedHolding]
):
    """Tests handling of a response with unexpected structure."""
    malformed_json = {"unexpected_key": "some_value"}  # Missing 'choices'

    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value=malformed_json)
    mock_response.raise_for_status = AsyncMock()

    mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await analyze_portfolio(sample_calculated_holdings)
    assert "Received an unexpected response from the AI service" in result


def test_format_stock_data_for_prompt(sample_enriched_data: EnrichedMarketData):
    """Tests that the stock data is formatted correctly into a prompt string."""
    formatted_string = format_stock_data_for_prompt(sample_enriched_data)

    assert "Company: Microsoft Corp. (MSFT)" in formatted_string
    assert "Current Price: $300.00" in formatted_string
    assert "Market is REGULAR. Today's Change: +1.50%" in formatted_string
    assert "--- Financials & Outlook ---" in formatted_string
    assert "Next Earnings: 2025-07-25" in formatted_string
    assert "--- Valuation ---" in formatted_string
    assert "Forward P/E Ratio: 30.00" in formatted_string
    assert "--- Analyst Ratings ---" in formatted_string
    assert "Consensus: BUY" in formatted_string
    assert "Target Price: $350.00" in formatted_string
    assert "--- Technicals ---" in formatted_string
    assert "50-Day vs 200-Day SMA: Uptrend" in formatted_string
    assert "--- News ---" in formatted_string
    assert "MSFT launches new AI product (Tech News)" in formatted_string


@pytest.mark.asyncio
async def test_analyze_stock_deep_dive_success(
    mocker, sample_enriched_data: EnrichedMarketData
):
    """Tests a successful deep-dive analysis call, mocking the external API."""
    mock_response_content = "This is a successful deep-dive analysis."
    mock_response_json = {"choices": [{"message": {"content": mock_response_content}}]}

    mock_response = AsyncMock()
    mock_response.json = AsyncMock(return_value=mock_response_json)
    mock_response.raise_for_status = AsyncMock()

    mock_post = mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await analyze_stock_deep_dive(sample_enriched_data)

    assert result == mock_response_content

    # Check that the correct model was requested
    called_json = mock_post.call_args.kwargs["json"]
    assert called_json["model"] == "deepseek/deepseek-r1-0528:free"