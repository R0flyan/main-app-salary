#/ app/core/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Salary Analytics API"
    VERSION: str = "0.1.0"

    # --- Настройки базы данных ---
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgrespass")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # --- Настройки JWT ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # --- Настройки S3 ---
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "minioadmin")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "minioadmin")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "joby-files")
    S3_PRESIGNED_EXPIRE_SECONDS: int = int(os.getenv("S3_PRESIGNED_EXPIRE_SECONDS", "300"))
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(5 * 1024 * 1024)))

settings = Settings()