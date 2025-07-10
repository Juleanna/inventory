# inventory/models.py (покращена версія)
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from simple_history.models import HistoricalRecords
from licenses.models import License
from io import BytesIO
import barcode
from barcode.writer import ImageWriter
from django.core.files.base import ContentFile
import qrcode
from django.contrib.auth import get_user_model
from decimal import Decimal
import logging
from .validators import (
    validate_serial_number, validate_mac_address, validate_ip_address,
    validate_price, validate_future_date, validate_warranty_date,
    validate_equipment_name, validate_location
)

# Налаштування логера
logger = logging.getLogger('inventory')

User = get_user_model()

class EquipmentManager(models.Manager):
    """Менеджер для моделі Equipment з додатковими методами"""
    
    def working(self):
        """Повертає тільки працююче обладнання"""
        return self.filter(status='WORKING')
    
    def needs_maintenance(self):
        """Обладнання що потребує обслуговування"""
        from datetime import timedelta
        maintenance_due = timezone.now().date() - timedelta(days=365)
        return self.filter(
            models.Q(last_maintenance_date__lt=maintenance_due) |
            models.Q(last_maintenance_date__isnull=True),
            status='WORKING'
        )
    
    def expiring_soon(self, days=30):
        """Обладнання що скоро закінчується"""
        expiry_date = timezone.now().date() + timezone.timedelta(days=days)
        return self.filter(
            expiry_date__lte=expiry_date,
            expiry_date__gte=timezone.now().date(),
            status='WORKING'
        )
    
    def by_location(self, location):
        """Обладнання за місцезнаходженням"""
        return self.filter(location__icontains=location)
    
    def total_value(self):
        """Загальна вартість обладнання"""
        return self.aggregate(
            total=models.Sum('purchase_price')
        )['total'] or Decimal('0.00')

