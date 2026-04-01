#/ app/routers/vacancies.py
# from fastapi import APIRouter, Depends, HTTPException, Query, status
# from sqlalchemy.orm import Session
# from typing import Optional, List
# from app.models import vacancy as models
# from app.schemas import vacancy as schemas
# from app.models.database import get_db
# from app.auth.auth import get_current_user
# from app.auth.rbac import require_user, RBAC
# from app.models.user import UserRole

# router = APIRouter(prefix="/vacancies", tags=["Vacancies"])

# @router.get("/", response_model=List[schemas.VacancyResponse])
# def get_vacancies(
#     title: Optional[str] = Query(None),
#     company: Optional[str] = Query(None),
#     min_salary: Optional[int] = Query(None),
#     db: Session = Depends(get_db),
#     current_user=Depends(require_user),
# ):
#     if current_user.role == UserRole.USER:
#         query = db.query(models.Vacancy).filter(models.Vacancy.owner_id == current_user.id)
#     if title:
#         query = query.filter(models.Vacancy.title.ilike(f"%{title}%"))
#     if company:
#         query = query.filter(models.Vacancy.company.ilike(f"%{company}%"))
#     if min_salary:
#         query = query.filter(models.Vacancy.salary >= min_salary)
#     return query.all()

# @router.post("/", response_model=schemas.VacancyResponse, status_code=status.HTTP_201_CREATED)
# def create_vacancy(vacancy: schemas.VacancyCreate, db: Session = Depends(get_db), current_user=Depends(require_user)):
#     new_vacancy = models.Vacancy(**vacancy.dict(), owner_id=current_user.id)
#     db.add(new_vacancy)
#     db.commit()
#     db.refresh(new_vacancy)
#     return new_vacancy

# @router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_vacancy(vacancy_id: int, db: Session = Depends(get_db), current_user=Depends(require_user)):
#     vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id, models.Vacancy.owner_id == current_user.id).first()
#     if not vacancy:
#         raise HTTPException(status_code=404, detail="Vacancy not found")
#     db.delete(vacancy)
#     db.commit()
from math import ceil
from uuid import uuid4
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, or_

from app.models.database import get_db
from app.models import vacancy as vacancy_models
from app.models.vacancy_file import VacancyFile
from app.schemas import vacancy as schemas
from app.auth.rbac import require_user, RBAC
from app.services.s3 import s3_client
from app.core.config import settings


router = APIRouter(prefix="/vacancies", tags=["Vacancies"])

SortBy = Literal["created_at", "salary", "title", "company"]
SortOrder = Literal["asc", "desc"]


