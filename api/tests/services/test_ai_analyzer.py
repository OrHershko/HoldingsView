import pytest
from datetime import date
from unittest.mock import AsyncMock

import httpx

from api.models.holding import Holding
from api.services.ai_analyzer import analyze_portfolio, format_holdings_for_prompt
from api.core.config import settings

@pytest.fixture
def sample_holdings() -> list[Holding]:
    """Provides a sample list of holding objects for testing."""
    return [
        Holding(symbol="AAPL", quantity=10, purchase_price=150.0, purchase_date=date(2023, 1, 1)),
        Holding(symbol="TSLA", quantity=5, purchase_price=200.0, purchase_date=date(2023, 2, 15)),
    ]

def test_format_holdings_for_prompt(sample_holdings: list[Holding]):
    """Tests that the holdings are formatted correctly into a string."""
    formatted_string = format_holdings_for_prompt(sample_holdings)
    assert "10 shares of AAPL" in formatted_string
    assert "$200.00" in formatted_string
    assert "2023-02-15" in formatted_string

@pytest.mark.asyncio
async def test_analyze_portfolio_success(mocker, sample_holdings: list[Holding]):
    """Tests a successful analysis call, mocking the external API."""
    mock_response_content = "This is a successful AI analysis."
    mock_response_json = {
        "choices": [{"message": {"content": mock_response_content}}]
    }
    
    mock_response = AsyncMock()
    mock_response.raise_for_status = AsyncMock()
    mock_response.json = AsyncMock(return_value=mock_response_json)

    mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await analyze_portfolio(sample_holdings)
    
    assert result == mock_response_content

@pytest.mark.asyncio
async def test_analyze_portfolio_api_error(mocker, sample_holdings: list[Holding]):
    """Tests handling of an API request error."""
    mocker.patch(
        "httpx.AsyncClient.post",
        side_effect=httpx.RequestError("Mocked request error", request=None)
    )
    
    result = await analyze_portfolio(sample_holdings)
    assert "An error occurred while contacting the AI service" in result

@pytest.mark.asyncio
async def test_analyze_portfolio_no_api_key(mocker, sample_holdings: list[Holding]):
    """Tests that the function returns a config error if the API key is missing."""
    mocker.patch.object(settings, 'OPENROUTER_API_KEY', None)

    result = await analyze_portfolio(sample_holdings)
    assert "AI analysis is not configured" in result

@pytest.mark.asyncio
async def test_analyze_portfolio_malformed_response(mocker, sample_holdings: list[Holding]):
    """Tests handling of a response with unexpected structure."""
    malformed_json = {"unexpected_key": "some_value"} # Missing 'choices'
    
    mock_response = AsyncMock()
    mock_response.raise_for_status = AsyncMock()
    mock_response.json = AsyncMock(return_value=malformed_json)

    mocker.patch("httpx.AsyncClient.post", return_value=mock_response)

    result = await analyze_portfolio(sample_holdings)
    assert "Received an unexpected response from the AI service" in result