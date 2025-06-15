from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional

# Shared properties
class HoldingBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol, e.g., AAPL")
    quantity: float = Field(..., gt=0, description="Number of shares")
    purchase_price: float = Field(..., gt=0, description="Price per share at purchase")
    purchase_date: date

# Properties to receive on creation
class HoldingCreate(HoldingBase):
    pass

# Properties to receive on update
class HoldingUpdate(BaseModel):
    symbol: Optional[str] = Field(None, min_length=1, max_length=10)
    quantity: Optional[float] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, gt=0)
    purchase_date: Optional[date] = None

# Properties to return to client
class HoldingRead(HoldingBase):
    id: int
    portfolio_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True