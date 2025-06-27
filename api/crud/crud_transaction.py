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
    db_obj = Transaction(
        symbol=obj_in.symbol,
        transaction_type=obj_in.transaction_type,
        quantity=obj_in.quantity,
        price=obj_in.price,
        transaction_date=obj_in.transaction_date,
        portfolio_id=portfolio_id,
        # --- Option-specific fields ---
        is_option=int(getattr(obj_in, 'is_option', False)),
        option_type=getattr(obj_in, 'option_type', None),
        strike_price=getattr(obj_in, 'strike_price', None),
        expiration_date=getattr(obj_in, 'expiration_date', None),
        underlying_symbol=getattr(obj_in, 'underlying_symbol', None),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, *, db_obj: Transaction, obj_in: TransactionCreate) -> Transaction:
    """Update an existing transaction."""
    # Update all fields from the input object
    db_obj.symbol = obj_in.symbol
    db_obj.transaction_type = obj_in.transaction_type
    db_obj.quantity = obj_in.quantity
    db_obj.price = obj_in.price
    db_obj.transaction_date = obj_in.transaction_date
    
    # Update option-specific fields
    db_obj.is_option = int(getattr(obj_in, 'is_option', False))
    db_obj.option_type = getattr(obj_in, 'option_type', None)
    db_obj.strike_price = getattr(obj_in, 'strike_price', None)
    db_obj.expiration_date = getattr(obj_in, 'expiration_date', None)
    db_obj.underlying_symbol = getattr(obj_in, 'underlying_symbol', None)
    
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