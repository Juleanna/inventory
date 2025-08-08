# inventory/password_management.py - Модуль управління паролями підсистем

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from simple_history.models import HistoricalRecords
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings
import base64
import secrets
import json
import logging
import os
from datetime import timedelta

# Налаштування логера
logger = logging.getLogger('password_management')

User = get_user_model()

class PasswordEncryptionService:
    """Сервіс для шифрування/дешифрування паролів"""
    
    @staticmethod
    def _get_encryption_key():
        """Отримати ключ шифрування з налаштувань або згенерувати новий"""
        password_key = getattr(settings, 'PASSWORD_ENCRYPTION_KEY', None)
        
        if not password_key:
            # Генеруємо новий ключ якщо його немає
            password_key = Fernet.generate_key()
            logger.warning("Згенеровано новий ключ шифрування. Збережіть його в settings.PASSWORD_ENCRYPTION_KEY")
            
        if isinstance(password_key, str):
            password_key = password_key.encode()
            
        return Fernet(password_key)
    
    @staticmethod
    def encrypt_password(password: str) -> str:
        """Зашифрувати пароль"""
        if not password:
            return ''
        
        try:
            f = PasswordEncryptionService._get_encryption_key()
            encrypted = f.encrypt(password.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Помилка шифрування пароля: {e}")
            raise ValidationError(_("Помилка шифрування пароля"))
    
    @staticmethod
    def decrypt_password(encrypted_password: str) -> str:
        """Розшифрувати пароль"""
        if not encrypted_password:
            return ''
        
        try:
            f = PasswordEncryptionService._get_encryption_key()
            encrypted_bytes = base64.b64decode(encrypted_password.encode())
            decrypted = f.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Помилка дешифрування пароля: {e}")
            raise ValidationError(_("Помилка дешифрування пароля"))
    
    @staticmethod
    def generate_secure_password(length: int = 16) -> str:
        """Згенерувати безпечний пароль"""
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))


