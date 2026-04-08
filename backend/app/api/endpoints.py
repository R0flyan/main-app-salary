#/app/api/endpoints.py
from fastapi import APIRouter
from app.routers import auth, vacancies, analysis, external

router = APIRouter()
router.include_router(auth.router)
router.include_router(vacancies.router)
router.include_router(analysis.router)
router.include_router(external.router)