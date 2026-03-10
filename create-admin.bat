@echo off
chcp 65001 >nul
title IT Inventory - Створення адмiнiстратора
echo ========================================
echo   Створення облiкового запису адмiна
echo ========================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

if exist "%ROOT%\venv\Scripts\activate.bat" (
    call "%ROOT%\venv\Scripts\activate.bat"
)

cd /d "%ROOT%\inventory_project"
python manage.py createsuperuser
pause
