from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from models.database import Base
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class VacancyDB(Base):
    __tablename__ = "vacancies"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    salary = Column(Float)
    salary_from = Column(Float)
    salary_to = Column(Float)
    currency = Column(String, default="RUB")
    url = Column(String)
    source = Column(String, default="hh")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, index=True)

# Pydantic модели
class UserCreate(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class VacancyCreate(BaseModel):
    title: str
    company: str
    salary: Optional[float] = None
    salary_from: Optional[float] = None
    salary_to: Optional[float] = None
    currency: str = "RUB"
    url: Optional[str] = None

class VacancyResponse(VacancyCreate):
    id: int
    source: str
    created_at: datetime
    
    class Config:
        from_attributes = True