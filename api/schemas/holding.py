from typing import Optional
from datetime import date
from pydantic import BaseModel, Field

class CalculatedHolding(BaseModel):
    """
    Represents the calculated state of a holding based on all its transactions.
    This can be either a stock holding or an options holding.
    This is not a database model.
    """
    symbol: str = Field(..., description="Stock ticker symbol or underlying symbol for options")
    quantity: float = Field(..., description="Total number of shares or contracts currently held")
    average_cost_basis: float = Field(..., description="The average price paid per share/contract for the current holding")
    total_cost_basis: float = Field(..., description="Total cost of the current holding (quantity * average_cost_basis)")

    # Options-specific fields
    is_option: bool = Field(default=False, description="Whether this holding is an options position")
    option_type: Optional[str] = Field(None, description="CALL or PUT for options positions")
    strike_price: Optional[float] = Field(None, description="Strike price for options positions")
    expiration_date: Optional[date] = Field(None, description="Expiration date for options positions")
    underlying_symbol: Optional[str] = Field(None, description="Underlying stock symbol for options positions")
    
    # Fields populated from market data service
    current_price: Optional[float] = Field(None, description="Current market price per share/contract")
    market_value: Optional[float] = Field(None, description="Total current market value of the holding (quantity * current_price)")
    unrealized_gain_loss: Optional[float] = Field(None, description="Total unrealized profit or loss")
    unrealized_gain_loss_percent: Optional[float] = Field(None, description="Total unrealized profit or loss in percentage terms")
    todays_change: Optional[float] = Field(None, description="Today's absolute change in price")
    todays_change_percent: Optional[float] = Field(None, description="Today's percentage change in price")

    class Config:
        from_attributes = True