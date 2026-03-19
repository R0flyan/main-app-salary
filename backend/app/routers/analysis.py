from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.auth.auth import get_current_user
from app.models.user import User
from app.ml.salary_predictor import predictor

router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.post("/analyze-salaries")
async def analyze_salaries(
    vacancies: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user)
):
    """
    Анализ зарплат с помощью ML модели
    """
    try:
        result = predictor.analyze_vacancies(vacancies)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model-status")
async def get_model_status(current_user: User = Depends(get_current_user)):
    """Проверка статуса модели"""
    return {
        "is_trained": predictor.is_trained,
        "model_exists": predictor.load_model()
    }