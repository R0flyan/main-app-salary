from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True
        
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"