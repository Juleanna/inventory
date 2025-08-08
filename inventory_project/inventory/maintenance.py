# inventory/maintenance.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.cache import cache
from .models import Equipment, Notification
import uuid

User = get_user_model()

class MaintenanceRequest(models.Model):
    """Запит на технічне обслуговування"""
    
    PRIORITY_CHOICES = [
        ('LOW', 'Низький'),
        ('MEDIUM', 'Середній'),
        ('HIGH', 'Високий'),
        ('URGENT', 'Терміновий'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Очікує'),
        ('APPROVED', 'Схвалено'),
        ('IN_PROGRESS', 'Виконується'),
        ('COMPLETED', 'Завершено'),
        ('CANCELLED', 'Скасовано'),
    ]
    
    REQUEST_TYPES = [
        ('SCHEDULED', 'Планове ТО'),
        ('REPAIR', 'Ремонт'),
        ('INSPECTION', 'Перевірка'),
        ('UPGRADE', 'Модернізація'),
        ('REPLACEMENT', 'Заміна'),
        ('CLEANING', 'Очищення'),
    ]
    
    id = models.UUIDField(
        primary_key=True, 
        default=uuid.uuid4, 
        editable=False
    )
    
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='maintenance_requests',
        verbose_name="Обладнання"
    )
    
    request_type = models.CharField(
        max_length=20,
        choices=REQUEST_TYPES,
        verbose_name="Тип запиту"
    )
    
    title = models.CharField(
        max_length=200,
        verbose_name="Заголовок"
    )
    
    description = models.TextField(
        verbose_name="Опис проблеми/робіт"
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
        verbose_name="Пріоритет"
    )
    
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Статус"
    )
    
    # Користувачі
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='maintenance_requests',
        verbose_name="Заявник"
    )
    
    assigned_technician = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_maintenance',
        verbose_name="Призначений технік"
    )
    
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_maintenance',
        verbose_name="Схвалено користувачем"
    )
    
    # Дати
    requested_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="Дата запиту"
    )
    
    scheduled_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Запланована дата"
    )
    
    started_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата початку робіт"
    )
    
    completed_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата завершення"
    )
    
    # Фінанси
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Попередня вартість"
    )
    
    actual_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Фактична вартість"
    )
    
    # Додаткові поля
    parts_needed = models.TextField(
        blank=True,
        verbose_name="Необхідні запчастини"
    )
    
    downtime_required = models.BooleanField(
        default=False,
        verbose_name="Потрібна зупинка обладнання"
    )
    
    estimated_duration = models.DurationField(
        null=True,
        blank=True,
        verbose_name="Очікувана тривалість"
    )
    
    actual_duration = models.DurationField(
        null=True,
        blank=True,
        verbose_name="Фактична тривалість"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    class Meta:
        verbose_name = "Запит на ТО"
        verbose_name_plural = "Запити на ТО"
        ordering = ['-requested_date']
        indexes = [
            models.Index(fields=['equipment', 'status']),
            models.Index(fields=['assigned_technician', 'status']),
            models.Index(fields=['scheduled_date']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.equipment.name}"
    
    def save(self, *args, **kwargs):
        # Автоматично встановити дати при зміні статусу
        if self.pk:
            old_instance = MaintenanceRequest.objects.get(pk=self.pk)
            
            # Початок робіт
            if old_instance.status != 'IN_PROGRESS' and self.status == 'IN_PROGRESS':
                self.started_date = timezone.now()
            
            # Завершення робіт
            if old_instance.status != 'COMPLETED' and self.status == 'COMPLETED':
                self.completed_date = timezone.now()
                if self.started_date:
                    self.actual_duration = self.completed_date - self.started_date
        
        super().save(*args, **kwargs)


class MaintenanceSchedule(models.Model):
    """Розклад планового технічного обслуговування"""
    
    FREQUENCY_CHOICES = [
        ('DAILY', 'Щодня'),
        ('WEEKLY', 'Щотижня'),
        ('MONTHLY', 'Щомісяця'),
        ('QUARTERLY', 'Щоквартально'),
        ('SEMI_ANNUALLY', 'Раз на півроку'),
        ('ANNUALLY', 'Щорічно'),
        ('CUSTOM', 'Користувацький'),
    ]
    
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='maintenance_schedules',
        verbose_name="Обладнання"
    )
    
    title = models.CharField(
        max_length=200,
        verbose_name="Назва ТО"
    )
    
    description = models.TextField(
        verbose_name="Опис робіт"
    )
    
    frequency = models.CharField(
        max_length=15,
        choices=FREQUENCY_CHOICES,
        verbose_name="Періодичність"
    )
    
    custom_interval_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Інтервал (дні)"
    )
    
    next_maintenance = models.DateTimeField(
        verbose_name="Наступне ТО"
    )
    
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Відповідальна особа"
    )
    
    estimated_duration = models.DurationField(
        verbose_name="Очікувана тривалість"
    )
    
    checklist = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Чек-лист робіт"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Активний"
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
        verbose_name = "Розклад ТО"
        verbose_name_plural = "Розклади ТО"
        ordering = ['next_maintenance']
    
    def __str__(self):
        return f"{self.title} - {self.equipment.name}"
    
    def calculate_next_maintenance(self):
        """Розрахувати дату наступного ТО"""
        now = timezone.now()
        
        if self.frequency == 'DAILY':
            return now + timedelta(days=1)
        elif self.frequency == 'WEEKLY':
            return now + timedelta(weeks=1)
        elif self.frequency == 'MONTHLY':
            return now + timedelta(days=30)
        elif self.frequency == 'QUARTERLY':
            return now + timedelta(days=90)
        elif self.frequency == 'SEMI_ANNUALLY':
            return now + timedelta(days=180)
        elif self.frequency == 'ANNUALLY':
            return now + timedelta(days=365)
        elif self.frequency == 'CUSTOM' and self.custom_interval_days:
            return now + timedelta(days=self.custom_interval_days)
        
        return now + timedelta(days=30)  # Default


