# StudentHub MVP

Платформа для вебинаров, автовебинаров и онлайн-курсов на базе YouTube.

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d --build
```

Откройте:

- Frontend: http://localhost
- Admin: http://localhost/admin
- API docs: http://localhost/api/docs

## Проверка после изменений

Минимальная проверка сборки и запуска:

```powershell
cd frontend
npm run build
cd ..
docker compose up -d --build
docker compose exec -T backend python -m compileall app
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\auth-smoke.ps1
```

Для проверки публичного туннеля или другого адреса:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -BaseUrl "https://your-public-url.example"
```

Если нужно проверить только HTTP-роуты без Docker Compose:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -SkipDocker
```

## Администратор

Локальные значения берутся из `.env`.

- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

Перед публикацией поменяйте `SECRET_KEY` и `ADMIN_PASSWORD` в `.env`.

## Восстановление пароля

Backend уже имеет endpoints для запроса и применения reset token:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

До подключения email-провайдера локальная разработка может показывать dev reset link при `EXPOSE_PASSWORD_RESET_TOKEN=true`.
В production держите:

```env
EXPOSE_PASSWORD_RESET_TOKEN=false
```

## Миграции базы

Схема базы управляется Alembic. В Docker миграции применяются автоматически перед стартом backend.

Ручной запуск внутри backend-контейнера:

```bash
docker compose exec backend alembic upgrade head
```

Создание новой миграции после изменения моделей:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe change"
docker compose exec backend alembic upgrade head
```

## Стек

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy async + Pydantic v2
- DB: PostgreSQL 16
- Realtime: WebSocket
- Infra: Docker Compose + Nginx

## Возможности

- Админ-логин по JWT.
- Проекты.
- CRUD вебинаров.
- Invite-ссылки для зрителей.
- Страница просмотра с YouTube player.
- Блокировка кликов по YouTube iframe для зрителя.
- Live chat через WebSocket.
- Broadcast room для администратора.
- Таймлайн событий для автовебинаров.
- Офферы, баннеры и редиректы.
- Аналитика и Excel-экспорт участников.
- Онлайн-курсы: курсы, модули, видео/текстовые уроки, ученики, прогресс, Excel-экспорт.

## Разработка без Docker

Backend:

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```
