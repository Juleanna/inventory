from django.db import models
from simple_history.models import HistoricalRecords
from licenses.models import License
from io import BytesIO
import barcode
from barcode.writer import ImageWriter
from django.core.files.base import ContentFile
import qrcode
from django.contrib.auth import get_user_model

User = get_user_model()

class Equipment(models.Model):
    CATEGORY_CHOICES = [
        ('PC', 'Стационарный ПК'),
        ('WORK', 'Рабочая станция'),
        ('SRV', 'Сервер'),
        ('PRN', 'Принтер'),
        ('LAPTOP', 'Ноутбук'),
        ('OTH', 'Другое'),
    ]

    STATUS_CHOICES = [
        ('WORKING', 'Рабочее'),
        ('REPAIR', 'Ремонт'),
        ('DISPOSED', 'Списано'),
    ]

    name = models.CharField(max_length=255, verbose_name="Название оборудования")
    category = models.CharField(max_length=6, choices=CATEGORY_CHOICES, verbose_name="Категория")
    model = models.CharField(max_length=255, null=True, blank=True, verbose_name="Модель устройства")  # Новое поле
    manufacturer = models.CharField(max_length=255, null=True, blank=True, verbose_name="Производитель")
    serial_number = models.CharField(max_length=255, unique=True, verbose_name="Серийный номер")
    unique_serial_number = models.CharField(max_length=255, verbose_name="Уникальный серийный номер")  # Новое поле
    mac_address = models.CharField(max_length=17, null=True, blank=True, verbose_name="MAC-адрес")  # Новое поле
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP-адрес")  # Новое поле
    purchase_date = models.DateField(null=True, blank=True, verbose_name="Дата покупки")
    location = models.CharField(max_length=255, verbose_name="Местоположение")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="WORKING", verbose_name="Состояние")
    last_maintenance_date = models.DateField(null=True, blank=True, verbose_name="Дата последнего обслуживания")
    expiry_date = models.DateField(null=True, blank=True, verbose_name="Дата истечения срока службы")
    current_user = models.ForeignKey(User, on_delete=models.SET_NULL,
                                     null=True, blank=True, verbose_name="Текущий пользователь")
    warranty_until = models.DateField(null=True, blank=True, verbose_name="Гарантия до")
    supplier = models.CharField(max_length=100, null=True, blank=True, verbose_name="Поставщик")
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2,null=True, blank=True, verbose_name="Цена покупки")
    cpu = models.CharField(max_length=100, null=True, blank=True, verbose_name="CPU")
    ram = models.CharField(max_length=100, null=True, blank=True, verbose_name="RAM")
    storage = models.CharField(max_length=100, null=True, blank=True, verbose_name="SSD/HDD")
    gpu = models.CharField(max_length=100, null=True, blank=True, verbose_name="GPU")
    operating_system = models.CharField(max_length=100, null=True, blank=True, verbose_name="Операционная система")
    # Для прикрепления документов (скачей, гарантийных талонов и т.д.)
    documents = models.ManyToManyField('EquipmentDocument', blank=True, verbose_name="Документы", related_name='related_equipments')
    history = HistoricalRecords()  # Отслеживание истории изменений&#8203;:contentReference[oaicite:0]{index=0}
    barcode_image = models.ImageField(upload_to='barcodes/', blank=True, null=True)
    qrcode_image = models.ImageField(upload_to='qrcodes/', blank=True, null=True)
    def generate_barcode(self):
        if self.serial_number:
            barcode_format = barcode.get('code128', self.serial_number, writer=ImageWriter())
            buffer = BytesIO()
            barcode_format.write(buffer)
            self.barcode_image.save(f"{self.serial_number}.png", ContentFile(buffer.getvalue()), save=False)
            buffer.close()

    def generate_qrcode(self):
        if self.serial_number:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(self.serial_number)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            self.qrcode_image.save(f"{self.serial_number}_qrcode.png", ContentFile(buffer.getvalue()), save=False)
            buffer.close()

    def save(self, *args, **kwargs):
        self.generate_barcode()
        self.generate_qrcode()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.serial_number})"

class Notification(models.Model):
    MESSAGE_CHOICES = [
        ('NEW_ITEM', 'Новый предмет добавлен'),
        ('ITEM_UPDATED', 'Предмет обновлен'),
        ('ITEM_EXPIRED', 'Предмет истек по сроку службы'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.CharField(max_length=100, choices=MESSAGE_CHOICES)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Уведомление для {self.user.username}: {self.message}"
    
class Software(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название ПО")
    version = models.CharField(max_length=50, verbose_name="Версия")
    vendor = models.CharField(max_length=255, verbose_name="Производитель")
    license = models.ForeignKey(License, null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Лицензия")
    installed_on = models.ManyToManyField(Equipment, blank=True, verbose_name="Установлено на")

    def __str__(self):
        return f"{self.name} v{self.version}"


class PeripheralDevice(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название устройства")
    type = models.CharField(max_length=255, verbose_name="Тип устройства")
    serial_number = models.CharField(max_length=255, unique=True, verbose_name="Серийный номер")
    connected_to = models.ForeignKey(Equipment, null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Подключено к")

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class EquipmentDocument(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='related_documents',
                                  verbose_name="Оборудование")
    file = models.FileField(upload_to='documents/%Y/%m/%d/', verbose_name="Файл документа")
    description = models.CharField(max_length=200, blank=True, verbose_name="Описание")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


