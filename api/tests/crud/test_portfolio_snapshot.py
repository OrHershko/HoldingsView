from datetime import date, timedelta
from sqlalchemy.orm import Session

from api.crud import crud_portfolio_snapshot
from api.models.portfolio_snapshot import PortfolioSnapshot
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio

def test_create_and_get_snapshot(db: Session) -> None:
    """
    Test creating a new snapshot and retrieving it.
    """
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    
    snapshot_date = date.today()
    snapshot_in = PortfolioSnapshot(
        date=snapshot_date,
        total_market_value=12000.50,
        total_cost_basis=10000.00,
        portfolio_id=portfolio.id,
    )
    
    db.add(snapshot_in)
    db.commit()
    db.refresh(snapshot_in)
    
    # Use the CRUD function to get the data
    retrieved_snapshots = crud_portfolio_snapshot.get_snapshots_by_portfolio(
        db=db, portfolio_id=portfolio.id, start_date=snapshot_date, end_date=snapshot_date
    )
    
    assert len(retrieved_snapshots) == 1
    snapshot_out = retrieved_snapshots[0]
    assert snapshot_out.id == snapshot_in.id
    assert snapshot_out.portfolio_id == portfolio.id
    assert snapshot_out.total_market_value == 12000.50

def test_get_snapshots_by_portfolio_with_date_range(db: Session) -> None:
    """
    Test retrieving snapshots within a specific date range.
    """
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    
    # Create snapshots for different dates
    today = date.today()
    yesterday = today - timedelta(days=1)
    last_month = today - timedelta(days=30)
    
    db.add_all([
        PortfolioSnapshot(date=today, total_market_value=1, total_cost_basis=1, portfolio_id=portfolio.id),
        PortfolioSnapshot(date=yesterday, total_market_value=2, total_cost_basis=1, portfolio_id=portfolio.id),
        PortfolioSnapshot(date=last_month, total_market_value=3, total_cost_basis=1, portfolio_id=portfolio.id),
    ])
    db.commit()
    
    # Retrieve snapshots for the last 2 days
    two_day_snapshots = crud_portfolio_snapshot.get_snapshots_by_portfolio(
        db=db, portfolio_id=portfolio.id, start_date=yesterday, end_date=today
    )
    
    assert len(two_day_snapshots) == 2
    
    # Retrieve all snapshots
    all_snapshots = crud_portfolio_snapshot.get_snapshots_by_portfolio(
        db=db, portfolio_id=portfolio.id, start_date=date.min, end_date=date.max
    )
    assert len(all_snapshots) == 3