from typing import List, Optional

from sqlalchemy.orm import Session, joinedload
from api.models.portfolio import Portfolio
from api.schemas.portfolio import PortfolioCreate, PortfolioUpdate

def get(db: Session, *, id: int, user_id: int) -> Optional[Portfolio]:
    """Get a single portfolio by ID, ensuring it belongs to the user. Eager loads holdings."""
    return (
        db.query(Portfolio)
        .options(joinedload(Portfolio.holdings))
        .filter(Portfolio.id == id, Portfolio.user_id == user_id)
        .first()
    )

def get_multi_by_user(db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Portfolio]:
    """Get multiple portfolios for a specific user."""
    return db.query(Portfolio).filter(Portfolio.user_id == user_id).offset(skip).limit(limit).all()

def create_with_owner(db: Session, *, obj_in: PortfolioCreate, user_id: int) -> Portfolio:
    """Create a new portfolio for a specific user."""
    db_obj = Portfolio(**obj_in.model_dump(), user_id=user_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, *, db_obj: Portfolio, obj_in: PortfolioUpdate) -> Portfolio:
    """Update a portfolio."""
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, *, id: int, user_id: int) -> Optional[Portfolio]:
    """Delete a portfolio belonging to a specific user."""
    obj = db.query(Portfolio).filter(Portfolio.id == id, Portfolio.user_id == user_id).first()
    if obj:
        db.delete(obj)
        db.commit()
    return obj