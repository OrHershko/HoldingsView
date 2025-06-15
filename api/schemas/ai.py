from pydantic import BaseModel, Field

class AnalysisResult(BaseModel):
    """
    Schema for returning the result of an AI analysis.
    """
    content: str = Field(..., description="The textual analysis of the portfolio provided by the AI model.")