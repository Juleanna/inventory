# inventory/spare_parts.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from decimal import Decimal
from datetime import datetime, timedelta
from .models import Equipment, Notification
import uuid

User = get_user_model()

class Supplier(models.Model):
    """Постачальник запчастин"""
    
    name = models.CharField(
        max_length=200,
        verbose_name="Назва постачальника"
    )
    
    contact_person = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Контактна особа"
    )
    
    email = models.EmailField(
        blank=True,
        verbose_name="Email"
    )
    
    phone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Телефон"
    )
    
    address = models.TextField(
        blank=True,
        verbose_name="Адреса"
    )
    
    website = models.URLField(
        blank=True,
        verbose_name="Веб-сайт"
    )
    
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Податковий номер"
    )
    
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Рейтинг (0-5)"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активний"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Створено"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Оновлено"
    )
    
    class Meta:
        verbose_name = "Постачальник"
        verbose_name_plural = "Постачальники"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SparePartCategory(models.Model):
    """Категорія запчастин"""
    
    name = models.CharField(
        max_length=100,
        verbose_name="Назва категорії"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис"
    )
    
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories',
        verbose_name="Батьківська категорія"
    )
    
    class Meta:
        verbose_name = "Категорія запчастин"
        verbose_name_plural = "Категорії запчастин"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SparePart(models.Model):
    """Запчастина"""
    
    CONDITION_CHOICES = [
        ('NEW', 'Нова'),
        ('REFURBISHED', 'Відновлена'),
        ('USED', 'Вживана'),
        ('DAMAGED', 'Пошкоджена'),
    ]
    
    STATUS_CHOICES = [
        ('IN_STOCK', 'В наявності'),
        ('LOW_STOCK', 'Мало залишилось'),
        ('OUT_OF_STOCK', 'Закінчилась'),
        ('DISCONTINUED', 'Знято з виробництва'),
        ('RESERVED', 'Зарезервовано'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    name = models.CharField(
        max_length=200,
        verbose_name="Назва запчастини"
    )
    
    part_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Номер запчастини"
    )
    
    manufacturer_part_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Номер виробника"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис"
    )
    
    category = models.ForeignKey(
        SparePartCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Категорія"
    )
    
    # Зв'язок з обладнанням
    compatible_equipment = models.ManyToManyField(
        Equipment,
        blank=True,
        related_name='spare_parts',
        verbose_name="Сумісне обладнання"
    )
    
    # Інвентарні дані
    quantity_in_stock = models.PositiveIntegerField(
        default=0,
        verbose_name="Кількість в наявності"
    )
    
    minimum_stock_level = models.PositiveIntegerField(
        default=1,
        verbose_name="Мінімальний рівень запасів"
    )
    
    maximum_stock_level = models.PositiveIntegerField(
        default=100,
        verbose_name="Максимальний рівень запасів"
    )
    
    reorder_point = models.PositiveIntegerField(
        default=5,
        verbose_name="Точка перезамовлення"
    )
    
    # Фінансові дані
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Вартість одиниці"
    )
    
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Ціна одиниці"
    )
    
    # Технічні характеристики
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name="Вага (кг)"
    )
    
    dimensions = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Розміри"
    )
    
    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        default='NEW',
        verbose_name="Стан"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_STOCK',
        verbose_name="Статус"
    )
    
    # Постачальники
    primary_supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='primary_parts',
        verbose_name="Основний постачальник"
    )
    
    alternative_suppliers = models.ManyToManyField(
        Supplier,
        blank=True,
        related_name='alternative_parts',
        verbose_name="Альтернативні постачальники"
    )
    
    # Місце зберігання
    storage_location = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Місце зберігання"
    )
    
    # Дати
    last_received_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата останнього отримання"
    )
    
    last_issued_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата останньої видачі"
    )
    
    expiry_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Термін придатності"
    )
    
    warranty_period_days = models.PositiveIntegerField(
        default=0,
        verbose_name="Гарантійний період (дні)"
    )
    
    # Додаткові поля
    barcode = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Штрих-код"
    )
    
    image = models.ImageField(
        upload_to='spare_parts/',
        blank=True,
        null=True,
        verbose_name="Зображення"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    is_critical = models.BooleanField(
        default=False,
        verbose_name="Критична запчастина"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Створено"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Оновлено"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Створено користувачем"
    )
    
    class Meta:
        verbose_name = "Запчастина"
        verbose_name_plural = "Запчастини"
        ordering = ['name']
        indexes = [
            models.Index(fields=['part_number']),
            models.Index(fields=['status']),
            models.Index(fields=['quantity_in_stock']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.part_number})"
    
    @property
    def total_value(self):
        """Загальна вартість запасів"""
        return self.quantity_in_stock * self.unit_cost
    
    @property
    def needs_reorder(self):
        """Чи потрібно перезамовлення"""
        return self.quantity_in_stock <= self.reorder_point
    
    @property
    def is_low_stock(self):
        """Чи мало запасів"""
        return self.quantity_in_stock <= self.minimum_stock_level
    
    def update_status(self):
        """Оновити статус на основі кількості"""
        if self.quantity_in_stock == 0:
            self.status = 'OUT_OF_STOCK'
        elif self.is_low_stock:
            self.status = 'LOW_STOCK'
        else:
            self.status = 'IN_STOCK'


class SparePartMovement(models.Model):
    """Рух запчастин"""
    
    MOVEMENT_TYPES = [
        ('RECEIPT', 'Надходження'),
        ('ISSUE', 'Видача'),
        ('RETURN', 'Повернення'),
        ('ADJUSTMENT', 'Коригування'),
        ('TRANSFER', 'Переміщення'),
        ('WRITE_OFF', 'Списання'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        related_name='movements',
        verbose_name="Запчастина"
    )
    
    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPES,
        verbose_name="Тип руху"
    )
    
    quantity = models.IntegerField(
        verbose_name="Кількість"
    )
    
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Вартість одиниці"
    )
    
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Номер документу"
    )
    
    # Зв'язок з обладнанням (для видач)
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Обладнання"
    )
    
    # Зв'язок з ТО (для видач на ремонт)
    maintenance_request = models.ForeignKey(
        'MaintenanceRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Запит на ТО"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Виконав"
    )
    
    performed_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Дата операції"
    )
    
    class Meta:
        verbose_name = "Рух запчастин"
        verbose_name_plural = "Рух запчастин"
        ordering = ['-performed_at']
    
    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.spare_part.name} ({self.quantity})"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Оновити кількість запчастин
        if self.movement_type == 'RECEIPT':
            self.spare_part.quantity_in_stock += self.quantity
        elif self.movement_type in ['ISSUE', 'WRITE_OFF']:
            self.spare_part.quantity_in_stock -= self.quantity
        elif self.movement_type == 'RETURN':
            self.spare_part.quantity_in_stock += self.quantity
        elif self.movement_type == 'ADJUSTMENT':
            # Для коригування quantity може бути негативним
            self.spare_part.quantity_in_stock += self.quantity
        
        # Оновити дати
        if self.movement_type == 'RECEIPT':
            self.spare_part.last_received_date = self.performed_at
        elif self.movement_type == 'ISSUE':
            self.spare_part.last_issued_date = self.performed_at
        
        # Оновити статус
        self.spare_part.update_status()
        self.spare_part.save()