class SystemCategory(models.Model):
    """Категорії систем/підсистем"""
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Назва категорії"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис категорії"
    )
    
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="CSS клас або назва іконки",
        verbose_name="Іконка"
    )
    
    color = models.CharField(
        max_length=7,
        default="#6366f1",
        help_text="Hex код кольору (#ffffff)",
        verbose_name="Колір"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активна"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")
    
    class Meta:
        verbose_name = "Категорія систем"
        verbose_name_plural = "Категорії систем"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class System(models.Model):
    """Системи/підсистеми організації"""
    
    SYSTEM_TYPES = [
        ('web', 'Веб-система'),
        ('database', 'База даних'),
        ('server', 'Сервер'),
        ('network', 'Мережеве обладнання'),
        ('cloud', 'Хмарний сервіс'),
        ('software', 'Програмне забезпечення'),
        ('service', 'Сервіс'),
        ('other', 'Інше'),
    ]
    
    CRITICALITY_LEVELS = [
        ('low', 'Низька'),
        ('medium', 'Середня'),
        ('high', 'Висока'),
        ('critical', 'Критична'),
    ]
    
    name = models.CharField(
        max_length=255,
        verbose_name="Назва системи"
    )
    
    category = models.ForeignKey(
        SystemCategory,
        on_delete=models.PROTECT,
        verbose_name="Категорія"
    )
    
    system_type = models.CharField(
        max_length=20,
        choices=SYSTEM_TYPES,
        default='web',
        verbose_name="Тип системи"
    )
    
    url = models.URLField(
        blank=True,
        verbose_name="URL/Адреса"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP адреса"
    )
    
    port = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Порт"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис системи"
    )
    
    criticality = models.CharField(
        max_length=10,
        choices=CRITICALITY_LEVELS,
        default='medium',
        verbose_name="Критичність"
    )
    
    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='owned_systems',
        verbose_name="Власник системи"
    )
    
    administrators = models.ManyToManyField(
        User,
        blank=True,
        related_name='administered_systems',
        verbose_name="Адміністратори"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активна"
    )
    
    # Метадані
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")
    
    # Історія змін
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = "Система"
        verbose_name_plural = "Системи"
        ordering = ['name']
        indexes = [
            models.Index(fields=['system_type', 'criticality']),
            models.Index(fields=['category', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_system_type_display()})"
    
    def get_access_count(self):
        """Кількість облікових записів для системи"""
        return self.system_accounts.count()
    
    def get_critical_level_color(self):
        """Колір для рівня критичності"""
        colors = {
            'low': '#10b981',
            'medium': '#f59e0b', 
            'high': '#ef4444',
            'critical': '#dc2626'
        }
        return colors.get(self.criticality, '#6b7280')


class SystemAccount(models.Model):
    """Облікові записи для доступу до систем"""
    
    ACCOUNT_TYPES = [
        ('admin', 'Адміністратор'),
        ('user', 'Користувач'),
        ('service', 'Сервісний'),
        ('readonly', 'Тільки читання'),
        ('api', 'API ключ'),
        ('other', 'Інше'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Активний'),
        ('disabled', 'Відключений'),
        ('expired', 'Прострочений'),
        ('locked', 'Заблокований'),
    ]
    
    system = models.ForeignKey(
        System,
        on_delete=models.CASCADE,
        related_name='system_accounts',
        verbose_name="Система"
    )
    
    username = models.CharField(
        max_length=255,
        verbose_name="Ім'я користувача"
    )
    
    # Зашифрований пароль
    _encrypted_password = models.TextField(
        blank=True,
        verbose_name="Зашифрований пароль"
    )
    
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPES,
        default='user',
        verbose_name="Тип облікового запису"
    )
    
    email = models.EmailField(
        blank=True,
        verbose_name="Email"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис/Призначення"
    )
    
    # Права доступу та статус
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Статус"
    )
    
    # Відповідальні особи
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_accounts',
        verbose_name="Призначено користувачу"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_accounts',
        verbose_name="Створено користувачем"
    )
    
    # Дати управління паролем
    password_created = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Пароль створено"
    )
    
    password_expires = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Пароль діє до"
    )
    
    last_password_change = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Остання зміна пароля"
    )
    
    # Додаткові налаштування
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    # Метадані
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Оновлено")
    
    # Історія змін (без збереження паролів у історії)
    history = HistoricalRecords(excluded_fields=['_encrypted_password'])
    
    class Meta:
        verbose_name = "Обліковий запис системи"
        verbose_name_plural = "Облікові записи систем"
        ordering = ['system__name', 'username']
        unique_together = ['system', 'username']
        indexes = [
            models.Index(fields=['system', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['account_type']),
        ]
    
    def __str__(self):
        return f"{self.username}@{self.system.name}"
    
    @property
    def password(self):
        """Отримати розшифрований пароль (тільки для читання)"""
        if self._encrypted_password:
            return PasswordEncryptionService.decrypt_password(self._encrypted_password)
        return ''
    
    @password.setter 
    def password(self, value):
        """Встановити пароль (буде зашифровано)"""
        if value:
            self._encrypted_password = PasswordEncryptionService.encrypt_password(value)
            self.last_password_change = timezone.now()
            
            # Автоматично встановлюємо дату закінчення дії пароля (90 днів)
            if not self.password_expires:
                self.password_expires = timezone.now() + timedelta(days=90)
        else:
            self._encrypted_password = ''
    
    def set_password(self, password):
        """Встановити новий пароль"""
        self.password = password
        logger.info(f"Пароль змінено для облікового запису {self.username}@{self.system.name}")
    
    def generate_password(self, length=16):
        """Згенерувати новий безпечний пароль"""
        new_password = PasswordEncryptionService.generate_secure_password(length)
        self.set_password(new_password)
        return new_password
    
    def is_password_expired(self):
        """Перевірити чи прострочений пароль"""
        if self.password_expires:
            return timezone.now() > self.password_expires
        return False
    
    def days_until_expiry(self):
        """Кількість днів до закінчення дії пароля"""
        if self.password_expires:
            delta = self.password_expires - timezone.now()
            return delta.days if delta.days > 0 else 0
        return None
    
    def clean(self):
        """Валідація моделі"""
        super().clean()
        
        # Перевірка унікальності username у межах системи
        if SystemAccount.objects.filter(
            system=self.system, 
            username=self.username
        ).exclude(pk=self.pk).exists():
            raise ValidationError({
                'username': _('Обліковий запис з таким ім\'ям вже існує в цій системі')
            })
        
        # Перевірка дат
        if self.password_expires and self.password_created:
            if self.password_expires <= self.password_created:
                raise ValidationError({
                    'password_expires': _('Дата закінчення дії повинна бути пізніше дати створення')
                })
    
    def save(self, *args, **kwargs):
        # Логування змін без збереження паролів
        if self.pk:
            try:
                old_obj = SystemAccount.objects.get(pk=self.pk)
                if old_obj.username != self.username:
                    logger.info(f"Змінено ім'я користувача з {old_obj.username} на {self.username} для системи {self.system.name}")
            except SystemAccount.DoesNotExist:
                pass
        else:
            logger.info(f"Створено новий обліковий запис {self.username} для системи {self.system.name}")
        
        super().save(*args, **kwargs)


class PasswordAccessLog(models.Model):
    """Логи доступу до паролів"""
    
    ACTION_TYPES = [
        ('view', 'Перегляд'),
        ('copy', 'Копіювання'), 
        ('edit', 'Редагування'),
        ('create', 'Створення'),
        ('delete', 'Видалення'),
        ('generate', 'Генерація'),
    ]
    
    account = models.ForeignKey(
        SystemAccount,
        on_delete=models.CASCADE,
        related_name='access_logs',
        verbose_name="Обліковий запис"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name="Користувач"
    )
    
    action = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        verbose_name="Дія"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP адреса"
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name="User Agent"
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Час дії"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    class Meta:
        verbose_name = "Лог доступу до паролів"
        verbose_name_plural = "Логи доступу до паролів"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['account', 'timestamp']),
            models.Index(fields=['user', 'action']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} - {self.account}"


