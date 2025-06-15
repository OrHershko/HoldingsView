import random
import string
from sqlalchemy.orm import Session

from api.crud import crud_user
from api.schemas.user import UserCreate
from api.models.user import User

def random_lower_string() -> str:
    return "".join(random.choices(string.ascii_lowercase, k=32))

def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"

def create_random_user(db: Session) -> User:
    email = random_email()
    firebase_uid = random_lower_string()
    user_in = UserCreate(email=email, firebase_uid=firebase_uid)
    return crud_user.create(db=db, obj_in=user_in)