#/ app/schemas/vacancy.py
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class VacancyBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    company: str = Field(..., min_length=2, max_length=120)
    salary: int = Field(..., ge=0, le=10_000_000)
    description: Optional[str] = Field(None, max_length=5000)
    status: Literal["draft", "published", "archived"] = "draft"
    employment_type: Optional[Literal["full", "part", "project", "internship"]] = None
    work_format: Optional[Literal["office", "remote", "hybrid"]] = None


class VacancyCreate(VacancyBase):
    pass


class VacancyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    company: Optional[str] = Field(None, min_length=2, max_length=120)
    salary: Optional[int] = Field(None, ge=0, le=10_000_000)
    description: Optional[str] = Field(None, max_length=5000)
    status: Optional[Literal["draft", "published", "archived"]] = None
    employment_type: Optional[Literal["full", "part", "project", "internship"]] = None
    work_format: Optional[Literal["office", "remote", "hybrid"]] = None


class VacancyResponse(VacancyBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VacancyFileResponse(BaseModel):
    id: int
    vacancy_id: int
    owner_id: int
    original_name: str
    mime_type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedVacancyResponse(BaseModel):
    items: list[VacancyResponse]
    total: int
    page: int
    page_size: int
    pages: int