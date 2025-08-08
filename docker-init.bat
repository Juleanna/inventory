@echo off
chcp 65001 >nul
echo 🚀 Initialization Inventory Management System in Docker...

REM Checking if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Stopping existing containers if they are running
echo 🛑 Stopping existing containers...
docker-compose down

REM Creating necessary directories
echo 📁 Creating directories...
if not exist "logs" mkdir logs
if not exist "media" mkdir media
if not exist "staticfiles" mkdir staticfiles

REM Copying environment file
if not exist ".env" (
    echo 📋 Copying environment settings...
    copy ".env.docker" ".env"
    echo ⚠️  IMPORTANT: Edit .env file and change passwords and secret keys!
)

REM Building images
echo 🔨 Building Docker images...
docker-compose build --no-cache

REM Starting only database and Redis for migrations
echo 🗄️  Starting database and Redis...
docker-compose up -d db redis

REM Waiting for database readiness
echo ⏳ Waiting for database readiness...
timeout /t 15 /nobreak >nul

REM Applying migrations
echo 🔄 Applying migrations...
docker-compose run --rm web python manage.py migrate

REM Creating superuser
echo 👤 Creating superuser...
docker-compose run --rm web python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@inventory.local', 'securepassword123') if not User.objects.filter(username='admin').exists() else print('Superuser already exists')"

REM Collecting static files
echo 📦 Collecting static files...
docker-compose run --rm web python manage.py collectstatic --noinput

REM Starting all services
echo 🚀 Starting all services...
docker-compose up -d

echo ✅ Initialization completed!
echo.
echo 🌐 Application available at: http://localhost:8000
echo 🔐 Administration: http://localhost:8000/admin
echo 👤 Login: admin
echo 🔑 Password: securepassword123
echo.
echo 📊 To view logs: docker-compose logs -f
echo 🛑 To stop: docker-compose down
echo.
echo ⚠️  Don't forget to change passwords in production!

REM Showing container status
echo 📋 Container status:
docker-compose ps

pause