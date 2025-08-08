# accounts/models.py (покращена версія)
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from simple_history.models import HistoricalRecords
from inventory.validators import validate_phone_number

class CustomUser(AbstractUser):
    """Розширена модель користувача"""
    
    DEPARTMENT_CHOICES = [
        ('IT', 'IT відділ'),
        ('HR', 'Відділ кадрів'),
        ('FINANCE', 'Фінансовий відділ'),
        ('MARKETING', 'Маркетинг'),
        ('SALES', 'Продажі'),
        ('MANAGEMENT', 'Управління'),
        ('OPERATIONS', 'Операційний відділ'),
        ('SUPPORT', 'Служба підтримки'),
        ('OTHER', 'Інший'),
    ]
    
    POSITION_CHOICES = [
        ('MANAGER', 'Менеджер'),
        ('DEVELOPER', 'Розробник'),
        ('ANALYST', 'Аналітик'),
        ('ADMIN', 'Адміністратор'),
        ('SPECIALIST', 'Спеціаліст'),
        ('DIRECTOR', 'Директор'),
        ('COORDINATOR', 'Координатор'),
        ('ASSISTANT', 'Асистент'),
        ('OTHER', 'Інша'),
    ]
    
    # Контактна інформація
    phone = models.CharField(
        max_length=20, 
        blank=True, 
        verbose_name="Телефон",
        validators=[validate_phone_number],
        help_text="Формат: +380501234567"
    )
    mobile_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Мобільний телефон",
        validators=[validate_phone_number]
    )
    
    # Посада та відділ
    position = models.CharField(
        max_length=20, 
        choices=POSITION_CHOICES,
        blank=True, 
        verbose_name="Посада"
    )
    custom_position = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Посада (інша)",
        help_text="Якщо вашої посади немає в списку"
    )
    department = models.CharField(
        max_length=20,
        choices=DEPARTMENT_CHOICES, 
        blank=True, 
        verbose_name="Відділ"
    )
    custom_department = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Відділ (інший)",
        help_text="Якщо вашого відділу немає в списку"
    )
    
    # Робоче місце
    office_location = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Місцезнаходження офісу"
    )
    room_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Номер кімнати"
    )
    
    # Керівник
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Керівник",
        related_name='subordinates'
    )
    
    # Дати
    hire_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Дата прийняття на роботу"
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Дата народження"
    )
    
    # Налаштування
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Налаштування уведомлень",
        help_text="JSON об'єкт з налаштуваннями уведомлень"
    )
    
    timezone = models.CharField(
        max_length=50,
        default='Europe/Kiev',
        verbose_name="Часовий пояс"
    )
    
    language = models.CharField(
        max_length=10,
        default='uk',
        choices=[
            ('uk', 'Українська'),
            ('en', 'English'),
            ('ru', 'Русский'),
        ],
        verbose_name="Мова інтерфейсу"
    )
    
    # Статус
    is_temporary = models.BooleanField(
        default=False,
        verbose_name="Тимчасовий співробітник"
    )
    
    employment_type = models.CharField(
        max_length=20,
        choices=[
            ('FULL_TIME', 'Повний робочий день'),
            ('PART_TIME', 'Неповний робочий день'),
            ('CONTRACT', 'Контракт'),
            ('INTERN', 'Стажер'),
        ],
        default='FULL_TIME',
        verbose_name="Тип зайнятості"
    )
    
    # Зв'язки з обладнанням (покращені)
    devices = models.ManyToManyField(
        'inventory.Equipment', 
        blank=True, 
        related_name="assigned_users",
        verbose_name="Призначене обладнання",
        help_text="Обладнання, призначене цьому користувачу"
    )
    
    # Додаткова інформація
    bio = models.TextField(
        blank=True,
        verbose_name="Біографія",
        help_text="Коротка інформація про співробітника"
    )
    
    skills = models.TextField(
        blank=True,
        verbose_name="Навички",
        help_text="Професійні навички через кому"
    )
    
    emergency_contact_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Контактна особа (ім'я)"
    )
    
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Контактна особа (телефон)",
        validators=[validate_phone_number]
    )
    
    # Метадані
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Створено"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Оновлено"
    )
    
    # Історія змін
    history = HistoricalRecords()
    
    class Meta:
        verbose_name = "Користувач"
        verbose_name_plural = "Користувачі"
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['position', 'is_active']),
            models.Index(fields=['manager']),
        ]
    
    def clean(self):
        """Валідація моделі"""
        super().clean()
        
        # Перевірка що користувач не може бути сам собі керівником
        if self.manager == self:
            raise ValidationError({
                'manager': _('Користувач не може бути сам собі керівником')
            })
        
        # Перевірка дати народження
        if self.birth_date:
            from datetime import date
            today = date.today()
            age = today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
            if age < 16 or age > 100:
                raise ValidationError({
                    'birth_date': _('Некоректна дата народження')
                })
        
        # Перевірка дати прийняття на роботу
        if self.hire_date and self.birth_date:
            if self.hire_date <= self.birth_date:
                raise ValidationError({
                    'hire_date': _('Дата прийняття на роботу не може бути раніше дати народження')
                })
    
    def save(self, *args, **kwargs):
        # Ініціалізація налаштувань уведомлень за замовчуванням
        if not self.notification_preferences:
            self.notification_preferences = {
                'email_notifications': True,
                'equipment_expiry_alerts': True,
                'maintenance_reminders': True,
                'assignment_notifications': True,
                'daily_reports': False,
                'urgent_only': False
            }
        
        super().save(*args, **kwargs)
    
    def get_full_position(self):
        """Отримати повну назву посади"""
        if self.position and self.position != 'OTHER':
            return self.get_position_display()
        elif self.custom_position:
            return self.custom_position
        else:
            return "Посада не вказана"
    
    def get_full_department(self):
        """Отримати повну назву відділу"""
        if self.department and self.department != 'OTHER':
            return self.get_department_display()
        elif self.custom_department:
            return self.custom_department
        else:
            return "Відділ не вказаний"
    
    def get_assigned_equipment_count(self):
        """Кількість призначеного обладнання"""
        return self.assigned_equipment.filter(status='WORKING').count()
    
    def get_responsible_equipment_count(self):
        """Кількість обладнання під відповідальністю"""
        return self.responsible_equipment.filter(status='WORKING').count()
    
    def get_subordinates_count(self):
        """Кількість підлеглих"""
        return self.subordinates.filter(is_active=True).count()
    
    def get_unread_notifications_count(self):
        """Кількість непрочитаних уведомлень"""
        from inventory.models import Notification
        return Notification.objects.filter(user=self, read=False).count()
    
    def get_equipment_needing_attention(self):
        """Обладнання що потребує уваги"""
        from inventory.models import Equipment
        from django.utils import timezone
        from datetime import timedelta
        
        user_equipment = Equipment.objects.filter(
            models.Q(current_user=self) | models.Q(responsible_person=self)
        ).distinct()
        
        today = timezone.now().date()
        
        return {
            'expiring_soon': user_equipment.filter(
                expiry_date__lte=today + timedelta(days=30),
                expiry_date__gte=today,
                status='WORKING'
            ).count(),
            'needs_maintenance': len([eq for eq in user_equipment if eq.needs_maintenance()]),
            'warranty_expiring': user_equipment.filter(
                warranty_until__lte=today + timedelta(days=30),
                warranty_until__gte=today
            ).count()
        }
    
    def can_manage_equipment(self, equipment):
        """Чи може користувач керувати обладнанням"""
        return (
            self.is_staff or 
            equipment.current_user == self or 
            equipment.responsible_person == self or
            (equipment.current_user and equipment.current_user.manager == self)
        )
    
    def get_team_equipment(self):
        """Обладнання команди (підлеглих)"""
        from inventory.models import Equipment
        
        if not self.subordinates.exists():
            return Equipment.objects.none()
        
        return Equipment.objects.filter(
            models.Q(current_user__in=self.subordinates.all()) |
            models.Q(responsible_person__in=self.subordinates.all())
        ).distinct()
    
    def __str__(self):
        full_name = self.get_full_name()
        if full_name:
            return f"{full_name} ({self.username})"
        return self.username


