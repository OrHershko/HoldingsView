from datetime import date
from sqlalchemy import Column, Integer, Date, Float, ForeignKey
from sqlalchemy.orm import relationship

from api.db.base_class import Base

class PortfolioSnapshot(Base):
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    
    # The calculated values at the end of the day for the given date
    total_market_value = Column(Float, nullable=False)
    total_cost_basis = Column(Float, nullable=False)
    
    portfolio_id = Column(Integer, ForeignKey("portfolio.id"), nullable=False)
    
    # Establish the relationship to the Portfolio model
    portfolio = relationship("Portfolio", back_populates="snapshots")