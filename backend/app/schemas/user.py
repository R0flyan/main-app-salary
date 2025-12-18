from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    position: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    skills: Optional[str] = None
    desired_salary: Optional[int] = Field(None, ge=0)
    work_format: Optional[str] = None
    employment_type: Optional[str] = None
    about: Optional[str] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):  # Добавьте этот класс
    user_id: int
    
    class Config:
        from_attributes = True

class UserProfileResponse(UserResponse):
    # Добавляем поля профиля
    full_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    position: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[str] = None
    desired_salary: Optional[int] = None
    work_format: Optional[str] = None
    employment_type: Optional[str] = None
    about: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"