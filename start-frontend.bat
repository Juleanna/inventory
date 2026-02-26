@echo off
chcp 65001 >nul
title IT Inventory - Frontend (React)
echo ========================================
echo   IT Inventory - Запуск Frontend
echo ========================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [1/2] Встановлення залежностей...
    npm install
    echo.
)

echo Запуск React dev-сервера на порту 3000...
echo Frontend доступний за адресою: http://localhost:3000
echo.
npm run dev
pause
