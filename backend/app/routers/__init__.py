from fastapi import APIRouter
from . import auth, vacancies

router = APIRouter()
router.include_router(auth.router)
router.include_router(vacancies.router)