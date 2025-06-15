from fastapi import APIRouter, Depends
from sqlalchemy.orm import object_session

from api.auth.firebase import get_current_user
from api.crud import crud_user
from api.models.user import User
from api.schemas.user import UserRead, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserRead, summary="Get Current User")
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get the current logged-in user's profile.
    """
    return current_user


@router.put("/me", response_model=UserRead, summary="Update Current User")
def update_user_me(
    *,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update the current user's profile (e.g., their full name).
    """
    # Get the db session from the user object itself, ensuring a single session per request
    db = object_session(current_user)
    user = crud_user.update(db=db, db_obj=current_user, obj_in=user_in)
    return user


@router.delete("/me", response_model=UserRead, summary="Delete Current User")
def delete_user_me(
    *,
    current_user: User = Depends(get_current_user)
):
    """
    Delete the current user's account and all associated data (portfolios, transactions).
    This action is irreversible.
    """
    # Get the db session from the user object itself
    db = object_session(current_user)
    user = crud_user.remove(db=db, id=current_user.id)
    return user