class PurchaseOrder(models.Model):
    """Замовлення на закупівлю"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Чернетка'),
        ('PENDING', 'Очікує підтвердження'),
        ('APPROVED', 'Схвалено'),
        ('ORDERED', 'Замовлено'),
        ('PARTIALLY_RECEIVED', 'Частково отримано'),
        ('RECEIVED', 'Отримано'),
        ('CANCELLED', 'Скасовано'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    order_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Номер замовлення"
    )
    
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        verbose_name="Постачальник"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        verbose_name="Статус"
    )
    
    order_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="Дата замовлення"
    )
    
    expected_delivery_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Очікувана дата доставки"
    )
    
    actual_delivery_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Фактична дата доставки"
    )
    
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Загальна сума"
    )
    
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Сума податку"
    )
    
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Вартість доставки"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_orders',
        verbose_name="Створено користувачем"
    )
    
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_orders',
        verbose_name="Схвалено користувачем"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Створено"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Оновлено"
    )
    
    class Meta:
        verbose_name = "Замовлення на закупівлю"
        verbose_name_plural = "Замовлення на закупівлю"
        ordering = ['-order_date']
    
    def __str__(self):
        return f"Замовлення {self.order_number} - {self.supplier.name}"


class PurchaseOrderItem(models.Model):
    """Позиція замовлення на закупівлю"""
    
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Замовлення"
    )
    
    spare_part = models.ForeignKey(
        SparePart,
        on_delete=models.CASCADE,
        verbose_name="Запчастина"
    )
    
    quantity_ordered = models.PositiveIntegerField(
        verbose_name="Замовлена кількість"
    )
    
    quantity_received = models.PositiveIntegerField(
        default=0,
        verbose_name="Отримана кількість"
    )
    
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Ціна одиниці"
    )
    
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Загальна ціна"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    class Meta:
        verbose_name = "Позиція замовлення"
        verbose_name_plural = "Позиції замовлення"
        unique_together = ['purchase_order', 'spare_part']
    
    def __str__(self):
        return f"{self.spare_part.name} x {self.quantity_ordered}"
    
    @property
    def quantity_pending(self):
        """Кількість що очікується"""
        return self.quantity_ordered - self.quantity_received
    
    @property
    def is_fully_received(self):
        """Чи повністю отримано"""
        return self.quantity_received >= self.quantity_ordered
    
    def save(self, *args, **kwargs):
        self.total_price = self.quantity_ordered * self.unit_price
        super().save(*args, **kwargs)


class SparePartsService:
    """Сервіс для управління запчастинами"""
    
    @classmethod
    def create_spare_part(cls, name, part_number, category=None, **kwargs):
        """Створити нову запчастину"""
        spare_part = SparePart.objects.create(
            name=name,
            part_number=part_number,
            category=category,
            **kwargs
        )
        return spare_part
    
    @classmethod
    def issue_spare_part(cls, spare_part_id, quantity, equipment=None, 
                        maintenance_request=None, performed_by=None, notes=None):
        """Видати запчастину"""
        try:
            spare_part = SparePart.objects.get(id=spare_part_id)
            
            if spare_part.quantity_in_stock < quantity:
                return None, "Недостатньо запчастин в наявності"
            
            # Створити рух
            movement = SparePartMovement.objects.create(
                spare_part=spare_part,
                movement_type='ISSUE',
                quantity=quantity,
                unit_cost=spare_part.unit_cost,
                equipment=equipment,
                maintenance_request=maintenance_request,
                performed_by=performed_by,
                notes=notes
            )
            
            return movement, None
        except SparePart.DoesNotExist:
            return None, "Запчастина не знайдена"
    
    @classmethod
    def receive_spare_part(cls, spare_part_id, quantity, unit_cost=None, 
                          reference_number=None, performed_by=None):
        """Отримати запчастину"""
        try:
            spare_part = SparePart.objects.get(id=spare_part_id)
            
            movement = SparePartMovement.objects.create(
                spare_part=spare_part,
                movement_type='RECEIPT',
                quantity=quantity,
                unit_cost=unit_cost or spare_part.unit_cost,
                reference_number=reference_number,
                performed_by=performed_by
            )
            
            return movement, None
        except SparePart.DoesNotExist:
            return None, "Запчастина не знайдена"
    
    @classmethod
    def get_low_stock_parts(cls):
        """Отримати запчастини з низьким рівнем запасів"""
        return SparePart.objects.filter(
            quantity_in_stock__lte=models.F('minimum_stock_level'),
            status__in=['IN_STOCK', 'LOW_STOCK']
        )
    
    @classmethod
    def get_reorder_suggestions(cls):
        """Отримати пропозиції для перезамовлення"""
        parts_to_reorder = SparePart.objects.filter(
            quantity_in_stock__lte=models.F('reorder_point'),
            status__in=['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']
        )
        
        suggestions = []
        for part in parts_to_reorder:
            suggested_quantity = part.maximum_stock_level - part.quantity_in_stock
            suggestions.append({
                'part': part,
                'current_stock': part.quantity_in_stock,
                'suggested_quantity': suggested_quantity,
                'estimated_cost': suggested_quantity * part.unit_cost
            })
        
        return suggestions
    
    @classmethod
    def create_purchase_order(cls, supplier_id, items, created_by=None):
        """Створити замовлення на закупівлю"""
        try:
            supplier = Supplier.objects.get(id=supplier_id)
            
            # Генерувати номер замовлення
            order_number = cls._generate_order_number()
            
            # Створити замовлення
            purchase_order = PurchaseOrder.objects.create(
                order_number=order_number,
                supplier=supplier,
                created_by=created_by
            )
            
            total_amount = Decimal('0.00')
            
            # Додати позиції
            for item_data in items:
                spare_part = SparePart.objects.get(id=item_data['spare_part_id'])
                quantity = item_data['quantity']
                unit_price = item_data.get('unit_price', spare_part.unit_cost)
                
                order_item = PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order,
                    spare_part=spare_part,
                    quantity_ordered=quantity,
                    unit_price=unit_price
                )
                
                total_amount += order_item.total_price
            
            # Оновити загальну суму
            purchase_order.total_amount = total_amount
            purchase_order.save()
            
            return purchase_order, None
        except Exception as e:
            return None, str(e)
    
    @classmethod
    def receive_purchase_order(cls, order_id, received_items, performed_by=None):
        """Отримати замовлення"""
        try:
            purchase_order = PurchaseOrder.objects.get(id=order_id)
            
            for item_data in received_items:
                order_item = PurchaseOrderItem.objects.get(
                    id=item_data['item_id']
                )
                quantity_received = item_data['quantity_received']
                
                # Оновити кількість в позиції
                order_item.quantity_received += quantity_received
                order_item.save()
                
                # Створити рух запчастин
                cls.receive_spare_part(
                    spare_part_id=order_item.spare_part.id,
                    quantity=quantity_received,
                    unit_cost=order_item.unit_price,
                    reference_number=purchase_order.order_number,
                    performed_by=performed_by
                )
            
            # Оновити статус замовлення
            cls._update_purchase_order_status(purchase_order)
            
            return purchase_order, None
        except Exception as e:
            return None, str(e)
    
    @classmethod
    def get_inventory_dashboard(cls):
        """Отримати дані для дашборду запчастин"""
        data = {
            'total_parts': SparePart.objects.count(),
            'total_value': 0,
            'low_stock_count': 0,
            'out_of_stock_count': 0,
            'pending_orders': 0,
            'recent_movements': []
        }
        
        # Загальна вартість
        total_value = SparePart.objects.aggregate(
            total=models.Sum(
                models.F('quantity_in_stock') * models.F('unit_cost'),
                output_field=models.DecimalField()
            )
        )['total']
        data['total_value'] = total_value or 0
        
        # Статистика по запасах
        data['low_stock_count'] = SparePart.objects.filter(status='LOW_STOCK').count()
        data['out_of_stock_count'] = SparePart.objects.filter(status='OUT_OF_STOCK').count()
        
        # Замовлення в очікуванні
        data['pending_orders'] = PurchaseOrder.objects.filter(
            status__in=['PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED']
        ).count()
        
        # Останні рухи
        recent_movements = SparePartMovement.objects.select_related(
            'spare_part', 'performed_by'
        ).order_by('-performed_at')[:10]
        
        data['recent_movements'] = [
            {
                'id': movement.id,
                'spare_part_name': movement.spare_part.name,
                'movement_type': movement.get_movement_type_display(),
                'quantity': movement.quantity,
                'performed_by': movement.performed_by.get_full_name() if movement.performed_by else None,
                'performed_at': movement.performed_at.isoformat()
            }
            for movement in recent_movements
        ]
        
        return data
    
    @classmethod
    def _generate_order_number(cls):
        """Генерувати номер замовлення"""
        today = timezone.now().date()
        prefix = f"PO{today.strftime('%Y%m%d')}"
        
        # Знайти останній номер за сьогодні
        last_order = PurchaseOrder.objects.filter(
            order_number__startswith=prefix
        ).order_by('-order_number').first()
        
        if last_order:
            # Витягти номер і збільшити
            last_num = int(last_order.order_number[-3:])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:03d}"
    
    @classmethod
    def _update_purchase_order_status(cls, purchase_order):
        """Оновити статус замовлення на основі отриманих позицій"""
        items = purchase_order.items.all()
        total_items = items.count()
        fully_received = items.filter(
            quantity_received__gte=models.F('quantity_ordered')
        ).count()
        partially_received = items.filter(
            quantity_received__gt=0,
            quantity_received__lt=models.F('quantity_ordered')
        ).count()
        
        if fully_received == total_items:
            purchase_order.status = 'RECEIVED'
            purchase_order.actual_delivery_date = timezone.now().date()
        elif partially_received > 0 or fully_received > 0:
            purchase_order.status = 'PARTIALLY_RECEIVED'
        
        purchase_order.save()