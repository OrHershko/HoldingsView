from pydantic import BaseModel, Field
from typing import Literal, Optional

class AnalysisResult(BaseModel):
    """
    Schema for returning the result of a high-level AI analysis.
    """
    content: str = Field(..., description="The textual analysis of the portfolio or stock provided by the AI model.")


class TradingStrategy(BaseModel):
    """
    Schema for a structured, AI-generated trading strategy.
    """
    strategy_type: Literal["bullish", "bearish", "neutral-range"] = Field(..., description="The overall strategic bias.")
    confidence: Literal["high", "medium", "low"] = Field(..., description="The AI's confidence level in this strategy.")
    entry_price_suggestion: Optional[float] = Field(None, description="Suggested price for trade entry.")
    stop_loss_suggestion: Optional[float] = Field(None, description="Suggested price to place a stop-loss order.")
    take_profit_suggestion: Optional[float] = Field(None, description="Suggested price target to take profit.")
    rationale: str = Field(..., description="A detailed explanation of the strategy, citing technicals and news.")