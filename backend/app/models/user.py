from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    vacancies = relationship("Vacancy", back_populates="owner")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    position = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    skills = Column(Text, nullable=True)
    desired_salary = Column(Integer, nullable=True)
    work_format = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)
    about = Column(Text, nullable=True)