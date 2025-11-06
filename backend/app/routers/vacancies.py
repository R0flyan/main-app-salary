from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import vacancy as models
from app.schemas import vacancy as schemas
from app.models.database import get_db
from app.auth.auth import get_current_user

router = APIRouter(prefix="/vacancies", tags=["Vacancies"])

@router.get("/", response_model=List[schemas.VacancyResponse])
def get_vacancies(
    title: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    min_salary: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.Vacancy).filter(models.Vacancy.owner_id == current_user.id)
    if title:
        query = query.filter(models.Vacancy.title.ilike(f"%{title}%"))
    if company:
        query = query.filter(models.Vacancy.company.ilike(f"%{company}%"))
    if min_salary:
        query = query.filter(models.Vacancy.salary >= min_salary)
    return query.all()

@router.post("/", response_model=schemas.VacancyResponse, status_code=status.HTTP_201_CREATED)
def create_vacancy(vacancy: schemas.VacancyCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    new_vacancy = models.Vacancy(**vacancy.dict(), owner_id=current_user.id)
    db.add(new_vacancy)
    db.commit()
    db.refresh(new_vacancy)
    return new_vacancy

@router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vacancy(vacancy_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id, models.Vacancy.owner_id == current_user.id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    db.delete(vacancy)
    db.commit()
