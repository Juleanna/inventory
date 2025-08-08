# 🐳 Docker налаштування для Inventory Management System

## 🚀 Швидкий старт

### Варіант 1: PowerShell (рекомендується для Windows)
```powershell
PowerShell -ExecutionPolicy Bypass -File docker-init.ps1
```

### Варіант 2: Українська версія Batch
```cmd
docker-init-ua.bat
```

### Варіант 3: Англійська версія Batch  
```cmd
docker-init.bat
```

### Варіант 4: Ручна ініціалізація
```bash
# 1. Скопіювати налаштування
copy .env.docker .env

# 2. Запустити сервіси
docker-compose up -d

# 3. Застосувати міграції  
docker-compose exec web python manage.py migrate

# 4. Створити суперкористувача
docker-compose exec web python manage.py createsuperuser
```

## 🌐 Доступ до системи

После успішного запуску:

- **Веб-додаток**: http://localhost:8000
- **Адмін-панель**: http://localhost:8000/admin  
- **Логін**: admin
- **Пароль**: securepassword123

## 📊 Сервіси що запускаються

| Сервіс | Опис | Порт |
|--------|------|------|
| web | Django додаток | 8000 |
| db | PostgreSQL база даних | 5432 |
| redis | Redis кеш і черги | 6379 |
| celery_worker | Фонові задачі | - |
| celery_beat | Планові задачі | - |

## 🔧 Основні команди

### Управління контейнерами
```bash
# Запустити все
docker-compose up -d

# Зупинити все
docker-compose down

# Перезапустити конкретний сервіс
docker-compose restart web

# Переглянути статус
docker-compose ps
```

### Перегляд логів
```bash
# Всі логи
docker-compose logs -f

# Логи конкретного сервіса
docker-compose logs -f web
docker-compose logs -f db
docker-compose logs -f celery_worker
```

### Django команди
```bash
# Міграції
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py makemigrations

# Django shell
docker-compose exec web python manage.py shell

# Створити суперкористувача
docker-compose exec web python manage.py createsuperuser

# Збирати статику
docker-compose exec web python manage.py collectstatic
```

### Робота з базою даних
```bash
# Підключитись до PostgreSQL
docker-compose exec db psql -U postgres -d inventory_db

# Backup БД
docker-compose exec db pg_dump -U postgres inventory_db > backup.sql

# Відновити з backup
docker-compose exec -T db psql -U postgres inventory_db < backup.sql
```

## ⚡ Швидке відновлення

Якщо щось пішло не так:

```bash
# Повне очищення та перезапуск
docker-compose down -v
docker-compose build --no-cache  
docker-compose up -d

# Заново застосувати міграції
docker-compose exec web python manage.py migrate
```

## 🔐 Безпека

### Обов'язково змініть перед продакшеном:

1. **Паролі в .env файлі**:
   - `DB_PASSWORD` - пароль PostgreSQL
   - `SECRET_KEY` - Django секретний ключ
   - Логін/пароль суперкористувача

2. **Email налаштування**:
   - `EMAIL_HOST_USER` - ваш email
   - `EMAIL_HOST_PASSWORD` - пароль додатку

3. **Налаштування безпеки**:
   - `DEBUG=False` для продакшену
   - `ALLOWED_HOSTS` - дозволені домени

## 🛠️ Налагодження проблем

### Docker не запускається
- Переконайтесь що Docker Desktop запущений
- Перевірте чи достатньо пам'яті (мінімум 4GB)

### Помилки з кодуванням в Windows
- Використовуйте PowerShell версію: `docker-init.ps1`
- Або англійську версію: `docker-init.bat`

### Порти зайняті
```bash
# Перевірити які порти зайняті
netstat -an | findstr :8000
netstat -an | findstr :5432
netstat -an | findstr :6379

# Змінити порти в docker-compose.yml якщо потрібно
```

### База даних не доступна
```bash
# Перевірити здоров'я PostgreSQL
docker-compose exec db pg_isready -U postgres

# Переглянути логи БД
docker-compose logs db
```

## 📁 Структура файлів Docker

```
inventory/
├── Dockerfile              # Образ Django додатку
├── docker-compose.yml      # Оркестрація сервісів  
├── entrypoint.sh           # Скрипт ініціалізації
├── .env.docker            # Налаштування для Docker
├── .dockerignore          # Ігнорувані файли
├── docker-init.ps1        # PowerShell ініціалізація
├── docker-init-ua.bat     # Українська Batch версія
├── docker-init.bat        # Англійська Batch версія  
├── docker-commands.md     # Повний довідник команд
└── db_init/               # Скрипти ініціалізації БД
    └── 01_init_database.sql
```

## 🎯 Продакшен розгортання

Для продакшену додатково:

1. Використовуйте nginx для статичних файлів
2. Налаштуйте HTTPS сертифікати
3. Створіть автоматичні бекапи
4. Налаштуйте моніторинг (Sentry, Prometheus)
5. Використовуйте Docker Swarm або Kubernetes

```bash
# Запуск з nginx (продакшен)
docker-compose --profile production up -d
```

## 📞 Підтримка

Якщо виникли проблеми:

1. Перевірте логи: `docker-compose logs -f`
2. Перегляньте статус: `docker-compose ps`  
3. Спробуйте перезапуск: `docker-compose restart`
4. Повне відновлення: `docker-compose down -v && docker-compose up -d`

Успішної роботи з вашою системою інвентаризації! 🎉