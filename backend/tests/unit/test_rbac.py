import pytest
from fastapi import HTTPException

from app.auth.rbac import RBAC
from app.models.user import UserRole


class DummyUser:
    def __init__(self, role: str, user_id: int = 1):
        self.role = role
        self.id = user_id


class DummyVacancy:
    def __init__(self, owner_id: int):
        self.owner_id = owner_id


@pytest.mark.unit
def test_require_admin_blocks_non_admin():
    with pytest.raises(HTTPException) as exc:
        RBAC.require_admin(DummyUser("user"))

    assert exc.value.status_code == 403


@pytest.mark.unit
def test_require_role_allows_user_for_user_scope():
    checker = RBAC.require_role([UserRole.USER, UserRole.ADMIN])
    result = checker(DummyUser("user"))
    assert result.role == "user"


@pytest.mark.unit
def test_can_modify_vacancy_for_owner_or_admin():
    vacancy = DummyVacancy(owner_id=12)

    assert RBAC.can_modify_vacancy(vacancy, DummyUser("admin", user_id=1))
    assert RBAC.can_modify_vacancy(vacancy, DummyUser("user", user_id=12))
    assert not RBAC.can_modify_vacancy(vacancy, DummyUser("user", user_id=7))
