from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.hh_service import fetch_hh_vacancies, HHServiceError

router = APIRouter(prefix="/external", tags=["External API"])


@router.get("/hh/vacancies")
def get_hh_vacancies(
    title: Optional[str] = Query(None, max_length=120),
    company: Optional[str] = Query(None, max_length=120),
    min_salary: Optional[int] = Query(None, ge=0),
):
    try:
        return fetch_hh_vacancies(title=title, company=company, min_salary=min_salary)
    except HHServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))