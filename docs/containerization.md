# Архитектура контейнеризации

## Сервисы

- `reverse-proxy`: Nginx, единая точка входа на `http://localhost:8080`, проксирует `/api`, `/docs`, `/openapi.json` в backend, остальные маршруты во frontend.
- `frontend`: React/Vite, собирается в статические файлы и отдается внутренним Nginx.
- `backend`: FastAPI/Uvicorn, подключается к Postgres, MinIO и внешнему API HH.
- `db`: PostgreSQL 16 с постоянным томом `postgres-data`.
- `minio`: S3-совместимое хранилище файлов с томом `minio-data`.
- `minio-init`: одноразовый сервис, создает S3 bucket перед запуском backend.

## Сети

- `public`: только `reverse-proxy` и `frontend`.
- `internal`: `reverse-proxy`, `backend`, `db`, `minio`, `minio-init`.
- Наружу публикуются только `HTTP_PORT`, `POSTGRES_PORT` для локальной отладки и порты MinIO. В production порты БД/MinIO можно убрать.

## Запуск

1. Скопируйте `.env.example` в `.env` и замените секреты.
2. Запустите стек:

```bash
docker compose up --build
```

Приложение будет доступно на `http://localhost:8080`, API документация на `http://localhost:8080/docs`, MinIO console на `http://localhost:9001`.

## Устойчивость

- `depends_on.condition` ждет готовности Postgres, MinIO и создания bucket.
- `healthcheck` есть у reverse proxy, frontend, backend, db и minio.
- `restart: unless-stopped` перезапускает долгоживущие сервисы после падений.
- Backend сохраняет режим fallback для HH через `HH_ENABLE_FALLBACK=true`.
- Таблицы создаются при старте FastAPI через текущий `Base.metadata.create_all`. Если появится полноценный Alembic env, миграции стоит вынести в отдельный одноразовый сервис `migrate`.
