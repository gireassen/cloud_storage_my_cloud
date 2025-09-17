FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-myproject.settings} \
    DJANGO_ALLOW_ASYNC_UNSAFE=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash appuser

WORKDIR /code

COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY . /code/

RUN chmod +x /code/entrypoint.sh \
    && chown -R appuser:appuser /code

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl -fsS http://127.0.0.1:8000/healthz || exit 1

CMD ["/code/entrypoint.sh"]
