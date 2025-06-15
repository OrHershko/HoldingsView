from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Date
from sqlalchemy.orm import relationship

from api.db.base_class import Base

class Holding(Base):
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False) # e.g., 'AAPL'
    quantity = Column(Float, nullable=False)
    purchase_price = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    
    portfolio_id = Column(Integer, ForeignKey("portfolio.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="holdings")