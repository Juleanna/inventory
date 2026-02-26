@echo off
chcp 65001 >nul
title IT Inventory - Запуск проекту
echo ========================================
echo   IT Inventory - Запуск всього проекту
echo ========================================
echo.
echo Запуск Backend (Django) та Frontend (React)...
echo.

start "IT Inventory - Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "IT Inventory - Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Сервери запущено у окремих вiкнах:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo Закрийте це вiкно або натиснiть будь-яку клавiшу.
pause
