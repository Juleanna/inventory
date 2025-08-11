#!/bin/bash
set -e

# Функція для очікування готовності PostgreSQL
wait_for_postgres() {
    echo "Очікуємо готовності PostgreSQL..."
    until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
        echo "PostgreSQL ще не готовий - очікуємо..."
        sleep 1
    done
    echo "PostgreSQL готовий!"
}

# Функція для очікування готовності Redis
wait_for_redis() {
    echo "Очікуємо готовності Redis..."
    until python -c "import redis; r=redis.Redis(host='redis', port=6379, db=0); r.ping()" 2>/dev/null; do
        echo "Redis ще не готовий - очікуємо..."
        sleep 1
    done
    echo "Redis готовий!"
}

cd /app/inventory_project

# Встановлюємо Django налаштування для Docker
export DJANGO_SETTINGS_MODULE=inventory_project.settings_docker

# Очікуємо готовності баз даних
if [ "$DB_HOST" ]; then
    wait_for_postgres
fi

if [ "$REDIS_URL" ]; then
    wait_for_redis
fi

# Застосовуємо міграції
echo "Застосовуємо міграції..."
python manage.py migrate --noinput

# Збираємо статичні файли
echo "Збираємо статичні файли..."
python manage.py collectstatic --noinput --clear

# Створюємо суперкористувача, якщо він не існує
if [ "$DJANGO_SUPERUSER_EMAIL" ] && [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Створюємо суперкористувача..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Суперкористувача створено!')
else:
    print('Суперкористувач вже існує')
"
fi

# Запускаємо команду
exec "$@"