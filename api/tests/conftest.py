import pytest
from typing import Generator, Tuple

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from api.main import app
from api.core.config import settings
from api.db.base_class import Base
from api.auth.firebase import get_db, get_current_user
from api.models.user import User
from api.tests.utils.user import create_random_user

# Set the environment to "testing" for all tests
settings.ENVIRONMENT = "testing"

# Create a new engine and session for the test database
engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def db_setup_and_teardown():
    """
    Fixture to create and drop the test database schema for the entire test session.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    """
    Dependency override for getting a DB session in tests.
    """
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Apply the override to the FastAPI app for all tests
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Fixture to provide a database session to a single test function.
    Resets the DB after the test by deleting all data.
    """
    db_session = TestingSessionLocal()
    yield db_session
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()
    db_session.close()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    """
    Fixture to provide a standard TestClient instance.
    """
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def authenticated_client(db: Session) -> Generator[Tuple[TestClient, User], None, None]:
    """
    Fixture that provides an authenticated TestClient and the user object.
    It creates a user for the scope of the test function, and overrides 
    the `get_current_user` dependency to simulate that this user is making requests.
    """
    test_user = create_random_user(db)

    def get_current_user_override() -> User:
        return test_user

    app.dependency_overrides[get_current_user] = get_current_user_override
    
    with TestClient(app) as c:
        yield c, test_user # Yield both client and user

    # Clean up the override
    del app.dependency_overrides[get_current_user]