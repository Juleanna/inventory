@echo off
chcp 65001 >nul
title IT Inventory - Встановлення
echo ========================================
echo   IT Inventory - Встановлення залежностей
echo ========================================
echo.

echo [1/4] Встановлення Python залежностей...
pip install -r "%~dp0requirements.txt"
echo.

echo [2/4] Встановлення Node.js залежностей...
cd /d "%~dp0frontend"
npm install
cd /d "%~dp0"
echo.

echo [3/4] Застосування мiграцiй...
cd /d "%~dp0inventory_project"
python manage.py makemigrations
python manage.py migrate
cd /d "%~dp0"
echo.

echo [4/4] Готово!
echo.
echo Для створення адмiнiстратора запустiть: create-admin.bat
echo Для запуску проекту запустiть: start-all.bat
echo.
pause
