import time
import requests
from typing import Optional
from app.core.config import settings


class HHServiceError(Exception):
    pass


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

    for attempt in range(max_retries + 1):
        try:
            response = requests.get(
                settings.HH_API_URL,
                params=params,
                timeout=timeout_seconds,
                headers={"User-Agent": "Joby/1.0"},
            )
            response.raise_for_status()
            data = response.json()

            items = []
            for item in data.get("items", []):
                salary = item.get("salary") or {}
                salary_from = salary.get("from")
                salary_to = salary.get("to")
                currency = salary.get("currency")

                if currency != "RUR" or not salary_from:
                    continue

                items.append({
                    "id": int(item["id"]),
                    "title": item["name"],
                    "company": item.get("employer", {}).get("name", "Не указано"),
                    "salary": salary_from,
                    "salaryTo": salary_to,
                    "currency": currency,
                    "url": item.get("alternate_url"),
                })

            return {"items": items}

        except requests.Timeout:
            if attempt < max_retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise HHServiceError("Внешний API hh.ru не ответил вовремя")
        except requests.RequestException:
            if attempt < max_retries:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise HHServiceError("Ошибка обращения к hh.ru")