import pytest


def _login(client, email: str, password: str = "password123"):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


@pytest.mark.integration
def test_register_login_and_get_current_user(client):
    register_response = client.post(
        "/auth/register",
        json={"email": "new-user@example.com", "password": "password123"},
    )
    assert register_response.status_code == 200
    assert register_response.json()["email"] == "new-user@example.com"

    login_response = _login(client, "new-user@example.com")
    assert login_response.status_code == 200
    assert "access_token" in login_response.cookies
    assert "refresh_token" in login_response.cookies

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    payload = me_response.json()
    assert payload["email"] == "new-user@example.com"
    assert payload["role"] == "user"


@pytest.mark.integration
def test_register_duplicate_email_returns_400(client, user):
    response = client.post(
        "/auth/register",
        json={"email": user.email, "password": "password123"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.integration
def test_login_invalid_credentials_returns_400(client, user):
    response = _login(client, user.email, password="wrong-password")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid credentials"


@pytest.mark.integration
def test_me_requires_authentication(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


@pytest.mark.integration
def test_refresh_requires_cookie(client):
    response = client.post("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token"


@pytest.mark.integration
def test_refresh_returns_new_access_token(client, user):
    login_response = _login(client, user.email)
    assert login_response.status_code == 200

    refresh_response = client.post("/auth/refresh")
    assert refresh_response.status_code == 200
    payload = refresh_response.json()

    assert payload["token_type"] == "bearer"
    assert "access_token" in payload
    assert "refresh_token" in payload


@pytest.mark.integration
def test_users_endpoint_is_admin_only(client, user, admin_user):
    user_login_response = _login(client, user.email)
    assert user_login_response.status_code == 200

    forbidden_response = client.get("/auth/users")
    assert forbidden_response.status_code == 403

    admin_login_response = _login(client, admin_user.email)
    assert admin_login_response.status_code == 200

    users_response = client.get("/auth/users")
    assert users_response.status_code == 200
    assert len(users_response.json()) >= 2


@pytest.mark.integration
def test_change_user_role_admin_only(client, user, another_user, admin_user):
    user_login_response = _login(client, user.email)
    assert user_login_response.status_code == 200

    forbidden_response = client.put(f"/auth/users/{another_user.id}/role?new_role=admin")
    assert forbidden_response.status_code == 403

    admin_login_response = _login(client, admin_user.email)
    assert admin_login_response.status_code == 200

    success_response = client.put(f"/auth/users/{another_user.id}/role?new_role=admin")
    assert success_response.status_code == 200
    assert "changed to admin" in success_response.json()["message"]
