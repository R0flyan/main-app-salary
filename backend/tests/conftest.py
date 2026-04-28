import os
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_app.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.auth.auth import get_password_hash  # noqa: E402
from app.main import app  # noqa: E402
from app.models import user as user_models  # noqa: E402
from app.models.database import Base, get_db  # noqa: E402
import app.routers.vacancies as vacancies_router  # noqa: E402


TEST_DB_URL = "sqlite:///./test_app.db"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@dataclass
class FakeS3Client:
    put_calls: list[dict[str, Any]] = field(default_factory=list)
    delete_calls: list[dict[str, Any]] = field(default_factory=list)
    presigned_calls: list[dict[str, Any]] = field(default_factory=list)
    fail_delete: bool = False

    def put_object(self, **kwargs: Any) -> None:
        self.put_calls.append(kwargs)

    def delete_object(self, **kwargs: Any) -> None:
        self.delete_calls.append(kwargs)
        if self.fail_delete:
            raise RuntimeError("S3 delete failed")

    def generate_presigned_url(self, operation: str, **kwargs: Any) -> str:
        self.presigned_calls.append({"operation": operation, **kwargs})
        params = kwargs.get("Params", {})
        return f"https://example.test/{params.get('Key', 'file')}"


@pytest.fixture()
def db_session() -> Session:
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def fake_s3(monkeypatch: pytest.MonkeyPatch) -> FakeS3Client:
    fake = FakeS3Client()
    monkeypatch.setattr(vacancies_router, "s3_client", fake)
    return fake


@pytest.fixture()
def create_user(db_session: Session):
    def _create_user(
        email: str,
        password: str = "password123",
        role: str = "user",
    ) -> user_models.User:
        db_user = user_models.User(
            email=email,
            hashed_password=get_password_hash(password),
            role=role,
        )
        db_session.add(db_user)
        db_session.commit()
        db_session.refresh(db_user)
        return db_user

    return _create_user


@pytest.fixture()
def user(create_user):
    return create_user("user@example.com", password="password123", role="user")


@pytest.fixture()
def another_user(create_user):
    return create_user("another@example.com", password="password123", role="user")


@pytest.fixture()
def admin_user(create_user):
    return create_user("admin@example.com", password="password123", role="admin")
