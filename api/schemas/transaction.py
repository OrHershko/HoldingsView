from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Literal

# This corresponds to the ENUM in the model
TransactionType = Literal["BUY", "SELL"]

# Shared properties
class TransactionBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=21, description="Stock or option symbol, e.g., AAPL or OCC option symbol")
    transaction_type: TransactionType
    quantity: float = Field(..., gt=0, description="Number of shares transacted")
    price: float = Field(..., gt=0, description="Price per share for the transaction")
    transaction_date: date
    # --- Option-specific fields ---
    is_option: bool = Field(False, description="Is this an options trade?")
    option_type: str | None = Field(None, description="CALL or PUT for options trades")
    strike_price: float | None = Field(None, description="Strike price for options trades")
    expiration_date: date | None = Field(None, description="Expiration date for options trades")
    underlying_symbol: str | None = Field(None, min_length=1, max_length=21, description="Underlying asset symbol for options trades")

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