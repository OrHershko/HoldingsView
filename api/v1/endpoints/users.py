from fastapi import APIRouter, Depends

from api.auth.firebase import get_current_user
from api.models.user import User
from api.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get the current logged-in user.
    """
    return current_user