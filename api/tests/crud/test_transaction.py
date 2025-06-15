from sqlalchemy.orm import Session
from datetime import date

from api.crud import crud_transaction
from api.schemas.transaction import TransactionCreate
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio

def test_create_transaction(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    transaction_in = TransactionCreate(
        symbol="AAPL",
        transaction_type="BUY",
        quantity=10,
        price=150.0,
        transaction_date=date(2023, 1, 1),
    )

    transaction = crud_transaction.create_with_portfolio(
        db=db, obj_in=transaction_in, portfolio_id=portfolio.id
    )

    assert transaction.symbol == transaction_in.symbol
    assert transaction.quantity == transaction_in.quantity
    assert transaction.portfolio_id == portfolio.id
    assert transaction.transaction_type.value == "BUY"

def test_get_transaction(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    transaction_in = TransactionCreate(
        symbol="GOOGL",
        transaction_type="BUY",
        quantity=5,
        price=2800.0,
        transaction_date=date(2023, 2, 1),
    )
    created_transaction = crud_transaction.create_with_portfolio(
        db=db, obj_in=transaction_in, portfolio_id=portfolio.id
    )

    retrieved_transaction = crud_transaction.get(db=db, id=created_transaction.id)

    assert retrieved_transaction
    assert retrieved_transaction.id == created_transaction.id
    assert retrieved_transaction.symbol == "GOOGL"

def test_remove_transaction(db: Session) -> None:
    user = create_random_user(db)
    portfolio = create_random_portfolio(db, user_id=user.id)
    transaction_in = TransactionCreate(
        symbol="AMZN",
        transaction_type="SELL",
        quantity=2,
        price=100.0,
        transaction_date=date(2023, 4, 1),
    )
    transaction = crud_transaction.create_with_portfolio(
        db=db, obj_in=transaction_in, portfolio_id=portfolio.id
    )
    transaction_id = transaction.id

    removed_transaction = crud_transaction.remove(db=db, id=transaction_id)
    retrieved_after_delete = crud_transaction.get(db=db, id=transaction_id)

    assert removed_transaction
    assert removed_transaction.id == transaction_id
    assert retrieved_after_delete is None