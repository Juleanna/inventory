# Використовуємо офіційний Python образ як базовий
FROM python:3.11-slim

# Встановлюємо змінні середовища
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Встановлюємо системні залежності
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
        gettext \
        curl \
        && rm -rf /var/lib/apt/lists/*

# Створюємо робочу директорію
WORKDIR /app

# Створюємо директорію для логів
RUN mkdir -p /app/logs

# Копіюємо файли залежностей
COPY requirements.txt /app/
COPY requirements-dev.txt /app/

# Встановлюємо Python залежності
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r requirements-dev.txt

# Копіюємо код проекту
COPY . /app/

# Створюємо користувача для безпеки
RUN groupadd -r django && useradd -r -g django django

# Встановлюємо права на директорії
RUN chown -R django:django /app
RUN chmod +x /app/entrypoint.sh
RUN chmod 755 /app/logs
RUN mkdir -p /app/staticfiles && chown django:django /app/staticfiles
RUN mkdir -p /app/media && chown django:django /app/media

# Переключаємося на непривілейованого користувача
USER django

# Відкриваємо порт
EXPOSE 8000

# Команда запуску
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "inventory_project.wsgi:application"]