from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

from .holding import CalculatedHolding
from .transaction import TransactionRead

# Shared properties
class PortfolioBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

# Properties to receive on creation
class PortfolioCreate(PortfolioBase):
    pass

# Properties to receive on update
class PortfolioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

# Properties to return to client
class PortfolioRead(PortfolioBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Properties to return to client with holdings and analysis
class PortfolioReadWithHoldings(PortfolioRead):
    holdings: List[CalculatedHolding] = []
    transactions: List[TransactionRead] = []
    
    # Portfolio-level summary
    total_market_value: Optional[float] = Field(None, description="Total market value of all holdings in the portfolio")
    total_cost_basis: Optional[float] = Field(None, description="Total cost basis of the entire portfolio")
    total_unrealized_gain_loss: Optional[float] = Field(None, description="Total unrealized gain or loss for the entire portfolio")
    total_unrealized_gain_loss_percent: Optional[float] = Field(None, description="Total unrealized gain or loss percentage for the entire portfolio")