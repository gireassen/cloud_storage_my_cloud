#!/bin/sh
set -e

echo "Waiting for db..."
python - <<'PY'
import time, os, psycopg2
for i in range(60):
    try:
        psycopg2.connect(
            dbname=os.getenv("POSTGRES_DB","mycloud"),
            user=os.getenv("POSTGRES_USER","mycloud"),
            password=os.getenv("POSTGRES_PASSWORD","password"),
            host=os.getenv("POSTGRES_HOST","db"),
            port=os.getenv("POSTGRES_PORT","5432"),
        )
        print("DB is up")
        break
    except Exception as e:
        print("DB not ready, retrying...", e)
        time.sleep(2)
else:
    raise SystemExit("DB not available")
PY

python manage.py makemigrations --noinput
python manage.py migrate --noinput

if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput --username "$DJANGO_SUPERUSER_USERNAME" --email "${DJANGO_SUPERUSER_EMAIL:-admin@example.com}" || true
fi

python manage.py runserver 0.0.0.0:8000