def get_accessible_vacancy_or_404(vacancy_id: int, db: Session, current_user):
    vacancy = db.query(vacancy_models.Vacancy).filter(vacancy_models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if current_user.role != "admin" and vacancy.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return vacancy


@router.get("/", response_model=schemas.PaginatedVacancyResponse)
def get_vacancies(
    search: Optional[str] = Query(None, min_length=1, max_length=120),
    title: Optional[str] = Query(None, max_length=120),
    company: Optional[str] = Query(None, max_length=120),
    status_filter: Optional[Literal["draft", "published", "archived"]] = Query(None, alias="status"),
    employment_type: Optional[Literal["full", "part", "project", "internship"]] = None,
    work_format: Optional[Literal["office", "remote", "hybrid"]] = None,
    min_salary: Optional[int] = Query(None, ge=0),
    max_salary: Optional[int] = Query(None, ge=0),
    sort_by: SortBy = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    if min_salary is not None and max_salary is not None and min_salary > max_salary:
        raise HTTPException(status_code=422, detail="min_salary cannot be greater than max_salary")

    query = db.query(vacancy_models.Vacancy)

    if current_user.role != "admin":
        query = query.filter(vacancy_models.Vacancy.owner_id == current_user.id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                vacancy_models.Vacancy.title.ilike(pattern),
                vacancy_models.Vacancy.company.ilike(pattern),
                vacancy_models.Vacancy.description.ilike(pattern),
            )
        )

    if title:
        query = query.filter(vacancy_models.Vacancy.title.ilike(f"%{title}%"))
    if company:
        query = query.filter(vacancy_models.Vacancy.company.ilike(f"%{company}%"))
    if status_filter:
        query = query.filter(vacancy_models.Vacancy.status == status_filter)
    if employment_type:
        query = query.filter(vacancy_models.Vacancy.employment_type == employment_type)
    if work_format:
        query = query.filter(vacancy_models.Vacancy.work_format == work_format)
    if min_salary is not None:
        query = query.filter(vacancy_models.Vacancy.salary >= min_salary)
    if max_salary is not None:
        query = query.filter(vacancy_models.Vacancy.salary <= max_salary)

    sort_column = getattr(vacancy_models.Vacancy, sort_by)
    query = query.order_by(desc(sort_column) if sort_order == "desc" else asc(sort_column))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    pages = max(1, ceil(total / page_size)) if page_size else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/{vacancy_id}", response_model=schemas.VacancyResponse)
def get_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    return get_accessible_vacancy_or_404(vacancy_id, db, current_user)


@router.post("/", response_model=schemas.VacancyResponse, status_code=status.HTTP_201_CREATED)
def create_vacancy(
    vacancy: schemas.VacancyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    new_vacancy = vacancy_models.Vacancy(**vacancy.dict(), owner_id=current_user.id)
    db.add(new_vacancy)
    db.commit()
    db.refresh(new_vacancy)
    return new_vacancy


@router.put("/{vacancy_id}", response_model=schemas.VacancyResponse)
def update_vacancy(
    vacancy_id: int,
    payload: schemas.VacancyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    vacancy = get_accessible_vacancy_or_404(vacancy_id, db, current_user)

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(vacancy, key, value)

    db.commit()
    db.refresh(vacancy)
    return vacancy


@router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vacancy(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    vacancy = get_accessible_vacancy_or_404(vacancy_id, db, current_user)

    for db_file in vacancy.files:
        try:
            s3_client.delete_object(Bucket=db_file.bucket, Key=db_file.object_key)
        except Exception:
            pass

    db.delete(vacancy)
    db.commit()


@router.get("/{vacancy_id}/files", response_model=list[schemas.VacancyFileResponse])
def list_vacancy_files(
    vacancy_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    vacancy = get_accessible_vacancy_or_404(vacancy_id, db, current_user)
    return vacancy.files


@router.post("/{vacancy_id}/files", response_model=schemas.VacancyFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_vacancy_file(
    vacancy_id: int,
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    vacancy = get_accessible_vacancy_or_404(vacancy_id, db, current_user)

    allowed_types = {"application/pdf", "image/png", "image/jpeg"}
    if upload.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await upload.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    extension = upload.filename.rsplit(".", 1)[-1].lower() if "." in upload.filename else "bin"
    object_key = f"vacancies/{vacancy_id}/{uuid4()}.{extension}"

    s3_client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=object_key,
        Body=content,
        ContentType=upload.content_type,
    )

    db_file = VacancyFile(
        vacancy_id=vacancy.id,
        owner_id=current_user.id,
        original_name=upload.filename,
        mime_type=upload.content_type,
        size=len(content),
        object_key=object_key,
        bucket=settings.S3_BUCKET_NAME,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return db_file


@router.get("/files/{file_id}/download-url")
def get_file_download_url(
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    db_file = db.query(VacancyFile).filter(VacancyFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    vacancy = get_accessible_vacancy_or_404(db_file.vacancy_id, db, current_user)

    if current_user.role != "admin" and vacancy.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": db_file.bucket, "Key": db_file.object_key},
        ExpiresIn=settings.S3_PRESIGNED_EXPIRE_SECONDS,
    )
    return {"url": url, "expires_in": settings.S3_PRESIGNED_EXPIRE_SECONDS}


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_user),
):
    db_file = db.query(VacancyFile).filter(VacancyFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    vacancy = get_accessible_vacancy_or_404(db_file.vacancy_id, db, current_user)

    if current_user.role != "admin" and vacancy.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    s3_client.delete_object(Bucket=db_file.bucket, Key=db_file.object_key)
    db.delete(db_file)
    db.commit()