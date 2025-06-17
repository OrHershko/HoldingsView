from typing import Optional
from pydantic import BaseModel, Field

class CalculatedHolding(BaseModel):
    """
    Represents the calculated state of a holding based on all its transactions.
    This is not a database model.
    """
    symbol: str = Field(..., description="Stock ticker symbol")
    quantity: float = Field(..., description="Total number of shares currently held")
    average_cost_basis: float = Field(..., description="The average price paid per share for the current holding")
    total_cost_basis: float = Field(..., description="Total cost of the current holding (quantity * average_cost_basis)")

    # Fields populated from market data service
    current_price: Optional[float] = Field(None, description="Current market price per share")
    market_value: Optional[float] = Field(None, description="Total current market value of the holding (quantity * current_price)")
    unrealized_gain_loss: Optional[float] = Field(None, description="Total unrealized profit or loss")
    unrealized_gain_loss_percent: Optional[float] = Field(None, description="Total unrealized profit or loss in percentage terms")
    todays_change: Optional[float] = Field(None, description="Today's absolute change in price")
    todays_change_percent: Optional[float] = Field(None, description="Today's percentage change in price")

    class Config:
        from_attributes = True