#/ app/models/vacancy.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False, index=True)
    company = Column(String(120), nullable=False, index=True)
    salary = Column(Integer, nullable=False, index=True)

    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft", index=True)
    employment_type = Column(String(20), nullable=True, index=True)
    work_format = Column(String(20), nullable=True, index=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner = relationship("User", back_populates="vacancies")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    files = relationship("VacancyFile", back_populates="vacancy", cascade="all, delete-orphan")