@echo off
chcp 65001 >nul

echo.
echo =====================================================
echo    Ініціалізація Inventory Management System
echo =====================================================
echo.

REM Перевірка Docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ПОМИЛКА] Docker не запущений!
    echo Будь ласка, запустіть Docker Desktop і спробуйте знову.
    pause
    exit /b 1
)

echo [КРОК 1] Зупиняємо існуючі контейнери...
docker-compose down

echo.
echo [КРОК 2] Створюємо необхідні директорії...
if not exist "logs" mkdir logs
if not exist "media" mkdir media  
if not exist "staticfiles" mkdir staticfiles

echo.
echo [КРОК 3] Налаштування середовища...
if not exist ".env" (
    copy ".env.docker" ".env"
    echo [УВАГА] Файл .env створений. Змініть паролі для продакшену!
) else (
    echo Файл .env вже існує
)

echo.
echo [КРОК 4] Будуємо Docker образи... (це може зайняти кілька хвилин)
docker-compose build --no-cache

echo.
echo [КРОК 5] Запускаємо базу даних та Redis...
docker-compose up -d db redis

echo.
echo [КРОК 6] Очікуємо готовності бази даних...
timeout /t 15 /nobreak >nul

echo.
echo [КРОК 7] Застосовуємо міграції бази даних...
docker-compose run --rm web python manage.py migrate

echo.
echo [КРОК 8] Створюємо адміністратора...
docker-compose run --rm web python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@inventory.local', 'securepassword123') if not User.objects.filter(username='admin').exists() else print('Адміністратор вже існує')"

echo.
echo [КРОК 9] Збираємо статичні файли...
docker-compose run --rm web python manage.py collectstatic --noinput

echo.
echo [КРОК 10] Запускаємо всі сервіси...
docker-compose up -d

echo.
echo =====================================================
echo           ІНІЦІАЛІЗАЦІЯ ЗАВЕРШЕНА!
echo =====================================================
echo.
echo Веб-додаток:      http://localhost:8000
echo Адмін-панель:     http://localhost:8000/admin  
echo Логін:            admin
echo Пароль:           securepassword123
echo.
echo =====================================================
echo              КОРИСНІ КОМАНДИ
echo =====================================================
echo.
echo Переглянути логи:    docker-compose logs -f
echo Зупинити сервіси:    docker-compose down
echo Статус контейнерів:  docker-compose ps
echo.

echo [СТАТУС] Перевірка контейнерів...
docker-compose ps

echo.
echo [УВАГА] Обов'язково змініть паролі в продакшені!
echo.
pause