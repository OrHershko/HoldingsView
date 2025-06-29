from sqlalchemy.orm import Session
from api.models.user import User
from api.db.session import SessionLocal
from typing import Generator

def get_dev_user() -> Generator[User, None, None]:
    """
    Returns a dummy user object for development purposes.
    This user is persisted to the database to satisfy foreign key constraints.
    """
    db: Session = SessionLocal()
    
    try:
        # Check if a dummy user exists, otherwise create it.
        # This ensures a consistent user object for development requests.
        dummy_user = db.query(User).filter(User.email == "dev@example.com").first()
        
        if not dummy_user:
            dummy_user = User(
                firebase_uid="dev_firebase_uid",
                email="dev@example.com",
                full_name="Dev User",
                is_active=True
            )
            db.add(dummy_user)
            db.commit()
            db.refresh(dummy_user)
        
        yield dummy_user
    finally:
        db.close()