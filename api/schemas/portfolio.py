from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

from .holding import HoldingRead

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

# Properties to return to client with holdings
class PortfolioReadWithHoldings(PortfolioRead):
    holdings: List[HoldingRead] = []