# === BACKEND DOCKERFILE ===
# Етап 1: Базовий образ з залежностями
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
        gettext \
        curl \
        libldap2-dev \
        libsasl2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копіюємо та встановлюємо залежності (кешується окремо)
COPY requirements.txt requirements-dev.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    || pip install --no-cache-dir -r requirements.txt --no-deps

# Етап 2: Фінальний образ
FROM base AS final

# Копіюємо код проекту
COPY . /app/

# Створюємо необхідні директорії
RUN mkdir -p /app/logs /app/staticfiles /app/media

# Виправляємо CRLF → LF (Windows Git може додати \r)
RUN sed -i 's/\r$//' /app/entrypoint.sh

# Створюємо непривілейованого користувача
RUN groupadd -r django && useradd -r -g django django \
    && chown -R django:django /app \
    && chmod +x /app/entrypoint.sh \
    && chmod 755 /app/logs

USER django

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "inventory_project.asgi:application"]
