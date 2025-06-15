import pytest
from unittest.mock import AsyncMock

import httpx

from api.schemas.holding import CalculatedHolding
from api.services.ai_analyzer import analyze_portfolio, format_holdings_for_prompt
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