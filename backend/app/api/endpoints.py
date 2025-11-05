from fastapi import APIRouter, Query
from app.models.object import Vacancy
from typing import Optional

router = APIRouter()
salaries = []
data = [
        {"id": 1, "title": "Python Developer", "company": "Yandex", "salary": 280000},
        {"id": 2, "title": "Frontend Developer", "company": "VK", "salary": 180000},
        {"id": 3, "title": "Data Analyst", "company": "Ozon", "salary": 160000},
        {"id": 4, "title": "DevOps", "company": "Сбер", "salary": 175000},
    ]

@router.get("/")
def root():
    return {"message": "Salary Analytics API is running"}

@router.get("/vacancies")
def get_vacancies(title: Optional[str] = Query(None),
                  company: Optional[str] = Query(None),
                  min_salary: Optional[int] = Query(None)):
    results = data
    if title:
        results = [v for v in results if title.lower() in v["title"].lower()]
    if company:
        results = [v for v in results if company.lower() in v["company"].lower()]
    if min_salary:
        results = [v for v in results if v["salary"] >= min_salary]
        
    return results
    

@router.get("/ping")
def ping():
    return {"message": "pong!"}