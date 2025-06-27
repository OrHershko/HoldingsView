import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Date, Enum, Boolean
from sqlalchemy.orm import relationship

from api.db.base_class import Base

class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class Transaction(Base):
    id = Column(Integer, primary_key=True, index=True)
    # Increased length to 21 for OCC option symbols
    symbol = Column(String(21), index=True, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False) # Price per share at the time of transaction
    transaction_date = Column(Date, nullable=False)
    
    portfolio_id = Column(Integer, ForeignKey("portfolio.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add the missing relationship
    portfolio = relationship("Portfolio", back_populates="transactions")

    # --- Option-specific fields ---
    is_option = Column(Boolean, default=False)
    option_type = Column(String(4), nullable=True)  # 'CALL' or 'PUT'
    strike_price = Column(Float, nullable=True)
    expiration_date = Column(Date, nullable=True)
    # Increased length to 21 for OCC option symbols
    underlying_symbol = Column(String(21), nullable=True)  # Underlying asset symbol