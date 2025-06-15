from pydantic import BaseModel, EmailStr
from datetime import datetime


# Shared properties
class UserBase(BaseModel):
    email: EmailStr


# Properties to receive on user creation (internal)
class UserCreate(UserBase):
    firebase_uid: str


# Properties to receive on user update (internal)
class UserUpdate(UserBase):
    is_active: bool | None = None


# Properties to return to client
class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Properties stored in DB
class UserInDB(UserRead):
    firebase_uid: str