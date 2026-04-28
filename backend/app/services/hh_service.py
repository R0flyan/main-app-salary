import time
from typing import Optional
from urllib import response

import requests

from app.core.config import settings


class HHServiceError(Exception):
    pass


FALLBACK_ITEMS = [
    {
        "id": 900001,
        "title": "Python Developer",
        "company": "DemoTech",
        "salary": 180000,
        "salaryTo": 240000,
        "currency": "RUR",
        "url": "https://hh.ru/search/vacancy?text=Python+Developer",
    },
    {
        "id": 900002,
        "title": "Frontend React Developer",
        "company": "WebStudio",
        "salary": 150000,
        "salaryTo": 210000,
        "currency": "RUR",
        "url": "https://hh.ru/search/vacancy?text=React+Developer",
    },
    {
        "id": 900003,
        "title": "QA Automation Engineer",
        "company": "Quality Lab",
        "salary": 140000,
        "salaryTo": 190000,
        "currency": "RUR",
        "url": "https://hh.ru/search/vacancy?text=QA+Automation",
    },
    {
        "id": 900004,
        "title": "Data Analyst",
        "company": "Insight Corp",
        "salary": 130000,
        "salaryTo": 170000,
        "currency": "RUR",
        "url": "https://hh.ru/search/vacancy?text=Data+Analyst",
    },
]


def _filter_fallback_items(
    title: Optional[str],
    company: Optional[str],
    min_salary: Optional[int],
) -> list[dict]:
    items = FALLBACK_ITEMS

    if title:
        title_l = title.lower()
        items = [item for item in items if title_l in item["title"].lower()]

    if company:
        company_l = company.lower()
        items = [item for item in items if company_l in item["company"].lower()]

    if min_salary is not None:
        items = [item for item in items if item["salary"] >= min_salary]

    return items[:20]


def _fallback_response(
    title: Optional[str],
    company: Optional[str],
    min_salary: Optional[int],
    warning: str,
) -> dict:
    return {
        "items": _filter_fallback_items(title, company, min_salary),
        "source": "fallback",
        "warning": warning,
    }


def fetch_hh_vacancies(
    title: Optional[str] = None,
    company: Optional[str] = None,
    min_salary: Optional[int] = None,
):
    params = {
        "per_page": 20,
        "currency": "RUR",
        "only_with_salary": True,
    }

    search_text = []
    if title:
        search_text.append(title)
    if company:
        search_text.append(company)
    params["text"] = " ".join(search_text) if search_text else "разработчик"

    if min_salary is not None:
        params["salary"] = min_salary

    max_retries = 2
    timeout_seconds = 5

    session = requests.Session()
    # Для локального запуска обычно лучше не доверять системным proxy-переменным.
    session.trust_env = settings.HH_USE_ENV_PROXY

    for attempt in range(max_retries + 1):
        try:
            response = session.get(
                settings.HH_API_URL,
                params=params,
                timeout=timeout_seconds,
                headers={
                    "HH-User-Agent": "main-app-salary/1.0 (user@box.ru)"
                }
            )
            print("HH URL:", getattr(response, "url", settings.HH_API_URL))
            print("HH STATUS:", getattr(response, "status_code", "unknown"))
            print("HH BODY:", getattr(response, "text", "")[:500])
            response.raise_for_status()
            data = response.json()
            print("HH ITEMS COUNT:", len(data.get("items", [])))

            items = []
            for item in data.get("items", []):
                salary = item.get("salary") or {}
                salary_from = salary.get("from")
                salary_to = salary.get("to")
                currency = salary.get("currency")
                if currency != "RUR" or not salary_from:
                    continue

                items.append(
                    {
                        "id": int(item["id"]),
                        "title": item["name"],
                        "company": item.get("employer", {}).get("name", "Не указано"),
                        "salary": salary_from,
                        "salaryTo": salary_to,
                        "currency": currency,
                        "url": item.get("alternate_url"),
                    }
                )

            return {"items": items, "source": "hh"}
        except requests.Timeout:
            if attempt < max_retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            if settings.HH_ENABLE_FALLBACK:
                return _fallback_response(title, company, min_salary, "hh.ru не ответил вовремя")
            raise HHServiceError("Внешний API hh.ru не ответил вовремя")
        except requests.HTTPError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            if attempt < max_retries and status_code and status_code >= 500:
                time.sleep(0.5 * (attempt + 1))
                continue
            if settings.HH_ENABLE_FALLBACK:
                return _fallback_response(
                    title,
                    company,
                    min_salary,
                    f"hh.ru вернул HTTP {status_code}, показаны демо-данные",
                )
            if status_code == 403:
                raise HHServiceError("hh.ru отклонил запрос (403). Проверьте VPN/прокси и доступ к API.")
            raise HHServiceError(f"hh.ru вернул ошибку HTTP {status_code}")
        except requests.RequestException:
            if attempt < max_retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            if settings.HH_ENABLE_FALLBACK:
                return _fallback_response(
                    title,
                    company,
                    min_salary,
                    "Ошибка сети при обращении к hh.ru, показаны демо-данные",
                )
            raise HHServiceError("Ошибка сетевого обращения к hh.ru. Проверьте интернет и proxy.")
