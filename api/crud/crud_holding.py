from typing import List, Optional

from sqlalchemy.orm import Session
from api.models.holding import Holding
from api.schemas.holding import HoldingCreate, HoldingUpdate

def get(db: Session, *, id: int, portfolio_id: int) -> Optional[Holding]:
    """Get a single holding by ID, ensuring it belongs to the correct portfolio."""
    return db.query(Holding).filter(Holding.id == id, Holding.portfolio_id == portfolio_id).first()

def get_multi_by_portfolio(db: Session, *, portfolio_id: int, skip: int = 0, limit: int = 100) -> List[Holding]:
    """Get all holdings for a specific portfolio."""
    return db.query(Holding).filter(Holding.portfolio_id == portfolio_id).offset(skip).limit(limit).all()

def create_with_portfolio(db: Session, *, obj_in: HoldingCreate, portfolio_id: int) -> Holding:
    """Create a new holding within a specific portfolio."""
    db_obj = Holding(**obj_in.model_dump(), portfolio_id=portfolio_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, *, db_obj: Holding, obj_in: HoldingUpdate) -> Holding:
    """Update a holding."""
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, *, id: int) -> Optional[Holding]:
    """Delete a holding by its ID."""
    obj = db.query(Holding).get(id)
    if obj:
        db.delete(obj)
        db.commit()
    return obj