from sqlalchemy.orm import Session
from api.models.user import User
from api.db.session import SessionLocal
from typing import Generator

def get_dev_user() -> Generator[User, None, None]:
    """
    Returns a dummy user object for development purposes.
    This user does not actually exist in the database but satisfies the dependency.
    
    To make this work with endpoints that need a DB session from the user,
    we must provide a valid object that can be queried for its session,
    even though it's not a real user.
    """
    db: Session = SessionLocal()
    
    # Check if a dummy user exists, otherwise create it.
    # This ensures a consistent user object for development requests.
    dummy_user = db.query(User).filter(User.email == "dev@example.com").first()
    
    if not dummy_user:
        dummy_user = User(
            id=1, # A predictable ID
            firebase_uid="dev_firebase_uid",
            email="dev@example.com",
            full_name="Dev User",
            is_active=True
        )
        # Note: We don't commit this user to the DB. It's an in-memory object
        # that is attached to a session, which is all our endpoints need.
        # If you wanted it to persist, you would db.add() and db.commit().
        # For our use case, an in-memory object is sufficient and cleaner.
    
    # We yield the user and ensure the session is closed, although for this
    # non-persistent object, it's less critical than in production code.
    try:
        yield dummy_user
    finally:
        db.close()