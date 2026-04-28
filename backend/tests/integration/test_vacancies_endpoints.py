import pytest

from app.core.config import settings


def _login(client, email: str, password: str = "password123"):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _create_vacancy(client, payload: dict):
    return client.post("/vacancies/", json=payload)


def _default_vacancy_payload(**overrides):
    payload = {
        "title": "Python Developer",
        "company": "Acme",
        "salary": 220000,
        "description": "Backend development",
        "status": "draft",
        "employment_type": "full",
        "work_format": "remote",
    }
    payload.update(overrides)
    return payload


@pytest.mark.integration
def test_create_and_read_vacancy(client, user):
    assert _login(client, user.email).status_code == 200

    create_response = _create_vacancy(client, _default_vacancy_payload())
    assert create_response.status_code == 201
    vacancy = create_response.json()
    assert vacancy["title"] == "Python Developer"
    assert vacancy["owner_id"] == user.id

    get_response = client.get(f"/vacancies/{vacancy['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == vacancy["id"]


@pytest.mark.integration
def test_user_sees_only_own_vacancies(client, user, another_user):
    assert _login(client, user.email).status_code == 200
    _create_vacancy(client, _default_vacancy_payload(title="User vacancy"))

    assert _login(client, another_user.email).status_code == 200
    _create_vacancy(client, _default_vacancy_payload(title="Another vacancy"))

    list_response = client.get("/vacancies/")
    assert list_response.status_code == 200
    payload = list_response.json()

    assert payload["total"] == 1
    assert payload["items"][0]["title"] == "Another vacancy"


@pytest.mark.integration
def test_admin_sees_all_vacancies(client, user, another_user, admin_user):
    assert _login(client, user.email).status_code == 200
    _create_vacancy(client, _default_vacancy_payload(title="User vacancy"))

    assert _login(client, another_user.email).status_code == 200
    _create_vacancy(client, _default_vacancy_payload(title="Another vacancy"))

    assert _login(client, admin_user.email).status_code == 200
    list_response = client.get("/vacancies/")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 2


@pytest.mark.integration
def test_vacancies_validation_and_boundaries(client, user):
    assert _login(client, user.email).status_code == 200

    invalid_payload_response = _create_vacancy(
        client,
        _default_vacancy_payload(title="A"),
    )
    assert invalid_payload_response.status_code == 422

    invalid_filter_response = client.get("/vacancies/?min_salary=300000&max_salary=100000")
    assert invalid_filter_response.status_code == 422
    assert "min_salary cannot be greater than max_salary" in invalid_filter_response.text


@pytest.mark.integration
def test_forbidden_access_to_foreign_vacancy(client, user, another_user):
    assert _login(client, user.email).status_code == 200
    create_response = _create_vacancy(client, _default_vacancy_payload())
    vacancy_id = create_response.json()["id"]

    assert _login(client, another_user.email).status_code == 200
    response = client.get(f"/vacancies/{vacancy_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied"


@pytest.mark.integration
def test_upload_list_download_and_delete_file(client, user, fake_s3):
    assert _login(client, user.email).status_code == 200
    create_response = _create_vacancy(client, _default_vacancy_payload())
    vacancy_id = create_response.json()["id"]

    upload_response = client.post(
        f"/vacancies/{vacancy_id}/files",
        files={"upload": ("cv.pdf", b"pdf-bytes", "application/pdf")},
    )
    assert upload_response.status_code == 201
    uploaded = upload_response.json()
    assert uploaded["original_name"] == "cv.pdf"
    assert len(fake_s3.put_calls) == 1

    list_response = client.get(f"/vacancies/{vacancy_id}/files")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    download_response = client.get(f"/vacancies/files/{uploaded['id']}/download-url")
    assert download_response.status_code == 200
    download_payload = download_response.json()
    assert download_payload["url"].startswith("https://example.test/")
    assert download_payload["expires_in"] == settings.S3_PRESIGNED_EXPIRE_SECONDS

    delete_response = client.delete(f"/vacancies/files/{uploaded['id']}")
    assert delete_response.status_code == 204
    assert len(fake_s3.delete_calls) == 1


@pytest.mark.integration
def test_upload_file_validation(client, user, monkeypatch: pytest.MonkeyPatch):
    assert _login(client, user.email).status_code == 200
    create_response = _create_vacancy(client, _default_vacancy_payload())
    vacancy_id = create_response.json()["id"]

    invalid_type_response = client.post(
        f"/vacancies/{vacancy_id}/files",
        files={"upload": ("script.exe", b"bin", "application/octet-stream")},
    )
    assert invalid_type_response.status_code == 400
    assert invalid_type_response.json()["detail"] == "Unsupported file type"

    monkeypatch.setattr("app.routers.vacancies.settings.MAX_FILE_SIZE", 4)
    too_large_response = client.post(
        f"/vacancies/{vacancy_id}/files",
        files={"upload": ("cv.pdf", b"12345", "application/pdf")},
    )
    assert too_large_response.status_code == 400
    assert too_large_response.json()["detail"] == "File too large"


@pytest.mark.integration
def test_delete_vacancy_swallows_s3_errors(client, user, fake_s3):
    assert _login(client, user.email).status_code == 200
    create_response = _create_vacancy(client, _default_vacancy_payload())
    vacancy_id = create_response.json()["id"]

    client.post(
        f"/vacancies/{vacancy_id}/files",
        files={"upload": ("cv.pdf", b"pdf-bytes", "application/pdf")},
    )
    fake_s3.fail_delete = True

    delete_response = client.delete(f"/vacancies/{vacancy_id}")
    assert delete_response.status_code == 204
