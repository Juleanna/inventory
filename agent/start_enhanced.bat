@echo off
echo ==================================================
echo     Покращений Агент Інвентаризації v3.0
echo ==================================================

REM Перевірка Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ПОМИЛКА: Python не встановлено або недоступний
    echo Завантажте та встановіть Python з https://python.org
    pause
    exit /b 1
)

REM Перевірка файлу конфігурації
if not exist ".env.enhanced" (
    echo УВАГА: Файл .env.enhanced не знайдено
    echo Копіюю приклад конфігурації...
    copy ".env.enhanced.example" ".env.enhanced"
    echo.
    echo ВАЖЛИВО: Відредагуйте файл .env.enhanced з вашими налаштуваннями
    echo Натисніть будь-яку клавішу для продовження або Ctrl+C для виходу
    pause
)

REM Встановлення залежностей
echo Встановлення залежностей...
pip install -r requirements_enhanced.txt

if errorlevel 1 (
    echo ПОМИЛКА: Не вдалося встановити залежності
    pause
    exit /b 1
)

echo.
echo Запуск покращеного агента...
echo Для зупинки натисніть Ctrl+C
echo.

REM Запуск агента
python enhanced_agent.py

pause