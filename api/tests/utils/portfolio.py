from sqlalchemy.orm import Session

from api.crud import crud_portfolio
from api.models.portfolio import Portfolio
from api.schemas.portfolio import PortfolioCreate

def create_random_portfolio(db: Session, *, user_id: int) -> Portfolio:
    """Creates a random portfolio for a given user."""
    portfolio_in = PortfolioCreate(name="Test Portfolio", description="A test description")
    return crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user_id)