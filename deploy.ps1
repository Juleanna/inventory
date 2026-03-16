# ============================================
# IT Inventory — Ручний деплой на Windows
# ============================================
# Запуск: .\deploy.ps1
# Або з параметрами: .\deploy.ps1 -SkipPull -SkipMigrate

param(
    [switch]$SkipPull,      # Пропустити git pull
    [switch]$SkipMigrate,   # Пропустити міграції
    [switch]$SkipBuild,     # Пропустити збірку (використати готові образи)
    [switch]$Force           # Примусовий перезапуск всіх контейнерів
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IT Inventory — Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Перевірка Docker
try {
    docker info | Out-Null
} catch {
    Write-Host "[ПОМИЛКА] Docker не запущений. Запустіть Docker Desktop." -ForegroundColor Red
    exit 1
}

# Перехід в директорію проекту
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir
Write-Host "[INFO] Директорія: $projectDir" -ForegroundColor Gray

# 1. Git pull
if (-not $SkipPull) {
    Write-Host ""
    Write-Host "[1/6] Оновлення коду з GitHub..." -ForegroundColor Yellow
    git pull origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ПОМИЛКА] git pull не вдався" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Код оновлено" -ForegroundColor Green
} else {
    Write-Host "[1/6] Git pull — пропущено" -ForegroundColor Gray
}

# 2. Перевірка .env
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "[ПОМИЛКА] Файл .env не знайдено!" -ForegroundColor Red
    Write-Host "Скопіюйте .env.example як .env та заповніть значення:" -ForegroundColor Yellow
    Write-Host "  copy .env.example .env" -ForegroundColor White
    exit 1
}

# 3. Збірка або pull образів
Write-Host ""
if ($SkipBuild) {
    Write-Host "[2/6] Завантаження готових образів..." -ForegroundColor Yellow
    docker compose pull
} else {
    Write-Host "[2/6] Збірка Docker-образів..." -ForegroundColor Yellow
    docker compose build --parallel
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ПОМИЛКА] Збірка/завантаження не вдалась" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Образи готові" -ForegroundColor Green

# 4. Запуск контейнерів
Write-Host ""
Write-Host "[3/6] Запуск контейнерів..." -ForegroundColor Yellow
if ($Force) {
    docker compose down
    docker compose up -d
} else {
    docker compose up -d --remove-orphans
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ПОМИЛКА] Запуск контейнерів не вдався" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Контейнери запущені" -ForegroundColor Green

# 5. Міграції
if (-not $SkipMigrate) {
    Write-Host ""
    Write-Host "[4/6] Виконання міграцій БД..." -ForegroundColor Yellow
    # Чекаємо поки БД буде готова
    $retries = 0
    do {
        $retries++
        $healthy = docker compose exec -T db pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Очікування БД... ($retries/10)" -ForegroundColor Gray
            Start-Sleep -Seconds 3
        }
    } while ($LASTEXITCODE -ne 0 -and $retries -lt 10)

    docker compose exec -T web python inventory_project/manage.py migrate --noinput
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ПОМИЛКА] Міграції не вдались" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Міграції виконані" -ForegroundColor Green
} else {
    Write-Host "[4/6] Міграції — пропущено" -ForegroundColor Gray
}

# 6. Статичні файли
Write-Host ""
Write-Host "[5/6] Збір статичних файлів..." -ForegroundColor Yellow
docker compose exec -T web python inventory_project/manage.py collectstatic --noinput 2>$null
Write-Host "[OK] Статичні файли зібрані" -ForegroundColor Green

# 7. Health check
Write-Host ""
Write-Host "[6/6] Перевірка здоров'я..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/api/health/" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Сервер працює!" -ForegroundColor Green
    }
} catch {
    Write-Host "[УВАГА] Health check не пройшов. Перевірте логи:" -ForegroundColor Yellow
    Write-Host "  docker compose logs web --tail 50" -ForegroundColor White
}

# Результат
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Деплой завершено!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Додаток: http://localhost:8081" -ForegroundColor White
Write-Host "  API:     http://localhost:8081/api/" -ForegroundColor White
Write-Host "  Admin:   http://localhost:8081/api/admin/" -ForegroundColor White
Write-Host ""
Write-Host "  Логи:    docker compose logs -f" -ForegroundColor Gray
Write-Host "  Статус:  docker compose ps" -ForegroundColor Gray
Write-Host ""
