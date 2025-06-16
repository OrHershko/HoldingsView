from pydantic import BaseModel, Field
from datetime import date
from typing import List

class SnapshotPoint(BaseModel):
    date: date
    total_market_value: float
    total_cost_basis: float

    class Config:
        from_attributes = True

class PortfolioPerformanceData(BaseModel):
    portfolio_id: int
    performance_history: List[SnapshotPoint] = []