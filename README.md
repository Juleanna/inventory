# 🖥️ Система інвентаризації IT-обладнання

Сучасна система управління IT-активами з автоматичним збором даних та веб-інтерфейсом для адміністрування.

## 🚀 Функції

- ✅ Управління IT-обладнанням
- 🤖 Автоматичний агент збору системної інформації
- 📊 Генерація штрих-кодів та QR-кодів
- 👥 Управління користувачами з ролями
- 📈 Аналітика та звіти
- 🔐 JWT аутентифікація
- 📱 REST API
- 🎨 Сучасний UI з Django Unfold

## 🛠️ Технології

- **Backend:** Django 5.2, Django REST Framework
- **База даних:** PostgreSQL
- **Кешування:** Redis
- **Фонові задачі:** Celery
- **Автентифікація:** JWT
- **Admin UI:** Django Unfold

## 📋 Вимоги

- Python 3.9+
- PostgreSQL 12+
- Redis 6+
- Git

## 🔧 Встановлення

### 1. Клонування репозиторію
```bash
git clone <repository-url>
cd inventory
```

### 2. Створення віртуального середовища
```bash
python -m venv venv
# Windows
venv\\Scripts\\activate
# Linux/macOS
source venv/bin/activate
```

### 3. Встановлення залежностей
```bash
pip install -r requirements.txt
```

### 4. Налаштування змінних оточення
```bash
# Скопіюйте приклад файлу
cp inventory_project/.env.example inventory_project/.env

# Відредагуйте .env файл з вашими налаштуваннями
```

**⚠️ ВАЖЛИВО:** Згенеруйте новий SECRET_KEY:
```bash
cd inventory_project
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Налаштування бази даних
```bash
# Створіть базу даних PostgreSQL
createdb inventory_db

# Виконайте міграції
cd inventory_project
python manage.py makemigrations
python manage.py migrate
```

### 6. Створення суперкористувача
```bash
python manage.py createsuperuser
```

### 7. Запуск проекту
```bash
# Запуск Django сервера
python manage.py runserver

# В іншому терміналі - запуск Celery (опціонально)
celery -A inventory_project worker -l info

# В третьому терміналі - запуск агента (опціонально)
cd ../agent
python agent.py
```

## 🌐 Використання

### Веб-інтерфейс
- Адміністрування: http://localhost:8000/admin/
- API: http://localhost:8000/api/

### API Endpoints
- `GET /api/equipment/` - Список обладнання
- `POST /api/equipment/` - Додати обладнання
- `GET /api/equipment/{id}/` - Деталі обладнання
- `PUT /api/equipment/{id}/` - Оновити обладнання
- `DELETE /api/equipment/{id}/` - Видалити обладнання

### Автоматичний агент
Агент автоматично збирає інформацію про комп'ютери в мережі:
1. Налаштуйте змінні в `.env` файлі агента
2. Запустіть: `python agent/agent.py`

## 🔒 Безпека

### Для розробки:
- DEBUG=True
- Використовується console.EmailBackend
- HTTP з'єднання дозволені

### Для продакшену:
1. Встановіть `DEBUG=False` в .env
2. Налаштуйте SMTP для email
3. Встановіть HTTPS
4. Оновіть ALLOWED_HOSTS
5. Налаштуйте Sentry для моніторингу помилок

## 📁 Структура проекту

```
inventory/
├── inventory_project/          # Django проект
│   ├── inventory/             # Основний додаток
│   ├── accounts/              # Користувачі
│   ├── licenses/              # Ліцензії
│   └── inventory_project/     # Налаштування
├── agent/                     # Агент збору даних
├── requirements.txt           # Залежності
├── requirements-dev.txt       # Залежності для розробки
├── .env.example              # Приклад конфігурації
└── README.md                 # Ця документація
```

## 🧪 Тестування

```bash
# Встановіть залежності для розробки
pip install -r requirements-dev.txt

# Запустіть тести
python manage.py test

# З покриттям коду
pytest --cov=inventory_project
```

## 📦 Розгортання

### Docker (рекомендовано)
```bash
# Буде додано пізніше
docker-compose up -d
```

### Ручне розгортання
1. Встановіть залежності production
2. Налаштуйте веб-сервер (nginx/apache)
3. Налаштуйте WSGI сервер (gunicorn/uwsgi)
4. Налаштуйте supervisor для Celery
5. Налаштуйте резервне копіювання БД

## 🔧 Розробка

### Встановлення для розробки
```bash
pip install -r requirements-dev.txt
python manage.py runserver --settings=inventory_project.settings_dev
```

### Форматування коду
```bash
black .
isort .
flake8 .
```

### Pre-commit hooks
```bash
pre-commit install
```

## 📞 Підтримка

- 🐛 Проблеми: [GitHub Issues](link-to-issues)
- 📧 Email: support@yourcompany.com
- 📚 Документація: [Wiki](link-to-wiki)

## 📄 Ліцензія

[MIT License](LICENSE)

## 🤝 Внесок

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit зміни (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

---

⚠️ **Безпека:** Ніколи не коммітьте .env файли з реальними секретами!