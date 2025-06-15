from sqlalchemy.orm import Session
from datetime import date

from api.crud import crud_holding
from api.schemas.holding import HoldingCreate, HoldingUpdate
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio

def test_create_holding(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    holding_in = HoldingCreate(
        symbol="AAPL", quantity=10, purchase_price=150.0, purchase_date=date(2023, 1, 1)
    )

    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)

    assert holding.symbol == holding_in.symbol
    assert holding.quantity == holding_in.quantity
    assert holding.portfolio_id == portfolio.id

def test_get_holding(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    holding_in = HoldingCreate(
        symbol="GOOGL", quantity=5, purchase_price=2800.0, purchase_date=date(2023, 2, 1)
    )
    created_holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)

    retrieved_holding = crud_holding.get(db=db, id=created_holding.id, portfolio_id=portfolio.id)

    assert retrieved_holding
    assert retrieved_holding.id == created_holding.id
    assert retrieved_holding.symbol == "GOOGL"

def test_update_holding(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    holding_in = HoldingCreate(
        symbol="MSFT", quantity=20, purchase_price=300.0, purchase_date=date(2023, 3, 1)
    )
    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)

    holding_update = HoldingUpdate(quantity=25)
    updated_holding = crud_holding.update(db=db, db_obj=holding, obj_in=holding_update)

    assert updated_holding.quantity == 25
    assert updated_holding.symbol == "MSFT" # Ensure other fields are unchanged

def test_remove_holding(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    holding_in = HoldingCreate(
        symbol="AMZN", quantity=2, purchase_price=100.0, purchase_date=date(2023, 4, 1)
    )
    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)
    holding_id = holding.id

    removed_holding = crud_holding.remove(db=db, id=holding_id)
    retrieved_after_delete = crud_holding.get(db=db, id=holding_id, portfolio_id=portfolio.id)

    assert removed_holding
    assert removed_holding.id == holding_id
    assert retrieved_after_delete is None