#/ app/core/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Salary Analytics API"
    VERSION: str = "0.1.0"
    
    HH_API_URL: str = os.getenv("HH_API_URL", "https://api.hh.ru/vacancies")
    HH_USER_AGENT: str = os.getenv(
        "HH_USER_AGENT",
        "main-app-salary/1.0 (user@box.ru)",
    )
    HH_USE_ENV_PROXY: bool = os.getenv("HH_USE_ENV_PROXY", "false").lower() == "true"
    HH_ENABLE_FALLBACK: bool = os.getenv("HH_ENABLE_FALLBACK", "false").lower() == "true"

    # --- Настройки базы данных ---
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgrespass")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    @property
    def DATABASE_URL(self) -> str:
        database_url_override = os.getenv("DATABASE_URL")
        if database_url_override:
            return database_url_override
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # --- Настройки JWT ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:8080,http://127.0.0.1:8080",
    )
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8080")
    
    # --- Настройки S3 ---
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "minioadmin")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "minioadmin")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "joby-files")
    S3_PRESIGNED_EXPIRE_SECONDS: int = int(os.getenv("S3_PRESIGNED_EXPIRE_SECONDS", "300"))
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(5 * 1024 * 1024)))

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
