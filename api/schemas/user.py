from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


# Shared properties
class UserBase(BaseModel):
    email: EmailStr


# Properties to receive on user creation (internal)
class UserCreate(UserBase):
    firebase_uid: str


# Properties to receive on user update
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)


# Properties to return to client
class UserRead(UserBase):
    id: int
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Properties stored in DB
class UserInDB(UserRead):
    firebase_uid: str