class Equipment(models.Model):
    CATEGORY_CHOICES = [
        ('PC', 'Стаціонарний ПК'),
        ('WORK', 'Робоча станція'),
        ('SRV', 'Сервер'),
        ('PRN', 'Принтер'),
        ('LAPTOP', 'Ноутбук'),
        ('TABLET', 'Планшет'),
        ('PHONE', 'Телефон'),
        ('MONITOR', 'Монітор'),
        ('NETWORK', 'Мережеве обладнання'),
        ('OTH', 'Інше'),
    ]

    STATUS_CHOICES = [
        ('WORKING', 'Робоче'),
        ('REPAIR', 'Ремонт'),
        ('MAINTENANCE', 'Обслуговування'),
        ('STORAGE', 'На складі'),
        ('DISPOSED', 'Списано'),
        ('LOST', 'Втрачено'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Низький'),
        ('MEDIUM', 'Середній'),
        ('HIGH', 'Високий'),
        ('CRITICAL', 'Критичний'),
    ]

    # Основна інформація
    name = models.CharField(
        max_length=255, 
        verbose_name="Назва обладнання",
        validators=[validate_equipment_name],
        help_text="Введіть назву обладнання"
    )
    category = models.CharField(
        max_length=10, 
        choices=CATEGORY_CHOICES, 
        verbose_name="Категорія",
        db_index=True
    )
    model = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        verbose_name="Модель пристрою"
    )
    manufacturer = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        verbose_name="Виробник",
        db_index=True
    )
    
    # Ідентифікація
    serial_number = models.CharField(
        max_length=255, 
        unique=True, 
        verbose_name="Серійний номер",
        validators=[validate_serial_number],
        db_index=True
    )
    inventory_number = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Інвентарний номер",
        help_text="Внутрішній номер організації"
    )
    asset_tag = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="Asset Tag",
        help_text="Наклейка з номером"
    )
    
    # Мережеві параметри
    mac_address = models.CharField(
        max_length=17, 
        null=True, 
        blank=True, 
        verbose_name="MAC-адреса",
        validators=[validate_mac_address],
        help_text="Формат: 00:11:22:33:44:55"
    )
    ip_address = models.GenericIPAddressField(
        null=True, 
        blank=True, 
        verbose_name="IP-адреса",
        validators=[validate_ip_address]
    )
    hostname = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Ім'я хоста"
    )
    
    # Дати
    purchase_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Дата покупки",
        validators=[validate_future_date]
    )
    warranty_until = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Гарантія до",
        validators=[validate_warranty_date]
    )
    last_maintenance_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Дата останнього обслуговування"
    )
    next_maintenance_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Наступне обслуговування"
    )
    expiry_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Дата закінчення строку служби"
    )
    
    # Розташування та статус
    location = models.CharField(
        max_length=255, 
        verbose_name="Місцезнаходження",
        validators=[validate_location],
        db_index=True
    )
    building = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="Будівля"
    )
    floor = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name="Поверх"
    )
    room = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Кімната"
    )
    status = models.CharField(
        max_length=30, 
        choices=STATUS_CHOICES, 
        default="WORKING", 
        verbose_name="Стан",
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
        verbose_name="Пріоритет"
    )
    
    # Користувачі
    current_user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True, 
        verbose_name="Поточний користувач",
        related_name='assigned_equipment'
    )
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Відповідальна особа",
        related_name='responsible_equipment'
    )
    
    # Фінансова інформація
    supplier = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Постачальник"
    )
    purchase_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        null=True, 
        blank=True, 
        verbose_name="Ціна покупки",
        validators=[validate_price]
    )
    depreciation_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('20.00'),
        verbose_name="Норма амортизації (%/рік)"
    )
    
    # Технічні характеристики
    cpu = models.CharField(
        max_length=200, 
        null=True, 
        blank=True, 
        verbose_name="Процесор"
    )
    ram = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Оперативна пам'ять"
    )
    storage = models.CharField(
        max_length=200, 
        null=True, 
        blank=True, 
        verbose_name="Накопичувач"
    )
    gpu = models.CharField(
        max_length=200, 
        null=True, 
        blank=True, 
        verbose_name="Відеокарта"
    )
    operating_system = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Операційна система"
    )
    
    # Додаткова інформація
    description = models.TextField(
        blank=True,
        verbose_name="Опис",
        help_text="Додаткова інформація про обладнання"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки",
        help_text="Внутрішні примітки"
    )
    
    # Зображення та коди
    barcode_image = models.ImageField(
        upload_to='barcodes/', 
        blank=True, 
        null=True,
        verbose_name="Штрих-код"
    )
    qrcode_image = models.ImageField(
        upload_to='qrcodes/', 
        blank=True, 
        null=True,
        verbose_name="QR-код"
    )
    photo = models.ImageField(
        upload_to='equipment_photos/',
        blank=True,
        null=True,
        verbose_name="Фото обладнання"
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
    
    # Зв'язки
    documents = models.ManyToManyField(
        'EquipmentDocument', 
        blank=True, 
        verbose_name="Документи", 
        related_name='related_equipments'
    )
    
    # Історія змін
    history = HistoricalRecords()
    
    # Менеджер
    objects = EquipmentManager()
    
    class Meta:
        verbose_name = "Обладнання"
        verbose_name_plural = "Обладнання"
        ordering = ['name']
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['location', 'status']),
            models.Index(fields=['current_user', 'status']),
            models.Index(fields=['purchase_date']),
        ]
    
    def clean(self):
        """Валідація моделі"""
        super().clean()
        
        # Перевірка дат
        if self.expiry_date and self.purchase_date:
            if self.expiry_date <= self.purchase_date:
                raise ValidationError({
                    'expiry_date': _('Дата закінчення не може бути раніше дати покупки')
                })
        
        if self.warranty_until and self.purchase_date:
            if self.warranty_until < self.purchase_date:
                raise ValidationError({
                    'warranty_until': _('Дата закінчення гарантії не може бути раніше дати покупки')
                })
        
        if self.next_maintenance_date and self.last_maintenance_date:
            if self.next_maintenance_date <= self.last_maintenance_date:
                raise ValidationError({
                    'next_maintenance_date': _('Дата наступного обслуговування повинна бути пізніше останнього')
                })
    
    def save(self, *args, **kwargs):
        # Генерація кодів
        self.generate_barcode()
        self.generate_qrcode()
        
        # Автоматичне встановлення наступного обслуговування
        if self.last_maintenance_date and not self.next_maintenance_date:
            from datetime import timedelta
            self.next_maintenance_date = self.last_maintenance_date + timedelta(days=365)
        
        # Логування змін
        if self.pk:
            try:
                old_obj = Equipment.objects.get(pk=self.pk)
                if old_obj.status != self.status:
                    logger.info(f"Статус обладнання {self.name} ({self.serial_number}) змінено з {old_obj.status} на {self.status}")
            except Equipment.DoesNotExist:
                pass
        else:
            logger.info(f"Створено нове обладнання: {self.name} ({self.serial_number})")
        
        super().save(*args, **kwargs)
    
    def generate_barcode(self):
        """Генерація штрих-коду"""
        if self.serial_number:
            try:
                barcode_format = barcode.get('code128', self.serial_number, writer=ImageWriter())
                buffer = BytesIO()
                barcode_format.write(buffer)
                self.barcode_image.save(
                    f"{self.serial_number}_barcode.png", 
                    ContentFile(buffer.getvalue()), 
                    save=False
                )
                buffer.close()
            except Exception as e:
                logger.error(f"Помилка генерації штрих-коду для {self.serial_number}: {e}")

    def generate_qrcode(self):
        """Генерація QR-коду"""
        if self.serial_number:
            try:
                # Додаємо більше інформації в QR-код
                qr_data = f"Equipment: {self.name}\nSerial: {self.serial_number}\nLocation: {self.location}"
                
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=4,
                )
                qr.add_data(qr_data)
                qr.make(fit=True)
                
                img = qr.make_image(fill_color="black", back_color="white")
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                self.qrcode_image.save(
                    f"{self.serial_number}_qrcode.png", 
                    ContentFile(buffer.getvalue()), 
                    save=False
                )
                buffer.close()
            except Exception as e:
                logger.error(f"Помилка генерації QR-коду для {self.serial_number}: {e}")
    
    def get_depreciation_value(self):
        """Розрахунок амортизаційної вартості"""
        if not self.purchase_price or not self.purchase_date:
            return None
        
        from datetime import date
        years_old = (date.today() - self.purchase_date).days / 365.25
        depreciation_amount = self.purchase_price * (self.depreciation_rate / 100) * Decimal(str(years_old))
        current_value = self.purchase_price - depreciation_amount
        
        return max(current_value, Decimal('0.00'))
    
    def get_age_in_years(self):
        """Вік обладнання в роках"""
        if not self.purchase_date:
            return None
        
        from datetime import date
        return (date.today() - self.purchase_date).days / 365.25
    
    def is_under_warranty(self):
        """Чи знаходиться під гарантією"""
        if not self.warranty_until:
            return False
        
        from datetime import date
        return self.warranty_until >= date.today()
    
    def needs_maintenance(self):
        """Чи потребує обслуговування"""
        if not self.last_maintenance_date:
            return True
        
        from datetime import date, timedelta
        maintenance_due = self.last_maintenance_date + timedelta(days=365)
        return date.today() >= maintenance_due
    
    def days_until_expiry(self):
        """Кількість днів до закінчення строку служби"""
        if not self.expiry_date:
            return None
        
        from datetime import date
        delta = self.expiry_date - date.today()
        return delta.days if delta.days > 0 else 0
    
    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('INFO', 'Інформація'),
        ('WARNING', 'Попередження'),
        ('ERROR', 'Помилка'),
        ('SUCCESS', 'Успіх'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Низький'),
        ('MEDIUM', 'Середній'),
        ('HIGH', 'Високий'),
        ('URGENT', 'Термінове'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Користувач")
    equipment = models.ForeignKey(
        Equipment, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        verbose_name="Обладнання"
    )
    title = models.CharField(max_length=200, verbose_name="Заголовок")
    message = models.TextField(verbose_name="Повідомлення")
    notification_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        default='INFO',
        verbose_name="Тип"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
        verbose_name="Пріоритет"
    )
    read = models.BooleanField(default=False, verbose_name="Прочитано")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Час прочитання")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Створено")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Закінчується")

    class Meta:
        verbose_name = "Уведомлення"
        verbose_name_plural = "Уведомлення"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read']),
            models.Index(fields=['created_at']),
        ]

    def mark_as_read(self):
        """Позначити як прочитане"""
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=['read', 'read_at'])

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class Software(models.Model):
    name = models.CharField(max_length=255, verbose_name="Назва ПЗ")
    version = models.CharField(max_length=50, verbose_name="Версія")
    vendor = models.CharField(max_length=255, verbose_name="Виробник")
    license = models.ForeignKey(License, null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Лицензія")
    installed_on = models.ManyToManyField(Equipment, blank=True, verbose_name="Встановлено на")

    class Meta:
        verbose_name = "Програмне забезпечення"
        verbose_name_plural = "Програмне забезпечення"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} v{self.version}"


class PeripheralDevice(models.Model):
    name = models.CharField(max_length=255, verbose_name="Назва пристрою")
    type = models.CharField(max_length=255, verbose_name="Тип пристрою")
    serial_number = models.CharField(max_length=255, unique=True, verbose_name="Серійний номер")
    connected_to = models.ForeignKey(Equipment, null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Підключено до")

    class Meta:
        verbose_name = "Периферійний пристрій"
        verbose_name_plural = "Периферійні пристрої"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class EquipmentDocument(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='related_documents',
                                  verbose_name="Обладнання")
    file = models.FileField(upload_to='documents/%Y/%m/%d/', verbose_name="Файл документа")
    description = models.CharField(max_length=200, blank=True, verbose_name="Опис")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Завантажено")

    class Meta:
        verbose_name = "Документ обладнання"
        verbose_name_plural = "Документи обладнання"
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file.name