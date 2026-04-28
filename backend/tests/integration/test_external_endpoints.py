import pytest

from app.services.hh_service import HHServiceError


@pytest.mark.integration
def test_external_hh_vacancies_success(client, monkeypatch: pytest.MonkeyPatch):
    def fake_fetch(**kwargs):
        return {"items": [{"id": 1, "title": "Python Developer", "salary": 200000}]}

    monkeypatch.setattr("app.routers.external.fetch_hh_vacancies", fake_fetch)

    response = client.get("/external/hh/vacancies?title=python&min_salary=100000")
    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["title"] == "Python Developer"


@pytest.mark.integration
def test_external_hh_vacancies_maps_service_error_to_502(client, monkeypatch: pytest.MonkeyPatch):
    def fake_fetch(**kwargs):
        raise HHServiceError("upstream failed")

    monkeypatch.setattr("app.routers.external.fetch_hh_vacancies", fake_fetch)

    response = client.get("/external/hh/vacancies")
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream failed"


@pytest.mark.integration
def test_external_hh_vacancies_query_validation(client):
    response = client.get("/external/hh/vacancies?min_salary=-1")
    assert response.status_code == 422
