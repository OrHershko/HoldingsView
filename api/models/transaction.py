import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Date, Enum
from sqlalchemy.orm import relationship

from api.db.base_class import Base

class TransactionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class Transaction(Base):
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), index=True, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False) # Price per share at the time of transaction
    transaction_date = Column(Date, nullable=False)
    
    portfolio_id = Column(Integer, ForeignKey("portfolio.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add the missing relationship
    portfolio = relationship("Portfolio", back_populates="transactions")