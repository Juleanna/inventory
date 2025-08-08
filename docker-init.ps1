# PowerShell скрипт для ініціалізації Docker
# Використання: PowerShell -ExecutionPolicy Bypass -File docker-init.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "    Ініціалізація Inventory Management System       " -ForegroundColor Cyan  
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Перевірка Docker
try {
    $null = docker info 2>$null
    Write-Host "[✓] Docker запущений" -ForegroundColor Green
} catch {
    Write-Host "[❌] Помилка: Docker не запущений!" -ForegroundColor Red
    Write-Host "Будь ласка, запустіть Docker Desktop і спробуйте знову." -ForegroundColor Yellow
    Read-Host "Натисніть Enter для виходу"
    exit 1
}

Write-Host ""
Write-Host "[КРОК 1] 🛑 Зупиняємо існуючі контейнери..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "[КРОК 2] 📁 Створюємо необхідні директорії..." -ForegroundColor Yellow
@("logs", "media", "staticfiles") | ForEach-Object {
    if (!(Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ | Out-Null
        Write-Host "  Створена директорія: $_" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[КРОК 3] 📋 Налаштування середовища..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.docker" ".env"
    Write-Host "  [⚠️] Файл .env створений. Змініть паролі для продакшену!" -ForegroundColor Yellow
} else {
    Write-Host "  Файл .env вже існує" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[КРОК 4] 🔨 Будуємо Docker образи... (це може зайняти кілька хвилин)" -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host ""
Write-Host "[КРОК 5] 🗄️ Запускаємо базу даних та Redis..." -ForegroundColor Yellow
docker-compose up -d db redis

Write-Host ""
Write-Host "[КРОК 6] ⏳ Очікуємо готовності бази даних..." -ForegroundColor Yellow
for ($i = 15; $i -gt 0; $i--) {
    Write-Host "  Залишилось секунд: $i" -NoNewline -ForegroundColor Gray
    Start-Sleep 1
    Write-Host "`r" -NoNewline
}
Write-Host "  Готово!                    " -ForegroundColor Green

Write-Host ""
Write-Host "[КРОК 7] 🔄 Застосовуємо міграції бази даних..." -ForegroundColor Yellow
docker-compose run --rm web python manage.py migrate

Write-Host ""
Write-Host "[КРОК 8] 👤 Створюємо адміністратора..." -ForegroundColor Yellow
$createUserScript = "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@inventory.local', 'securepassword123') if not User.objects.filter(username='admin').exists() else print('Адміністратор вже існує')"
docker-compose run --rm web python manage.py shell -c $createUserScript

Write-Host ""
Write-Host "[КРОК 9] 📦 Збираємо статичні файли..." -ForegroundColor Yellow
docker-compose run --rm web python manage.py collectstatic --noinput

Write-Host ""
Write-Host "[КРОК 10] 🚀 Запускаємо всі сервіси..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "           ✅ ІНІЦІАЛІЗАЦІЯ ЗАВЕРШЕНА!              " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Веб-додаток:      " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "🔐 Адмін-панель:     " -NoNewline -ForegroundColor White  
Write-Host "http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host "👤 Логін:            " -NoNewline -ForegroundColor White
Write-Host "admin" -ForegroundColor Green
Write-Host "🔑 Пароль:           " -NoNewline -ForegroundColor White
Write-Host "securepassword123" -ForegroundColor Green
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "              📋 КОРИСНІ КОМАНДИ                    " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Переглянути логи:    " -NoNewline -ForegroundColor White
Write-Host "docker-compose logs -f" -ForegroundColor Yellow
Write-Host "🛑 Зупинити сервіси:    " -NoNewline -ForegroundColor White
Write-Host "docker-compose down" -ForegroundColor Yellow
Write-Host "📋 Статус контейнерів:  " -NoNewline -ForegroundColor White
Write-Host "docker-compose ps" -ForegroundColor Yellow
Write-Host ""

Write-Host "[СТАТУС] Перевірка контейнерів..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "⚠️  [УВАГА] Обов'язково змініть паролі в продакшені!" -ForegroundColor Red
Write-Host ""
Read-Host "Натисніть Enter для завершення"