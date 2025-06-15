import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date
from unittest.mock import AsyncMock

from api.core.config import settings
from api.models.user import User
from api.schemas.transaction import TransactionCreate
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio
from api.crud import crud_transaction

def test_create_portfolio(authenticated_client: tuple[TestClient, User]) -> None:
    client, _ = authenticated_client
    response = client.post(
        f"{settings.API_V1_STR}/portfolios",
        json={"name": "Tech Stocks", "description": "My collection of FAANG"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tech Stocks"
    assert "id" in data

def test_read_portfolios(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    create_random_portfolio(db, user_id=current_user.id)
    create_random_portfolio(db, user_id=current_user.id)

    response = client.get(f"{settings.API_V1_STR}/portfolios")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

@pytest.mark.asyncio
async def test_read_portfolio_by_id_with_full_analysis(authenticated_client: tuple[TestClient, User], db: Session, mocker) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    # Add transactions
    crud_transaction.create_with_portfolio(db, obj_in=TransactionCreate(symbol="AAPL", transaction_type="BUY", quantity=10, price=100, transaction_date=date.today()), portfolio_id=portfolio.id)
    
    # Mock the market data service call
    mock_prices = {"AAPL": 150.0}
    mocker.patch("api.services.market_data_service.get_current_prices", return_value=mock_prices)

    response = client.get(f"{settings.API_V1_STR}/portfolios/{portfolio.id}")
    assert response.status_code == 200
    data = response.json()
    
    # Check portfolio level data
    assert data["name"] == portfolio.name
    assert data["total_market_value"] == 1500.0  # 10 shares * $150
    assert data["total_cost_basis"] == 1000.0  # 10 shares * $100
    assert data["total_unrealized_gain_loss"] == 500.0
    assert data["total_unrealized_gain_loss_percent"] == 50.0

    # Check holding level data
    assert "holdings" in data
    assert len(data["holdings"]) == 1
    holding = data["holdings"][0]
    assert holding["symbol"] == "AAPL"
    assert holding["quantity"] == 10
    assert holding["average_cost_basis"] == 100.0
    assert holding["current_price"] == 150.0
    assert holding["market_value"] == 1500.0
    assert holding["unrealized_gain_loss"] == 500.0
    assert holding["unrealized_gain_loss_percent"] == 50.0

def test_read_portfolio_not_owned_by_user(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, _ = authenticated_client
    other_user = create_random_user(db)
    other_portfolio = create_random_portfolio(db, user_id=other_user.id)
    
    response = client.get(f"{settings.API_V1_STR}/portfolios/{other_portfolio.id}")
    assert response.status_code == 404

def test_create_transaction_for_portfolio(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    transaction_data = {
        "symbol": "TSLA",
        "transaction_type": "BUY",
        "quantity": 100,
        "price": 200.0,
        "transaction_date": date.today().isoformat(),
    }
    response = client.post(
        f"{settings.API_V1_STR}/portfolios/{portfolio.id}/transactions",
        json=transaction_data,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["symbol"] == "TSLA"
    assert data["portfolio_id"] == portfolio.id

def test_create_sell_transaction_insufficient_quantity(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    """
    Tests that the API prevents selling more shares than owned.
    """
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)

    # Add a BUY transaction for 10 shares
    crud_transaction.create_with_portfolio(
        db,
        obj_in=TransactionCreate(
            symbol="NVDA",
            transaction_type="BUY",
            quantity=10,
            price=500,
            transaction_date=date.today(),
        ),
        portfolio_id=portfolio.id,
    )

    # Attempt to SELL 11 shares, which should fail
    sell_transaction_data = {
        "symbol": "NVDA",
        "transaction_type": "SELL",
        "quantity": 11,
        "price": 600.0,
        "transaction_date": date.today().isoformat(),
    }

    response = client.post(
        f"{settings.API_V1_STR}/portfolios/{portfolio.id}/transactions",
        json=sell_transaction_data,
    )

    assert response.status_code == 400
    data = response.json()
    assert "Insufficient quantity" in data["detail"]

def test_delete_transaction(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    transaction_in = TransactionCreate(symbol="META", transaction_type="BUY", quantity=50, price=300, transaction_date=date.today())
    transaction = crud_transaction.create_with_portfolio(db=db, obj_in=transaction_in, portfolio_id=portfolio.id)

    response = client.delete(f"{settings.API_V1_STR}/portfolios/{portfolio.id}/transactions/{transaction.id}")
    assert response.status_code == 200

    db_transaction = crud_transaction.get(db, id=transaction.id)
    assert db_transaction is None