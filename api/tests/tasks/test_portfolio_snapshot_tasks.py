import pytest
from datetime import date
from sqlalchemy.orm import Session

from api.crud import crud_transaction
from api.models.portfolio_snapshot import PortfolioSnapshot
from api.schemas.transaction import TransactionCreate
from api.tasks import create_portfolio_snapshot, create_snapshots_for_all_portfolios
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio

def test_create_portfolio_snapshot_task_logic(db: Session, mocker) -> None:
    """
    Tests the logic of the `create_portfolio_snapshot` task by checking its side effects.
    The corrected `db` fixture in conftest.py ensures data is visible.
    """
    # 1. Setup
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    crud_transaction.create_with_portfolio(db, obj_in=TransactionCreate(symbol="AAPL", transaction_type="BUY", quantity=10, price=100, transaction_date=date.today()), portfolio_id=portfolio.id)
    db.commit() # Commit data to make it visible to the task's session

    portfolio_id = portfolio.id

    # 2. Mock external dependencies
    mocker.patch("api.services.market_data_service.get_current_prices", return_value={"AAPL": 120.0})
    
    # 3. Execute the task logic directly
    result_message = create_portfolio_snapshot(portfolio_id)
    assert "Successfully created/updated snapshot" in result_message

    # 4. Verify the result
    snapshot = db.query(PortfolioSnapshot).filter_by(portfolio_id=portfolio_id).one()
    
    assert snapshot is not None
    assert snapshot.total_cost_basis == 1000.0
    assert snapshot.total_market_value == 1200.0

def test_master_snapshot_task_dispatches_jobs(db: Session, mocker):
    """
    Tests that the master task correctly finds portfolios and dispatches sub-tasks.
    """
    # 1. Setup
    user = create_random_user(db)
    p1 = create_random_portfolio(db, user_id=user.id)
    p2 = create_random_portfolio(db, user_id=user.id)
    db.commit()

    # 2. Mock the .delay() method of the sub-task
    mock_delay = mocker.patch("api.tasks.create_portfolio_snapshot.delay")

    # 3. Execute the master task
    create_snapshots_for_all_portfolios()

    # 4. Verify that .delay() was called with the correct IDs
    assert mock_delay.call_count == 2
    mock_delay.assert_any_call(p1.id)
    mock_delay.assert_any_call(p2.id)