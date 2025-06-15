from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.core.config import settings
from api.models.user import User

def test_get_current_user(authenticated_client: tuple[TestClient, User]) -> None:
    """
    Test fetching the current user's profile.
    """
    client, current_user = authenticated_client
    response = client.get(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == current_user.email
    assert data["id"] == current_user.id

def test_update_current_user(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    """
    Test updating the current user's full_name.
    """
    client, current_user = authenticated_client
    new_name = "John Doe"
    
    response = client.put(
        f"{settings.API_V1_STR}/users/me",
        json={"full_name": new_name},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == new_name
    assert data["email"] == current_user.email

    # Verify the change is in the database
    db.refresh(current_user)
    assert current_user.full_name == new_name

def test_delete_current_user(authenticated_client: tuple[TestClient, User], db: Session) -> None:
    """
    Test deleting the current user's account.
    """
    client, current_user = authenticated_client
    user_id = current_user.id

    response = client.delete(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id

    # Verify the user is no longer in the database
    deleted_user = db.query(User).filter(User.id == user_id).first()
    assert deleted_user is None