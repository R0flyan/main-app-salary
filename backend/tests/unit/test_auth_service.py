from datetime import timedelta

import pytest
from jose import jwt

from app.auth.auth import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.core.config import settings


@pytest.mark.unit
def test_password_hash_and_verify():
    raw_password = "very-strong-password-123"
    hashed = get_password_hash(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed)
    assert not verify_password("wrong-password", hashed)


@pytest.mark.unit
def test_password_is_truncated_to_72_chars_for_bcrypt():
    first_72 = "a" * 72
    password_a = first_72 + "11111111"
    password_b = first_72 + "22222222"

    hashed = get_password_hash(password_a)

    assert verify_password(password_a, hashed)
    assert verify_password(password_b, hashed)


@pytest.mark.unit
def test_create_access_token_contains_subject():
    token = create_access_token({"sub": "user@example.com"}, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["sub"] == "user@example.com"
    assert "exp" in payload


@pytest.mark.unit
def test_create_refresh_token_contains_type():
    token = create_refresh_token({"sub": "user@example.com"}, expires_delta=timedelta(days=1))
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["sub"] == "user@example.com"
    assert payload["type"] == "refresh"
    assert "exp" in payload
