import pytest
from fastapi.testclient import TestClient

from api.core.config import settings
from api.models.user import User
from api.schemas.market_data import EnrichedMarketData, TechnicalIndicators, Fundamentals


@pytest.fixture
def mock_enriched_market_data():
    """Provides a mock EnrichedMarketData object for testing."""
    return EnrichedMarketData(
        symbol="MOCK",
        current_price=123.45,
        technicals=TechnicalIndicators(),
        fundamentals=Fundamentals(description="A mock company."),
        news=[],
    )


@pytest.mark.asyncio
async def test_analyze_stock_dispatches_task(
    authenticated_client: tuple[TestClient, User], mocker, mock_enriched_market_data
):
    """
    Test that the deep-dive analysis endpoint dispatches a Celery task.
    """
    client, _ = authenticated_client

    mocker.patch(
        "api.services.market_data_aggregator.get_enriched_market_data",
        return_value=mock_enriched_market_data,
    )
    # Mock the .delay() method of the task
    mock_task = mocker.patch("api.tasks.run_deep_dive_analysis_task.delay")
    mock_task.return_value.id = "test-task-id-analyze"

    response = client.post(f"{settings.API_V1_STR}/market-data/MOCK/analyze")

    assert response.status_code == 202
    data = response.json()
    assert data["task_id"] == "test-task-id-analyze"
    assert data["status"] == "PENDING"
    # Verify delay was called with the serialized data
    mock_task.assert_called_once_with(mock_enriched_market_data.model_dump(mode="json"))


@pytest.mark.asyncio
async def test_get_trading_strategy_dispatches_task(
    authenticated_client: tuple[TestClient, User],
    mocker,
    mock_enriched_market_data,
):
    """
    Test that the trading strategy endpoint dispatches a Celery task.
    """
    client, _ = authenticated_client

    mocker.patch(
        "api.services.market_data_aggregator.get_enriched_market_data",
        return_value=mock_enriched_market_data,
    )
    mock_task = mocker.patch("api.tasks.run_trading_strategy_task.delay")
    mock_task.return_value.id = "test-task-id-strategize"

    response = client.post(f"{settings.API_V1_STR}/market-data/MOCK/strategize")

    assert response.status_code == 202
    data = response.json()
    assert data["task_id"] == "test-task-id-strategize"
    assert data["status"] == "PENDING"
    mock_task.assert_called_once_with(mock_enriched_market_data.model_dump(mode="json"))