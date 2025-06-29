from typing import List
from sqlalchemy.orm import Session
from api.models.watchlist_item import WatchlistItem
from api.schemas.watchlist import WatchlistItemCreate

def get_multi_by_user(db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[WatchlistItem]:
    return db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).offset(skip).limit(limit).all()

def create_with_user(db: Session, *, obj_in: WatchlistItemCreate, user_id: int) -> WatchlistItem:
    db_obj = WatchlistItem(**obj_in.model_dump(), user_id=user_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_by_symbol_and_user(db: Session, *, user_id: int, symbol: str) -> WatchlistItem | None:
    return db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id, WatchlistItem.symbol == symbol).first()

def remove(db: Session, *, id: int) -> WatchlistItem | None:
    obj = db.query(WatchlistItem).get(id)
    if obj:
        db.delete(obj)
        db.commit()
    return obj