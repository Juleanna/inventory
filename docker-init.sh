#!/bin/bash

# Скрипт для ініціалізації та запуску проекту в Docker
# Використання: ./docker-init.sh

echo "🚀 Ініціалізація Inventory Management System в Docker..."

# Перевіряємо чи Docker запущений
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker не запущений. Будь ласка, запустіть Docker і спробуйте знову."
    exit 1
fi

# Зупиняємо всі контейнери, якщо вони працюють
echo "🛑 Зупиняємо існуючі контейнери..."
docker-compose down

# Видаляємо старі образи (опціонально)
read -p "Чи хочете видалити старі образи? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Видаляємо старі образи..."
    docker-compose down --rmi all --volumes --remove-orphans
fi

# Створюємо необхідні директорії
echo "📁 Створюємо директорії..."
mkdir -p logs
mkdir -p media
mkdir -p staticfiles

# Копіюємо файл середовища
if [ ! -f .env ]; then
    echo "📋 Копіюємо налаштування середовища..."
    cp .env.docker .env
    echo "⚠️  ВАЖЛИВО: Відредагуйте файл .env та змініть паролі та секретні ключі!"
fi

# Будуємо образи
echo "🔨 Будуємо Docker образи..."
docker-compose build --no-cache

# Запускаємо тільки базу даних та Redis для міграцій
echo "🗄️  Запускаємо базу даних та Redis..."
docker-compose up -d db redis

# Чекаємо готовності бази даних
echo "⏳ Очікуємо готовності бази даних..."
sleep 10

# Застосовуємо міграції
echo "🔄 Застосовуємо міграції..."
docker-compose run --rm web python manage.py migrate

# Створюємо суперкористувача
echo "👤 Створюємо суперкористувача..."
docker-compose run --rm web python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@inventory.local', 'securepassword123')
    print('Суперкористувача створено: admin / securepassword123')
else:
    print('Суперкористувач вже існує')
"

# Збираємо статичні файли
echo "📦 Збираємо статичні файли..."
docker-compose run --rm web python manage.py collectstatic --noinput

# Запускаємо всі сервіси
echo "🚀 Запускаємо всі сервіси..."
docker-compose up -d

echo "✅ Ініціалізація завершена!"
echo ""
echo "🌐 Додаток доступний за адресою: http://localhost:8000"
echo "🔐 Адміністрування: http://localhost:8000/admin"
echo "👤 Логін: admin"
echo "🔑 Пароль: securepassword123"
echo ""
echo "📊 Для перегляду логів: docker-compose logs -f"
echo "🛑 Для зупинки: docker-compose down"
echo ""
echo "⚠️  Не забудьте змінити паролі в продакшені!"

# Показуємо статус контейнерів
echo "📋 Статус контейнерів:"
docker-compose ps