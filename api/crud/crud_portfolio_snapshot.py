from typing import List
from datetime import date
from sqlalchemy.orm import Session
from api.models.portfolio_snapshot import PortfolioSnapshot

def get_snapshots_by_portfolio(
    db: Session, *, portfolio_id: int, start_date: date, end_date: date
) -> List[PortfolioSnapshot]:
    """
    Get all snapshots for a portfolio within a date range.
    """
    return (
        db.query(PortfolioSnapshot)
        .filter(
            PortfolioSnapshot.portfolio_id == portfolio_id,
            PortfolioSnapshot.date >= start_date,
            PortfolioSnapshot.date <= end_date,
        )
        .order_by(PortfolioSnapshot.date.asc())
        .all()
    )