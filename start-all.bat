@echo off
chcp 65001 >nul
title IT Inventory - Запуск проекту
echo ========================================
echo   IT Inventory - Запуск всього проекту
echo ========================================
echo.
echo Запуск Backend (Django) та Frontend (React)...
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

start "IT Inventory - Backend" cmd /k ""%ROOT%\start-backend.bat""
timeout /t 3 /nobreak >nul
start "IT Inventory - Frontend" cmd /k ""%ROOT%\start-frontend.bat""

echo.
echo Сервери запущено у окремих вiкнах:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
pause
