from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date

from api.core.config import settings
from api.models.user import User
from api.schemas.holding import HoldingCreate
from api.tests.utils.user import create_random_user
from api.tests.utils.portfolio import create_random_portfolio
from api.crud import crud_holding

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

def test_read_portfolio_by_id(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    response = client.get(f"{settings.API_V1_STR}/portfolios/{portfolio.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == portfolio.name
    assert data["id"] == portfolio.id
    assert "holdings" in data

def test_read_portfolio_not_owned_by_user(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, _ = authenticated_client
    # Create another user and a portfolio for them
    other_user = create_random_user(db)
    other_portfolio = create_random_portfolio(db, user_id=other_user.id)
    
    # Try to access the other user's portfolio
    response = client.get(f"{settings.API_V1_STR}/portfolios/{other_portfolio.id}")
    assert response.status_code == 404

def test_create_holding_for_portfolio(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    holding_data = {
        "symbol": "TSLA",
        "quantity": 100,
        "purchase_price": 200.0,
        "purchase_date": date.today().isoformat(),
    }
    response = client.post(
        f"{settings.API_V1_STR}/portfolios/{portfolio.id}/holdings",
        json=holding_data,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["symbol"] == "TSLA"
    assert data["portfolio_id"] == portfolio.id

def test_update_holding(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    # FIX: Use the HoldingCreate Pydantic model
    holding_in = HoldingCreate(symbol="NVDA", quantity=10, purchase_price=500, purchase_date=date.today())
    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)

    update_data = {"quantity": 15}
    response = client.put(f"{settings.API_V1_STR}/portfolios/{portfolio.id}/holdings/{holding.id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["quantity"] == 15

def test_delete_holding(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    client, current_user = authenticated_client
    portfolio = create_random_portfolio(db, user_id=current_user.id)
    
    # FIX: Use the HoldingCreate Pydantic model
    holding_in = HoldingCreate(symbol="META", quantity=50, purchase_price=300, purchase_date=date.today())
    holding = crud_holding.create_with_portfolio(db=db, obj_in=holding_in, portfolio_id=portfolio.id)

    response = client.delete(f"{settings.API_V1_STR}/portfolios/{portfolio.id}/holdings/{holding.id}")
    assert response.status_code == 200

    # Verify it's gone
    db_holding = crud_holding.get(db, id=holding.id, portfolio_id=portfolio.id)
    assert db_holding is None