# Сервіс для управління паролями
class PasswordManagementService:
    """Сервіс для управління паролями підсистем"""
    
    @staticmethod
    def get_user_accessible_accounts(user):
        """Отримати облікові записи доступні користувачу"""
        from django.db.models import Q
        
        return SystemAccount.objects.filter(
            Q(assigned_to=user) |
            Q(system__owner=user) | 
            Q(system__administrators=user) |
            Q(created_by=user)
        ).distinct()
    
    @staticmethod
    def log_password_access(account, user, action, request=None, notes=''):
        """Логувати доступ до пароля"""
        ip_address = None
        user_agent = ''
        
        if request:
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        PasswordAccessLog.objects.create(
            account=account,
            user=user,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            notes=notes
        )
        
        logger.info(f"Зафіксовано доступ до пароля: {user.username} - {action} - {account}")
    
    @staticmethod
    def check_expiring_passwords(days_ahead=7):
        """Перевірити паролі що скоро закінчуються"""
        expiry_date = timezone.now() + timedelta(days=days_ahead)
        
        return SystemAccount.objects.filter(
            password_expires__lte=expiry_date,
            password_expires__gte=timezone.now(),
            status='active'
        )
    
    @staticmethod
    def get_password_strength_score(password):
        """Оцінити силу пароля (від 0 до 100)"""
        if not password:
            return 0
        
        score = 0
        
        # Довжина
        if len(password) >= 8:
            score += 25
        if len(password) >= 12:
            score += 15
        if len(password) >= 16:
            score += 10
        
        # Різні типи символів
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password)
        
        char_types = sum([has_lower, has_upper, has_digit, has_special])
        score += char_types * 12.5
        
        return min(score, 100)