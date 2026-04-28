# Тестовая модель MVP (RU)

## 1. Критические пользовательские сценарии
- Гость открывает главную страницу и получает вакансии из внешнего API.
- Пользователь регистрируется, входит, восстанавливает сессию через refresh-token, выходит.
- Пользователь управляет своими вакансиями: `create/read/update/delete`.
- Пользователь применяет фильтры, сортировку и пагинацию в кабинете.
- Пользователь загружает/просматривает/удаляет файлы вакансии.
- Администратор получает список пользователей и меняет роли.
- Система корректно обрабатывает отказ внешнего API и ошибки сервера.

## 2. Ключевые бизнес-правила и ограничения
- Доступ к кабинету и внутренним API только для аутентифицированных пользователей.
- Роль `user` работает только со своими вакансиями, `admin` имеет расширенный доступ.
- Валидация вакансии:
  - `title`, `company`: 2..120 символов.
  - `salary`: `0..10_000_000`.
  - `status`: `draft|published|archived`.
  - `min_salary <= max_salary`.
- Ограничения файлов:
  - MIME: `application/pdf`, `image/png`, `image/jpeg`.
  - Размер: не более `MAX_FILE_SIZE`.
- Внешний API `hh.ru` имеет retry/timeout логику и маппится в `502` при отказе.

## 3. Области повышенного риска
- Аутентификация: cookie-токены, refresh flow, истечение сессии.
- Роли/права: проверки `403` для неадминистраторов и доступа к чужим данным.
- Работа с файлами: валидация MIME/размера, presigned URL, удаление из S3.
- Интеграции API: нестабильность внешнего сервиса, сетевые таймауты, ошибки upstream.

## 4. Реализованное покрытие тестами

### Backend (`pytest`)
- Unit:
  - `tests/unit/test_auth_service.py`
  - `tests/unit/test_hh_service.py`
  - `tests/unit/test_rbac.py`
- Integration:
  - `tests/integration/test_auth_endpoints.py`
  - `tests/integration/test_vacancies_endpoints.py`
  - `tests/integration/test_external_endpoints.py`
- Покрыто:
  - коды ответа и структура ключевых payload;
  - валидация и граничные случаи;
  - RBAC и cookie-auth;
  - файлы (upload/list/download-url/delete) с мокированным S3.

### Frontend (`vitest + testing-library`)
- Unit/Component/Scenario:
  - `src/pages/__tests__/LoginPage.test.tsx`
  - `src/components/__tests__/ProtectedRoute.test.tsx`
  - `src/components/__tests__/VacanciesManager.test.tsx`
  - `src/contexts/__tests__/AuthContext.test.tsx`
- Покрыто:
  - формы и callbacks;
  - защита маршрутов и ролевое поведение;
  - состояния загрузки/ошибок;
  - восстановление сессии через refresh.

### E2E (`playwright`)
- `e2e/auth-session.spec.ts`
- `e2e/crud-by-role.spec.ts`
- `e2e/filters-pagination.spec.ts`
- `e2e/files-and-external-api.spec.ts`
- Покрыто:
  - вход/выход/восстановление сессии;
  - CRUD-сценарии;
  - фильтрация/сортировка/пагинация;
  - работа с файлами и внешним API при успехе/ошибке.

## 5. Тестовая инфраструктура
- Backend:
  - отдельная конфигурация через `DATABASE_URL` override;
  - изолированная SQLite-БД `test_app.db`;
  - фикстуры и очистка состояния перед каждым тестом;
  - мок S3 в `conftest.py`.
- Frontend:
  - `VITE_API_URL` через `src/config.ts`;
  - отдельный `setup` для тестов (`alert/confirm/open` mocks);
  - сетевые моки в unit и e2e тестах.

## 6. Метрики качества и правила
- Минимальные пороги:
  - Backend: `--cov-fail-under=75` (см. `backend/pytest.ini`).
  - Frontend (по критичным модулям MVP): `lines/statements >= 60`, `branches >= 55`, `functions >= 25` (см. `frontend/vite.config.ts`).
- Разделение тестов:
  - `unit`, `integration`, `e2e` маркеры (`pytest`).
  - отдельные npm-команды для `unit/coverage/e2e`.
- Нейминг:
  - `test_<поведение>.py`
  - `<Component>.test.tsx`
  - `<scenario>.spec.ts`

## 7. Итоговая проверка (Definition of Done)
- Все ключевые сценарии проходят в автотестах.
- Подтверждены ограничения доступа (`401/403`) и защита данных по ролям.
- Подтверждена корректная реакция на ошибки валидации, S3 и внешнего API.
