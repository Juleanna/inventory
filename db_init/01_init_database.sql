-- Ініціалізація бази даних inventory_db
-- Цей скрипт виконується автоматично при першому запуску PostgreSQL контейнера

-- Перевіряємо чи база даних вже існує
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'inventory_db') THEN
        -- База даних створюється автоматично через змінну POSTGRES_DB
        -- Але ми можемо додати додаткові налаштування тут
        RAISE NOTICE 'База даних inventory_db готова до використання';
    ELSE
        RAISE NOTICE 'База даних inventory_db вже існує';
    END IF;
END $$;

-- Додаткові налаштування для бази даних
-- Встановлюємо часовий пояс
SET timezone = 'Europe/Kiev';

-- Створюємо розширення для UUID (якщо потрібно)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Створюємо розширення для повнотекстового пошуку (якщо потрібно)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Встановлюємо права доступу
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO postgres;