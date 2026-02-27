@echo off
chcp 65001 >nul
title IT Inventory - Встановлення
echo ========================================
echo   IT Inventory - Встановлення залежностей
echo ========================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo [1/5] Встановлення Python залежностей...
pip install -r "%ROOT%\requirements.txt"
if errorlevel 1 (
    echo.
    echo ПОМИЛКА: Не вдалося встановити Python залежностi!
    echo Перевiрте що Python та pip встановленi та доступнi в PATH.
    pause
    exit /b 1
)
echo.

echo [2/5] Встановлення Node.js залежностей...
cd /d "%ROOT%\frontend"
if errorlevel 1 (
    echo ПОМИЛКА: Папка frontend не знайдена!
    pause
    exit /b 1
)
call npm install
if errorlevel 1 (
    echo.
    echo ПОМИЛКА: Не вдалося встановити Node.js залежностi!
    echo Перевiрте що Node.js та npm встановленi та доступнi в PATH.
    pause
    exit /b 1
)
echo.

echo [3/5] Створення бази даних PostgreSQL (якщо не iснує)...
for /f "tokens=*" %%a in ('python -c "from decouple import config; print(config('DB_NAME', default='inventory_db'))" 2^>nul') do set "DB_NAME=%%a"
for /f "tokens=*" %%a in ('python -c "from decouple import config; print(config('DB_USER', default='postgres'))" 2^>nul') do set "DB_USER=%%a"
for /f "tokens=*" %%a in ('python -c "from decouple import config; print(config('DB_PASSWORD', default=''))" 2^>nul') do set "DB_PASSWORD=%%a"
for /f "tokens=*" %%a in ('python -c "from decouple import config; print(config('DB_HOST', default='localhost'))" 2^>nul') do set "DB_HOST=%%a"
for /f "tokens=*" %%a in ('python -c "from decouple import config; print(config('DB_PORT', default='5432'))" 2^>nul') do set "DB_PORT=%%a"

if "%DB_NAME%"=="" set "DB_NAME=inventory_db"
if "%DB_USER%"=="" set "DB_USER=postgres"
if "%DB_HOST%"=="" set "DB_HOST=localhost"
if "%DB_PORT%"=="" set "DB_PORT=5432"

set "PGPASSWORD=%DB_PASSWORD%"
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -tc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" 2>nul | findstr "1" >nul
if errorlevel 1 (
    echo   База даних "%DB_NAME%" не знайдена, створюю...
    psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE %DB_NAME% ENCODING 'UTF8'" 2>nul
    if errorlevel 1 (
        echo   УВАГА: Не вдалося створити базу автоматично.
        echo   Створiть базу вручну: CREATE DATABASE %DB_NAME%;
    ) else (
        echo   База даних "%DB_NAME%" створена успiшно!
    )
) else (
    echo   База даних "%DB_NAME%" вже iснує.
)
set "PGPASSWORD="
echo.

echo [4/5] Застосування мiграцiй...
cd /d "%ROOT%\inventory_project"
python manage.py makemigrations
python manage.py migrate
echo.

echo [5/5] Готово!
echo.
echo Для створення адмiнiстратора запустiть: create-admin.bat
echo Для запуску проекту запустiть: start-all.bat
echo.
pause
