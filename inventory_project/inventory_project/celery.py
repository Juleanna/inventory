# inventory_project/celery.py
import os
from celery import Celery
from django.conf import settings

# Встановити модуль налаштувань Django для програми 'celery'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_project.settings')

app = Celery('inventory_project')

# Використовувати рядок налаштувань, щоб дочірні процеси не мали серіалізувати
# об'єкт конфігурації для дочірніх процесів.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматично завантажувати модулі tasks з усіх зареєстрованих Django додатків
app.autodiscover_tasks()

# Налаштування Celery
app.conf.update(
    # Часовий пояс
    timezone=settings.TIME_ZONE,
    enable_utc=True,
    
    # Серіалізатор
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Результати завдань
    result_backend='redis://localhost:6379/0',
    result_expires=3600,
    
    # Брокер повідомлень
    broker_url='redis://localhost:6379/0',
    
    # Планувальник завдань
    beat_schedule={
        # Перевірка терміну служби щодня о 9:00
        'check-equipment-expiry': {
            'task': 'inventory.tasks.check_equipment_expiry',
            'schedule': 60.0 * 60.0 * 24.0,  # Кожні 24 години
            'options': {'queue': 'default'}
        },
        
        # Перевірка гарантії щодня о 9:30
        'check-warranty-expiry': {
            'task': 'inventory.tasks.check_warranty_expiry',
            'schedule': 60.0 * 60.0 * 24.0,  # Кожні 24 години
            'options': {'queue': 'default'}
        },
        
        # Перевірка обслуговування щодня о 10:00
        'check-maintenance-schedule': {
            'task': 'inventory.tasks.check_maintenance_schedule',
            'schedule': 60.0 * 60.0 * 24.0,  # Кожні 24 години
            'options': {'queue': 'default'}
        },
        
        # Очищення старих уведомлень щотижня
        'cleanup-old-notifications': {
            'task': 'inventory.tasks.cleanup_old_notifications',
            'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Кожний тиждень
            'options': {'queue': 'maintenance'}
        },
        
        # Щоденний звіт о 8:00
        'generate-daily-report': {
            'task': 'inventory.tasks.generate_daily_report',
            'schedule': 60.0 * 60.0 * 24.0,  # Кожні 24 години
            'options': {'queue': 'reports'}
        },
        
        # Email уведомлення кожні 4 години
        'send-email-notifications': {
            'task': 'inventory.tasks.send_email_notifications',
            'schedule': 60.0 * 60.0 * 4.0,  # Кожні 4 години
            'options': {'queue': 'notifications'}
        },
        
        # Оновлення метрик кожні 6 годин
        'update-equipment-metrics': {
            'task': 'inventory.tasks.update_equipment_metrics',
            'schedule': 60.0 * 60.0 * 6.0,  # Кожні 6 годин
            'options': {'queue': 'maintenance'}
        },
        
        # Резервне копіювання щодня о 2:00
        'backup-critical-data': {
            'task': 'inventory.tasks.backup_critical_data',
            'schedule': 60.0 * 60.0 * 24.0,  # Кожні 24 години
            'options': {'queue': 'backup'}
        },
    },
    
    # Маршрутизація завдань по чергах
    task_routes={
        'inventory.tasks.check_*': {'queue': 'default'},
        'inventory.tasks.send_email_notifications': {'queue': 'notifications'},
        'inventory.tasks.generate_daily_report': {'queue': 'reports'},
        'inventory.tasks.backup_critical_data': {'queue': 'backup'},
        'inventory.tasks.cleanup_*': {'queue': 'maintenance'},
        'inventory.tasks.update_*': {'queue': 'maintenance'},
    },
    
    # Налаштування воркерів
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
)

@app.task(bind=True)
def debug_task(self):
    """Тестове завдання для перевірки Celery"""
    print(f'Request: {self.request!r}')


# Додати в inventory_project/__init__.py
# from .celery import app as celery_app
# __all__ = ('celery_app',)