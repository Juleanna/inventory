@echo off
echo ========================================
echo   IT Inventory Agent - Встановлення
echo ========================================
echo.

pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ПОМИЛКА: не вдалося встановити залежності
    pause
    exit /b 1
)

if not exist .env (
    copy .env.example .env
    echo.
    echo Створено файл .env з шаблону.
    echo Відкрийте .env та вкажіть адресу сервера, логін і пароль.
)

echo.
echo ========================================
echo   Встановлення завершено!
echo.
echo   Запуск:     python agent.py
echo   Тест:       python agent.py --json
echo   Цикл:       python agent.py --loop
echo ========================================
pause
