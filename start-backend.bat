@echo off
chcp 65001 >nul
title IT Inventory - Backend (Django)
echo ========================================
echo   IT Inventory - Запуск Backend
echo ========================================
echo.

cd /d "%~dp0inventory_project"

echo [1/2] Застосування мiграцiй...
python manage.py migrate --no-input
echo.

echo [2/2] Запуск Django сервера на порту 8000...
echo Backend доступний за адресою: http://localhost:8000
echo Адмiн-панель: http://localhost:8000/admin/
echo.
python manage.py runserver 0.0.0.0:8000
pause
