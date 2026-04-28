import pytest
import requests

from app.services.hh_service import HHServiceError, fetch_hh_vacancies


class DummyResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(
                f"HTTP {self.status_code}",
                response=type("Resp", (), {"status_code": self.status_code})(),
            )

    def json(self):
        return self.payload


@pytest.fixture(autouse=True)
def disable_fallback(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("app.services.hh_service.settings.HH_ENABLE_FALLBACK", False, raising=False)


@pytest.mark.unit
def test_fetch_hh_vacancies_success_filters_invalid_items(monkeypatch: pytest.MonkeyPatch):
    payload = {
        "items": [
            {
                "id": "1",
                "name": "Python Developer",
                "employer": {"name": "Acme"},
                "salary": {"from": 200000, "to": 250000, "currency": "RUR"},
                "alternate_url": "https://hh.ru/1",
            },
            {
                "id": "2",
                "name": "No Salary",
                "employer": {"name": "Acme"},
                "salary": None,
                "alternate_url": "https://hh.ru/2",
            },
            {
                "id": "3",
                "name": "Wrong Currency",
                "employer": {"name": "Acme"},
                "salary": {"from": 1000, "to": 2000, "currency": "USD"},
                "alternate_url": "https://hh.ru/3",
            },
        ]
    }

    def fake_get(*args, **kwargs):
        return DummyResponse(payload)

    monkeypatch.setattr(requests.Session, "get", lambda self, *args, **kwargs: fake_get(*args, **kwargs))

    result = fetch_hh_vacancies(title="python", company="acme", min_salary=150000)

    assert len(result["items"]) == 1
    assert result["items"][0]["id"] == 1
    assert result["items"][0]["salary"] == 200000


@pytest.mark.unit
def test_fetch_hh_vacancies_retries_and_succeeds(monkeypatch: pytest.MonkeyPatch):
    calls = {"count": 0}

    def fake_get(*args, **kwargs):
        calls["count"] += 1
        if calls["count"] < 3:
            raise requests.Timeout("Timed out")
        return DummyResponse({"items": []})

    monkeypatch.setattr(requests.Session, "get", lambda self, *args, **kwargs: fake_get(*args, **kwargs))
    monkeypatch.setattr("app.services.hh_service.time.sleep", lambda *_args, **_kwargs: None)

    result = fetch_hh_vacancies()

    assert result["items"] == []
    assert result["source"] == "hh"
    assert calls["count"] == 3


@pytest.mark.unit
def test_fetch_hh_vacancies_raises_service_error_after_retries(monkeypatch: pytest.MonkeyPatch):
    def fake_get(*args, **kwargs):
        raise requests.RequestException("Network down")

    monkeypatch.setattr(requests.Session, "get", lambda self, *args, **kwargs: fake_get(*args, **kwargs))
    monkeypatch.setattr("app.services.hh_service.time.sleep", lambda *_args, **_kwargs: None)

    with pytest.raises(HHServiceError):
        fetch_hh_vacancies()


@pytest.mark.unit
def test_fetch_hh_vacancies_returns_fallback_when_enabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("app.services.hh_service.settings.HH_ENABLE_FALLBACK", True, raising=False)

    def fake_get(*args, **kwargs):
        raise requests.HTTPError(
            "HTTP 403",
            response=type("Resp", (), {"status_code": 403})(),
        )

    monkeypatch.setattr(requests.Session, "get", lambda self, *args, **kwargs: fake_get(*args, **kwargs))
    monkeypatch.setattr("app.services.hh_service.time.sleep", lambda *_args, **_kwargs: None)

    response = fetch_hh_vacancies(title="python")

    assert response["source"] == "fallback"
    assert isinstance(response["items"], list)
