from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Literal

# This corresponds to the ENUM in the model
TransactionType = Literal["BUY", "SELL"]

# Shared properties
class TransactionBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol, e.g., AAPL")
    transaction_type: TransactionType
    quantity: float = Field(..., gt=0, description="Number of shares transacted")
    price: float = Field(..., gt=0, description="Price per share for the transaction")
    transaction_date: date

# Properties to receive on creation
class TransactionCreate(TransactionBase):
    pass

# Properties to return to client
class TransactionRead(TransactionBase):
    id: int
    portfolio_id: int
    created_at: datetime

    class Config:
        from_attributes = True