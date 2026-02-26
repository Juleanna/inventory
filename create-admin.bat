@echo off
chcp 65001 >nul
title IT Inventory - Створення адмiнiстратора
echo ========================================
echo   Створення облiкового запису адмiна
echo ========================================
echo.

cd /d "%~dp0inventory_project"
python manage.py createsuperuser
pause