class MaintenanceTask(models.Model):
    """Конкретне завдання в рамках ТО"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Очікує'),
        ('IN_PROGRESS', 'Виконується'),
        ('COMPLETED', 'Виконано'),
        ('SKIPPED', 'Пропущено'),
        ('FAILED', 'Невдало'),
    ]
    
    maintenance_request = models.ForeignKey(
        MaintenanceRequest,
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name="Запит на ТО"
    )
    
    title = models.CharField(
        max_length=200,
        verbose_name="Назва завдання"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="Опис"
    )
    
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Статус"
    )
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Призначено"
    )
    
    estimated_duration = models.DurationField(
        null=True,
        blank=True,
        verbose_name="Очікувана тривалість"
    )
    
    actual_duration = models.DurationField(
        null=True,
        blank=True,
        verbose_name="Фактична тривалість"
    )
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Розпочато"
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Завершено"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Примітки"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Порядок виконання"
    )
    
    class Meta:
        verbose_name = "Завдання ТО"
        verbose_name_plural = "Завдання ТО"
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.title} ({self.maintenance_request.title})"


class MaintenanceService:
    """Сервіс для управління технічним обслуговуванням"""
    
    @classmethod
    def create_maintenance_request(cls, equipment, request_type, title, description, 
                                 requester, priority='MEDIUM', scheduled_date=None):
        """Створити запит на ТО"""
        request = MaintenanceRequest.objects.create(
            equipment=equipment,
            request_type=request_type,
            title=title,
            description=description,
            requester=requester,
            priority=priority,
            scheduled_date=scheduled_date
        )
        
        # Створити сповіщення для відповідальних осіб
        cls._notify_maintenance_request(request)
        
        return request
    
    @classmethod
    def assign_technician(cls, request_id, technician, estimated_cost=None):
        """Призначити техніка на запит"""
        try:
            request = MaintenanceRequest.objects.get(id=request_id)
            request.assigned_technician = technician
            request.status = 'APPROVED'
            
            if estimated_cost:
                request.estimated_cost = estimated_cost
            
            request.save()
            
            # Сповістити техніка
            Notification.objects.create(
                user=technician,
                title=f"Призначено ТО: {request.title}",
                message=f"Вам призначено технічне обслуговування для {request.equipment.name}",
                notification_type='INFO',
                priority=request.priority,
                equipment=request.equipment
            )
            
            return request
        except MaintenanceRequest.DoesNotExist:
            return None
    
    @classmethod
    def start_maintenance(cls, request_id, technician):
        """Розпочати виконання ТО"""
        try:
            request = MaintenanceRequest.objects.get(
                id=request_id,
                assigned_technician=technician
            )
            
            request.status = 'IN_PROGRESS'
            request.started_date = timezone.now()
            request.save()
            
            # Оновити статус обладнання
            request.equipment.status = 'MAINTENANCE'
            request.equipment.save()
            
            return request
        except MaintenanceRequest.DoesNotExist:
            return None
    
    @classmethod
    def complete_maintenance(cls, request_id, technician, notes=None, 
                           actual_cost=None, parts_used=None):
        """Завершити ТО"""
        try:
            request = MaintenanceRequest.objects.get(
                id=request_id,
                assigned_technician=technician
            )
            
            request.status = 'COMPLETED'
            request.completed_date = timezone.now()
            
            if notes:
                request.notes = notes
            
            if actual_cost:
                request.actual_cost = actual_cost
            
            if parts_used:
                request.parts_needed = parts_used
            
            request.save()
            
            # Оновити статус обладнання
            request.equipment.status = 'WORKING'
            request.equipment.last_maintenance_date = timezone.now().date()
            
            # Розрахувати наступне ТО
            next_maintenance = cls._calculate_next_maintenance_date(request.equipment)
            if next_maintenance:
                request.equipment.next_maintenance_date = next_maintenance
            
            request.equipment.save()
            
            # Сповістити заявника
            Notification.objects.create(
                user=request.requester,
                title=f"ТО завершено: {request.title}",
                message=f"Технічне обслуговування для {request.equipment.name} успішно завершено",
                notification_type='SUCCESS',
                priority='LOW',
                equipment=request.equipment
            )
            
            return request
        except MaintenanceRequest.DoesNotExist:
            return None
    
    @classmethod
    def get_maintenance_dashboard(cls, user=None):
        """Отримати дані для дашборду ТО"""
        data = {
            'pending_requests': 0,
            'in_progress': 0,
            'overdue': 0,
            'completed_this_week': 0,
            'my_assignments': 0,
            'upcoming_maintenance': []
        }
        
        # Базові запити
        base_qs = MaintenanceRequest.objects.all()
        
        if user and not user.is_staff:
            # Для звичайних користувачів - тільки їх запити
            base_qs = base_qs.filter(
                models.Q(requester=user) | 
                models.Q(assigned_technician=user)
            )
        
        # Статистика
        data['pending_requests'] = base_qs.filter(status='PENDING').count()
        data['in_progress'] = base_qs.filter(status='IN_PROGRESS').count()
        
        # Прострочені
        overdue_date = timezone.now() - timedelta(days=1)
        data['overdue'] = base_qs.filter(
            scheduled_date__lt=overdue_date,
            status__in=['PENDING', 'APPROVED', 'IN_PROGRESS']
        ).count()
        
        # Завершені цього тижня
        week_start = timezone.now() - timedelta(days=7)
        data['completed_this_week'] = base_qs.filter(
            status='COMPLETED',
            completed_date__gte=week_start
        ).count()
        
        # Мої призначення (для техніків)
        if user:
            data['my_assignments'] = base_qs.filter(
                assigned_technician=user,
                status__in=['APPROVED', 'IN_PROGRESS']
            ).count()
        
        # Майбутнє ТО
        upcoming = MaintenanceSchedule.objects.filter(
            is_active=True,
            next_maintenance__lte=timezone.now() + timedelta(days=30)
        ).order_by('next_maintenance')[:10]
        
        data['upcoming_maintenance'] = [
            {
                'id': schedule.id,
                'equipment_name': schedule.equipment.name,
                'title': schedule.title,
                'next_date': schedule.next_maintenance.isoformat(),
                'days_until': (schedule.next_maintenance.date() - timezone.now().date()).days,
                'responsible': schedule.responsible_person.get_full_name() if schedule.responsible_person else None
            }
            for schedule in upcoming
        ]
        
        return data
    
    @classmethod
    def _notify_maintenance_request(cls, request):
        """Сповістити про новий запит на ТО"""
        # Сповістити менеджерів ТО
        maintenance_managers = User.objects.filter(
            groups__name='Maintenance Managers',
            is_active=True
        )
        
        for manager in maintenance_managers:
            Notification.objects.create(
                user=manager,
                title=f"Новий запит на ТО: {request.title}",
                message=f"Користувач {request.requester.get_full_name()} створив запит на ТО для {request.equipment.name}",
                notification_type='INFO',
                priority=request.priority,
                equipment=request.equipment
            )
    
    @classmethod
    def _calculate_next_maintenance_date(cls, equipment):
        """Розрахувати дату наступного ТО"""
        # Знайти активний розклад ТО
        schedule = MaintenanceSchedule.objects.filter(
            equipment=equipment,
            is_active=True
        ).first()
        
        if schedule:
            return schedule.calculate_next_maintenance().date()
        
        # Якщо немає розкладу, використати стандартний інтервал (90 днів)
        return timezone.now().date() + timedelta(days=90)
    
    @classmethod
    def create_scheduled_maintenance_requests(cls):
        """Створити запити на планове ТО (викликається cron/celery)"""
        today = timezone.now()
        upcoming_maintenance = MaintenanceSchedule.objects.filter(
            is_active=True,
            next_maintenance__lte=today + timedelta(days=7),
            next_maintenance__gt=today - timedelta(days=1)
        )
        
        created_requests = []
        
        for schedule in upcoming_maintenance:
            # Перевірити чи немає вже активного запиту
            existing = MaintenanceRequest.objects.filter(
                equipment=schedule.equipment,
                request_type='SCHEDULED',
                status__in=['PENDING', 'APPROVED', 'IN_PROGRESS']
            ).exists()
            
            if not existing:
                request = cls.create_maintenance_request(
                    equipment=schedule.equipment,
                    request_type='SCHEDULED',
                    title=schedule.title,
                    description=schedule.description,
                    requester=schedule.responsible_person or User.objects.filter(is_staff=True).first(),
                    scheduled_date=schedule.next_maintenance
                )
                
                # Оновити дату наступного ТО
                schedule.next_maintenance = schedule.calculate_next_maintenance()
                schedule.save()
                
                created_requests.append(request)
        
        return created_requests