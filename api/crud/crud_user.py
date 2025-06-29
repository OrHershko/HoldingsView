from sqlalchemy.orm import Session

from api.models.user import User
from api.models.watchlist_item import WatchlistItem
from api.schemas.user import UserCreate, UserUpdate

DEFAULT_WATCHLIST = [
    {'symbol': 'SPY', 'name': 'S&P 500 ETF'},
    {'symbol': 'QQQ', 'name': 'Nasdaq 100 ETF'},
    {'symbol': 'DIA', 'name': 'Dow Jones ETF'},
    {'symbol': 'IWM', 'name': 'Russell 2000 ETF'},
    {'symbol': '^VIX', 'name': 'Volatility Index'},
    {'symbol': 'ES=F', 'name': 'S&P 500 Futures'},
    {'symbol': 'NQ=F', 'name': 'Nasdaq 100 Futures'},
    {'symbol': 'YM=F', 'name': 'Dow Jones Futures'},
    {'symbol': 'RTY=F', 'name': 'Russell 2000 Futures'},
    {'symbol': 'GC=F', 'name': 'Gold Futures'},
    {'symbol': 'CL=F', 'name': 'Crude Oil Futures'},
    {'symbol': 'BTC-USD', 'name': 'Bitcoin'},
]

def get_by_firebase_uid(db: Session, *, firebase_uid: str) -> User | None:
    """
    Get a user by their Firebase UID.
    """
    return db.query(User).filter(User.firebase_uid == firebase_uid).first()


def create(*, db: Session, obj_in: UserCreate) -> User:
    """
    Create a new user and populate their watchlist with default items.
    """
    db_obj = User(
        email=obj_in.email,
        firebase_uid=obj_in.firebase_uid,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    # Add default watchlist items
    for item in DEFAULT_WATCHLIST:
        watchlist_item = WatchlistItem(symbol=item['symbol'], name=item['name'], user_id=db_obj.id)
        db.add(watchlist_item)
    
    db.commit()

    return db_obj


def get_or_create(*, db: Session, obj_in: UserCreate) -> User:
    """
    Get a user if they exist, otherwise create them.
    """
    user = get_by_firebase_uid(db=db, firebase_uid=obj_in.firebase_uid)
    if user:
        return user
    return create(db=db, obj_in=obj_in)


def update(db: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
    """
    Update a user.
    """
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def remove(db: Session, *, id: int) -> User | None:
    """
    Delete a user by their ID.
    """
    obj = db.query(User).get(id)
    if obj:
        db.delete(obj)
        db.commit()
    return obj