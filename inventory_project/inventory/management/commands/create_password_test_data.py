# inventory/management/commands/create_password_test_data.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from inventory.password_management import (
    SystemCategory, System, SystemAccount, PasswordEncryptionService
)
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Створити тестові дані для системи управління паролями'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Створення тестових даних для управління паролями...'))
        
        # Створюємо категорії систем
        categories_data = [
            {
                'name': 'Веб-системи',
                'description': 'Веб-додатки та сайти організації',
                'icon': 'web',
                'color': '#3b82f6'
            },
            {
                'name': 'Бази даних',
                'description': 'СУБД та системи зберігання даних',
                'icon': 'storage',
                'color': '#ef4444'
            },
            {
                'name': 'Мережеве обладнання',
                'description': 'Роутери, комутатори, точки доступу',
                'icon': 'router',
                'color': '#10b981'
            },
            {
                'name': 'Хмарні сервіси',
                'description': 'SaaS, IaaS та PaaS рішення',
                'icon': 'cloud',
                'color': '#f59e0b'
            },
            {
                'name': 'Системи безпеки',
                'description': 'Антивіруси, файрволи, системи моніторингу',
                'icon': 'security',
                'color': '#8b5cf6'
            }
        ]
        
        categories = []
        for cat_data in categories_data:
            category, created = SystemCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories.append(category)
            if created:
                self.stdout.write(f'Створено категорію: {category.name}')
        
        # Отримуємо користувачів
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR('Немає користувачів у базі даних. Створіть спочатку користувачів.'))
            return
        
        # Створюємо системи
        systems_data = [
            {
                'name': 'Корпоративний сайт',
                'category': categories[0],  # Веб-системи
                'system_type': 'web',
                'url': 'https://company.example.com',
                'description': 'Основний корпоративний веб-сайт',
                'criticality': 'high',
                'owner': random.choice(users)
            },
            {
                'name': 'CRM система',
                'category': categories[0],
                'system_type': 'web',
                'url': 'https://crm.company.local',
                'description': 'Система управління відносинами з клієнтами',
                'criticality': 'critical',
                'owner': random.choice(users)
            },
            {
                'name': 'База даних MySQL',
                'category': categories[1],  # Бази даних
                'system_type': 'database',
                'ip_address': '192.168.1.100',
                'port': 3306,
                'description': 'Основна база даних MySQL',
                'criticality': 'critical',
                'owner': random.choice(users)
            },
            {
                'name': 'PostgreSQL сервер',
                'category': categories[1],
                'system_type': 'database',
                'ip_address': '192.168.1.101',
                'port': 5432,
                'description': 'PostgreSQL сервер для аналітики',
                'criticality': 'high',
                'owner': random.choice(users)
            },
            {
                'name': 'Головний роутер',
                'category': categories[2],  # Мережеве обладнання
                'system_type': 'network',
                'ip_address': '192.168.1.1',
                'description': 'Cisco роутер головного офісу',
                'criticality': 'critical',
                'owner': random.choice(users)
            },
            {
                'name': 'Microsoft 365',
                'category': categories[3],  # Хмарні сервіси
                'system_type': 'cloud',
                'url': 'https://admin.microsoft.com',
                'description': 'Корпоративна підписка Microsoft 365',
                'criticality': 'critical',
                'owner': random.choice(users)
            },
            {
                'name': 'Kaspersky Security Center',
                'category': categories[4],  # Системи безпеки
                'system_type': 'software',
                'ip_address': '192.168.1.50',
                'port': 8080,
                'description': 'Центр управління антивірусним захистом',
                'criticality': 'high',
                'owner': random.choice(users)
            }
        ]
        
        systems = []
        for sys_data in systems_data:
            system, created = System.objects.get_or_create(
                name=sys_data['name'],
                defaults=sys_data
            )
            systems.append(system)
            if created:
                self.stdout.write(f'Створено систему: {system.name}')
        
        # Створюємо облікові записи
        accounts_data = [
            # CRM система
            {
                'system': systems[1],
                'username': 'admin',
                'account_type': 'admin',
                'email': 'admin@company.local',
                'description': 'Головний адміністратор CRM'
            },
            {
                'system': systems[1],
                'username': 'manager',
                'account_type': 'user',
                'email': 'manager@company.local',
                'description': 'Менеджер з продажів'
            },
            # MySQL
            {
                'system': systems[2],
                'username': 'root',
                'account_type': 'admin',
                'description': 'Root користувач MySQL'
            },
            {
                'system': systems[2],
                'username': 'app_user',
                'account_type': 'service',
                'description': 'Користувач для додатків'
            },
            # PostgreSQL
            {
                'system': systems[3],
                'username': 'postgres',
                'account_type': 'admin',
                'description': 'Головний користувач PostgreSQL'
            },
            # Роутер
            {
                'system': systems[4],
                'username': 'admin',
                'account_type': 'admin',
                'description': 'Адміністратор роутера'
            },
            # Microsoft 365
            {
                'system': systems[5],
                'username': 'globaladmin@company.onmicrosoft.com',
                'account_type': 'admin',
                'email': 'globaladmin@company.onmicrosoft.com',
                'description': 'Глобальний адміністратор M365'
            },
            # Kaspersky
            {
                'system': systems[6],
                'username': 'ksc_admin',
                'account_type': 'admin',
                'description': 'Адміністратор Kaspersky Security Center'
            }
        ]
        
        for acc_data in accounts_data:
            # Додаємо обов'язкові поля
            acc_data['created_by'] = random.choice(users)
            acc_data['assigned_to'] = random.choice(users)
            
            account, created = SystemAccount.objects.get_or_create(
                system=acc_data['system'],
                username=acc_data['username'],
                defaults=acc_data
            )
            
            if created:
                # Генеруємо безпечний пароль
                password = PasswordEncryptionService.generate_secure_password(16)
                account.set_password(password)
                account.save()
                
                self.stdout.write(f'Створено обліковий запис: {account.username}@{account.system.name}')
                # В реальному середовищі пароль не виводився б в логи
                self.stdout.write(f'  Згенерований пароль: {password}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\\nУспішно створено:\\n'
                f'- Категорій: {len(categories)}\\n'
                f'- Систем: {len(systems)}\\n'
                f'- Облікових записів: {len(accounts_data)}\\n\\n'
                f'Тепер можете перейти в адмін панель та переглянути створені дані.'
            )
        )