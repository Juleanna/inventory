# Корисні Docker команди для Inventory Management System

## Основні команди

### Початкова ініціалізація
```bash
# Windows
docker-init.bat

# Linux/Mac
chmod +x docker-init.sh
./docker-init.sh
```

### Запуск та зупинка
```bash
# Запустити всі сервіси
docker-compose up -d

# Зупинити всі сервіси
docker-compose down

# Перезапустити конкретний сервіс
docker-compose restart web

# Зупинити з видаленням томів
docker-compose down -v
```

### Моніторинг
```bash
# Переглянути логи всіх сервісів
docker-compose logs -f

# Переглянути логи конкретного сервіса
docker-compose logs -f web
docker-compose logs -f db
docker-compose logs -f celery_worker

# Статус контейнерів
docker-compose ps

# Використання ресурсів
docker stats
```

### Робота з базою даних
```bash
# Застосувати міграції
docker-compose exec web python manage.py migrate

# Створити міграції
docker-compose exec web python manage.py makemigrations

# Підключитись до PostgreSQL
docker-compose exec db psql -U postgres -d inventory_db

# Backup бази даних
docker-compose exec db pg_dump -U postgres inventory_db > backup.sql

# Відновлення з backup
docker-compose exec -T db psql -U postgres inventory_db < backup.sql
```

### Django команди
```bash
# Створити суперкористувача
docker-compose exec web python manage.py createsuperuser

# Django shell
docker-compose exec web python manage.py shell

# Збирати статичні файли
docker-compose exec web python manage.py collectstatic --noinput

# Очистити кеш
docker-compose exec web python manage.py clear_cache
```

### Celery команди
```bash
# Перезапустити Celery worker
docker-compose restart celery_worker

# Перезапустити Celery beat
docker-compose restart celery_beat

# Переглянути черги Celery
docker-compose exec web celery -A inventory_project inspect active

# Очистити черги Celery
docker-compose exec web celery -A inventory_project purge
```

### Дебаг та розробка
```bash
# Підключитись до контейнера
docker-compose exec web bash

# Переглянути змінні середовища
docker-compose exec web env

# Перевірити здоров'я сервісів
docker-compose exec web curl http://localhost:8000/admin/login/
docker-compose exec redis redis-cli ping
docker-compose exec db pg_isready -U postgres
```

### Очищення
```bash
# Видалити всі контейнери та образи
docker-compose down --rmi all --volumes --remove-orphans

# Очистити невикористовувані образи
docker image prune -a

# Очистити всі невикористовувані ресурси
docker system prune -a --volumes
```

## Налагодження проблем

### Якщо контейнери не запускаються
```bash
# Перевірити логи
docker-compose logs

# Перебудувати без кешу
docker-compose build --no-cache

# Перевірити порти
netstat -an | grep :8000
netstat -an | grep :5432
```

### Якщо проблеми з базою даних
```bash
# Перевірити з'єднання з БД
docker-compose exec web python -c "
import django
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'inventory_project.settings'
django.setup()
from django.db import connection
print('DB connection:', connection.ensure_connection())
"
```

### Якщо проблеми з Redis
```bash
# Перевірити Redis
docker-compose exec redis redis-cli ping

# Перевірити з'єднання з Django
docker-compose exec web python -c "
import redis
r = redis.from_url('redis://redis:6379/0')
print('Redis ping:', r.ping())
"
```

## Продакшен розгортання

### Додаткові налаштування для продакшену
1. Змініть `DEBUG=False` в .env
2. Встановіть безпечні паролі
3. Налаштуйте HTTPS
4. Використайте nginx для статичних файлів
5. Налаштуйте моніторинг та бекапи

### Запуск з nginx
```bash
# Запустити з nginx профілем
docker-compose --profile production up -d
```