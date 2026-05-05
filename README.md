# Webinar Platform MVP

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

## Данные администратора

Локальные значения берутся из `.env`.

- Email: `admin@example.com`
- Password: значение `ADMIN_PASSWORD` из `.env`

Перед публикацией поменяйте `SECRET_KEY` и `ADMIN_PASSWORD` в `.env`.

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
- Broadcast room для админа.
- Таймлайн событий для автовебинаров.
- Офферы, баннеры и редиректы.
- Аналитика и Excel-экспорт участников.
- Онлайн-курсы: курсы, модули, видео/текстовые уроки, ученики, прогресс, Excel-экспорт.

## Разработка без Docker

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

```bash
cd frontend
npm ci
npm run dev
```
