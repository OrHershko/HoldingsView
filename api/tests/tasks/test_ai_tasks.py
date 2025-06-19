import pytest

from api.schemas.market_data import EnrichedMarketData, Fundamentals, TechnicalIndicators
from api.schemas.ai import TradingStrategy
from api.tasks import run_deep_dive_analysis_task, run_trading_strategy_task

@pytest.fixture
def mock_enriched_data_dict() -> dict:
    """Provides a mock EnrichedMarketData object as a dictionary for task testing."""
    return EnrichedMarketData(
        symbol="MOCK",
        current_price=123.45,
        technicals=TechnicalIndicators(),
        fundamentals=Fundamentals(description="A mock company."),
        news=[],
    ).model_dump(mode="json")

def test_run_deep_dive_analysis_task_success(mocker, mock_enriched_data_dict):
    """
    Test the logic of the deep-dive analysis task for a successful case.
    """
    mock_content = "This is a mock deep-dive analysis."
    mocker.patch(
        "api.services.ai_analyzer.analyze_stock_deep_dive",
        return_value=mock_content,
    )

    # Run the task logic directly, not via .delay()
    result = run_deep_dive_analysis_task(mock_enriched_data_dict)

    assert result is not None
    assert "error" not in result
    assert result["content"] == mock_content

def test_run_trading_strategy_task_success(mocker, mock_enriched_data_dict):
    """
    Test the logic of the trading strategy task for a successful case.
    """
    mock_strategy = TradingStrategy(
        strategy_type="bullish",
        confidence="high",
        rationale="Mock rationale",
    )
    mocker.patch(
        "api.services.ai_analyzer.generate_trading_strategy",
        return_value=mock_strategy,
    )

    # Run the task logic directly
    result = run_trading_strategy_task(mock_enriched_data_dict)
    
    assert result is not None
    assert "error" not in result
    assert result["strategy_type"] == "bullish"
    assert result["confidence"] == "high"

def test_run_deep_dive_analysis_task_failure(mocker, mock_enriched_data_dict):
    """
    Test the deep-dive task's error handling.
    """
    mocker.patch(
        "api.services.ai_analyzer.analyze_stock_deep_dive",
        side_effect=Exception("AI service failed"),
    )
    
    result = run_deep_dive_analysis_task(mock_enriched_data_dict)
    
    assert "error" in result
    assert "AI service failed" in result["error"]