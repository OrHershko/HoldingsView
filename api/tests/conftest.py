import pytest
from typing import Generator, Tuple
from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy_utils import database_exists, create_database, drop_database

from api.main import app
from api.core.config import settings
from api.db.base_class import Base
from api.auth.firebase import get_current_user, get_db
from api.models.user import User
from api.tests.utils.user import create_random_user
from api.db.session import SessionLocal as GlobalSessionLocal

settings.ENVIRONMENT = "testing"

engine = create_engine(settings.DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Rebind the global SessionLocal used by background tasks to the test engine
GlobalSessionLocal.configure(bind=engine)

@pytest.fixture(scope="session", autouse=True)
def db_setup_and_teardown():
    db_url = settings.DATABASE_URL
    if not database_exists(db_url):
        create_database(db_url)
        print(f"Created test database: {db_url}")
        
    Base.metadata.create_all(bind=engine)
    yield
    drop_database(db_url)
    print(f"Dropped test database: {db_url}")


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Provides a database session fixture for tests.
    """
    db_session = TestingSessionLocal()
    
    try:
        yield db_session
    finally:
        db_session.close()
        cleanup_session = TestingSessionLocal()
        for table in reversed(Base.metadata.sorted_tables):
            cleanup_session.execute(table.delete())
        cleanup_session.commit()
        cleanup_session.close()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def authenticated_client(db: Session) -> Generator[Tuple[TestClient, User], None, None]:
    test_user = create_random_user(db)

    def get_current_user_override() -> User:
        return test_user

    app.dependency_overrides[get_current_user] = get_current_user_override
    
    with TestClient(app) as c:
        yield c, test_user

    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]