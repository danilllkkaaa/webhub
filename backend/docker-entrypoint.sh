#!/bin/sh
set -e

python -m app.db_bootstrap
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
