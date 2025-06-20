from sqlalchemy.orm import Session

from api.models.user import User
from api.schemas.user import UserCreate, UserUpdate


def get_by_firebase_uid(db: Session, *, firebase_uid: str) -> User | None:
    """
    Get a user by their Firebase UID.
    """
    return db.query(User).filter(User.firebase_uid == firebase_uid).first()


def create(*, db: Session, obj_in: UserCreate) -> User:
    """
    Create a new user.
    """
    db_obj = User(
        email=obj_in.email,
        firebase_uid=obj_in.firebase_uid,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
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