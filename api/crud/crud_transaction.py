from typing import List, Optional

from sqlalchemy.orm import Session
from api.models.transaction import Transaction
from api.schemas.transaction import TransactionCreate

def get(db: Session, id: int) -> Optional[Transaction]:
    """Get a single transaction by ID."""
    return db.query(Transaction).filter(Transaction.id == id).first()

def get_multi_by_portfolio(db: Session, *, portfolio_id: int, skip: int = 0, limit: int = 100) -> List[Transaction]:
    """Get all transactions for a specific portfolio."""
    return db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id).order_by(Transaction.transaction_date.asc()).offset(skip).limit(limit).all()

def create_with_portfolio(db: Session, *, obj_in: TransactionCreate, portfolio_id: int) -> Transaction:
    """Create a new transaction within a specific portfolio."""
    db_obj = Transaction(**obj_in.model_dump(), portfolio_id=portfolio_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, *, id: int) -> Optional[Transaction]:
    """Delete a transaction by its ID."""
    obj = db.query(Transaction).get(id)
    if obj:
        db.delete(obj)
        db.commit()
    return obj