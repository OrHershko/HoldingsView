from sqlalchemy.orm import Session

from api.crud import crud_portfolio
from api.schemas.portfolio import PortfolioCreate, PortfolioUpdate
from api.tests.utils.user import create_random_user

def test_create_portfolio(db: Session) -> None:
    user = create_random_user(db)
    portfolio_in = PortfolioCreate(name="My First Portfolio", description="For tech stocks")
    
    portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user.id)
    
    assert portfolio.name == portfolio_in.name
    assert portfolio.description == portfolio_in.description
    assert portfolio.user_id == user.id

def test_get_portfolio(db: Session) -> None:
    user = create_random_user(db)
    portfolio_in = PortfolioCreate(name="Another Portfolio")
    created_portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user.id)
    
    retrieved_portfolio = crud_portfolio.get(db=db, id=created_portfolio.id, user_id=user.id)
    
    assert retrieved_portfolio
    assert retrieved_portfolio.id == created_portfolio.id
    assert retrieved_portfolio.name == created_portfolio.name

def test_get_portfolio_wrong_owner(db: Session) -> None:
    user1 = create_random_user(db)
    user2 = create_random_user(db)
    portfolio_in = PortfolioCreate(name="User 1's Portfolio")
    created_portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user1.id)
    
    # Try to retrieve user1's portfolio as user2
    retrieved_portfolio = crud_portfolio.get(db=db, id=created_portfolio.id, user_id=user2.id)
    
    assert retrieved_portfolio is None

def test_update_portfolio(db: Session) -> None:
    user = create_random_user(db)
    portfolio_in = PortfolioCreate(name="Initial Name")
    portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user.id)
    
    new_name = "Updated Name"
    portfolio_update = PortfolioUpdate(name=new_name)
    
    updated_portfolio = crud_portfolio.update(db=db, db_obj=portfolio, obj_in=portfolio_update)
    
    assert updated_portfolio.id == portfolio.id
    assert updated_portfolio.name == new_name

def test_remove_portfolio(db: Session) -> None:
    user = create_random_user(db)
    portfolio_in = PortfolioCreate(name="To Be Deleted")
    portfolio = crud_portfolio.create_with_owner(db=db, obj_in=portfolio_in, user_id=user.id)
    
    portfolio_id = portfolio.id
    
    removed_portfolio = crud_portfolio.remove(db=db, id=portfolio_id, user_id=user.id)
    retrieved_after_delete = crud_portfolio.get(db=db, id=portfolio_id, user_id=user.id)
    
    assert removed_portfolio.id == portfolio_id
    assert retrieved_after_delete is None