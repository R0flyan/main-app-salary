from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas import user as schemas
from app.models import user as models
from app.models.database import get_db
from app.auth.auth import get_password_hash, verify_password, create_access_token, get_current_user, create_refresh_token
from datetime import timedelta
from app.core.config import settings
from app.schemas.user import UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# @router.post("/login")
# def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
#     db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
#     if not db_user or not verify_password(form_data.password, db_user.hashed_password):
#         raise HTTPException(status_code=400, detail="Invalid credentials")
#     access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": db_user.email}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}
@router.post("/login")
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, 
        expires_delta=access_token_expires
    )
    
    # Создаем refresh token (долгоживущий)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(
        data={"sub": db_user.email},
        expires_delta=refresh_token_expires
    )

    # УСТАНАВЛИВАЕМ COOKIE
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,           # поставить True в проде (при https)
        samesite="lax",
        max_age=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    # return {"message": "Logged in successfully"}
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, db: Session = Depends(get_db)):
    # Получаем refresh token из заголовка Authorization
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    refresh_token = auth_header.split(" ")[1]
    
    try:
        from jose import jwt
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        # Проверяем, что это именно refresh token (по типу или отдельному полю)
        # Можно добавить поле "type": "refresh" в payload
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Проверяем существование пользователя
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Создаем новые токены
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_refresh_token = create_refresh_token(
        data={"sub": user.email},
        expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}