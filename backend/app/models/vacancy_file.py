from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class VacancyFile(Base):
    __tablename__ = "vacancy_files"

    id = Column(Integer, primary_key=True, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    object_key = Column(String(255), unique=True, nullable=False)
    bucket = Column(String(100), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vacancy = relationship("Vacancy", back_populates="files")