class UserProfile(models.Model):
    """Додатковий профіль користувача для розширених налаштувань"""
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name="Користувач"
    )
    
    # Налаштування дашборду
    dashboard_layout = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Налаштування дашборду"
    )
    
    # Улюблене обладнання
    favorite_equipment = models.ManyToManyField(
        'inventory.Equipment',
        blank=True,
        related_name='favorited_by_users',
        verbose_name="Улюблене обладнання"
    )
    
    # Швидкі дії
    quick_actions = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Швидкі дії",
        help_text="Список швидких дій для користувача"
    )
    
    # Налаштування відображення
    items_per_page = models.IntegerField(
        default=25,
        choices=[
            (10, '10'),
            (25, '25'),
            (50, '50'),
            (100, '100'),
        ],
        verbose_name="Елементів на сторінці"
    )
    
    default_equipment_view = models.CharField(
        max_length=20,
        choices=[
            ('list', 'Список'),
            ('cards', 'Картки'),
            ('table', 'Таблиця'),
        ],
        default='table',
        verbose_name="Вигляд обладнання за замовчуванням"
    )
    
    # Сповіщення
    email_digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ('never', 'Ніколи'),
            ('daily', 'Щодня'),
            ('weekly', 'Щотижня'),
            ('monthly', 'Щомісяця'),
        ],
        default='weekly',
        verbose_name="Частота email дайджесту"
    )
    
    class Meta:
        verbose_name = "Профіль користувача"
        verbose_name_plural = "Профілі користувачів"
    
    def __str__(self):
        return f"Профіль {self.user.username}"