@echo off
chcp 65001 >nul
title IT Inventory - Frontend (React)
echo ========================================
echo   IT Inventory - Запуск Frontend
echo ========================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%\frontend"

if not exist "node_modules" (
    echo Встановлення залежностей...
    call npm install
    echo.
)

echo Запуск React dev-сервера на порту 3000...
echo Frontend доступний за адресою: http://localhost:3000
echo.
call npm run dev
pause
