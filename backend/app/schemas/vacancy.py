from pydantic import BaseModel

class VacancyBase(BaseModel):
    title: str
    company: str
    salary: int

class VacancyCreate(VacancyBase):
    pass

class VacancyResponse(VacancyBase):
    id: int
    class Config:
        from_attributes = True
