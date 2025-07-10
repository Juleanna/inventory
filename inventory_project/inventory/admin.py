# inventory/admin.py (покращена версія)
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.shortcuts import redirect, render
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
import csv
import json

from unfold.admin import ModelAdmin
from unfold.decorators import action
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter, MultipleChoicesDropdownFilter,
    TextFilter, FieldTextFilter, RangeDateFilter
)
from unfold.contrib.import_export.forms import ExportForm, ImportForm

from import_export.admin import ImportExportModelAdmin
from simple_history.admin import SimpleHistoryAdmin

from .models import Equipment, Notification, Software, PeripheralDevice, EquipmentDocument
from django.utils.translation import gettext_lazy as _

class EquipmentLocationFilter(admin.SimpleListFilter):
    """Кастомний фільтр для місцезнаходження"""
    title = _('Місцезнаходження (групи)')
    parameter_name = 'location_group'

    def lookups(self, request, model_admin):
        # Групувати локації по ключовим словам
        locations = Equipment.objects.values_list('location', flat=True).distinct()
        groups = {}
        
        for location in locations:
            if location:
                if 'офіс' in location.lower() or 'office' in location.lower():
                    groups['office'] = 'Офіси'
                elif 'склад' in location.lower() or 'warehouse' in location.lower():
                    groups['warehouse'] = 'Склади'
                elif 'сервер' in location.lower() or 'server' in location.lower():
                    groups['server'] = 'Серверні'
                else:
                    groups['other'] = 'Інше'
        
        return list(groups.items())

    def queryset(self, request, queryset):
        if self.value() == 'office':
            return queryset.filter(Q(location__icontains='офіс') | Q(location__icontains='office'))
        elif self.value() == 'warehouse':
            return queryset.filter(Q(location__icontains='склад') | Q(location__icontains='warehouse'))
        elif self.value() == 'server':
            return queryset.filter(Q(location__icontains='сервер') | Q(location__icontains='server'))
        elif self.value() == 'other':
            return queryset.exclude(
                Q(location__icontains='офіс') | Q(location__icontains='office') |
                Q(location__icontains='склад') | Q(location__icontains='warehouse') |
                Q(location__icontains='сервер') | Q(location__icontains='server')
            )

class EquipmentStatusFilter(admin.SimpleListFilter):
    """Фільтр статусу з додатковою логікою"""
    title = _('Статус (розширений)')
    parameter_name = 'status_extended'

    def lookups(self, request, model_admin):
        return [
            ('active', 'Активне (робоче + обслуговування)'),
            ('problematic', 'Проблемне (ремонт + втрачено)'),
            ('inactive', 'Неактивне (списано + на складі)'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'active':
            return queryset.filter(status__in=['WORKING', 'MAINTENANCE'])
        elif self.value() == 'problematic':
            return queryset.filter(status__in=['REPAIR', 'LOST'])
        elif self.value() == 'inactive':
            return queryset.filter(status__in=['DISPOSED', 'STORAGE'])

@admin.register(Equipment)
class EquipmentAdmin(SimpleHistoryAdmin, ImportExportModelAdmin, ModelAdmin):
    list_display = (
        'name', 'category', 'manufacturer', 'serial_number', 'location', 
        'status_badge', 'current_user', 'purchase_date', 'warranty_status',
        'maintenance_status', 'value_display', 'qr_code_preview'
    )
    
    list_filter = (
        ('category', MultipleChoicesDropdownFilter),
        ('status', MultipleChoicesDropdownFilter),
        EquipmentStatusFilter,
        EquipmentLocationFilter,
        ('purchase_date', RangeDateFilter),
        ('warranty_until', RangeDateFilter),
        ('manufacturer', ChoicesDropdownFilter),
        'priority'
    )
    
    search_fields = (
        'name', 'serial_number', 'manufacturer', 'model', 
        'mac_address', 'ip_address', 'hostname', 'location',
        'current_user__username', 'current_user__first_name', 'current_user__last_name'
    )
    
    ordering = ['name', 'status']
    
    fieldsets = (
        (_('Основна інформація'), {
            'fields': ('name', 'category', 'manufacturer', 'model', 'description'),
            'classes': ['tab']
        }),
        (_('Ідентифікація'), {
            'fields': ('serial_number', 'inventory_number', 'asset_tag'),
            'classes': ['tab']
        }),
        (_('Мережеві параметри'), {
            'fields': ('mac_address', 'ip_address', 'hostname'),
            'classes': ['tab']
        }),
        (_('Розташування та статус'), {
            'fields': ('location', 'building', 'floor', 'room', 'status', 'priority'),
            'classes': ['tab']
        }),
        (_('Користувачі'), {
            'fields': ('current_user', 'responsible_person'),
            'classes': ['tab']
        }),
        (_('Дати'), {
            'fields': ('purchase_date', 'warranty_until', 'last_maintenance_date', 'next_maintenance_date', 'expiry_date'),
            'classes': ['tab']
        }),
        (_('Фінансова інформація'), {
            'fields': ('supplier', 'purchase_price', 'depreciation_rate'),
            'classes': ['tab']
        }),
        (_('Технічні характеристики'), {
            'fields': ('cpu', 'ram', 'storage', 'gpu', 'operating_system'),
            'classes': ['tab']
        }),
        (_('Додатково'), {
            'fields': ('notes', 'photo', 'documents'),
            'classes': ['tab']
        }),
    )
    
    readonly_fields = ('barcode_image', 'qrcode_image', 'created_at', 'updated_at')
    
    # Дозволи для дій
    def has_mark_as_disposed_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_generate_qr_codes_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_schedule_maintenance_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_export_to_csv_permission(self, request):
        return request.user.has_perm('inventory.view_equipment')
    
    # Список дій
    actions_list = [
        "mark_as_disposed",
        "schedule_maintenance", 
        "generate_qr_codes",
        {
            "title": _("Експорт"),
            "icon": "download",
            "items": ["export_to_csv", "export_financial_report"],
        },
        {
            "title": _("Обслуговування"),
            "icon": "settings",
            "items": ["mark_maintenance_complete", "reset_maintenance_schedule"],
        }
    ]
    
    # Кастомні методи відображення
    def status_badge(self, obj):
        """Відображення статусу як badge"""
        status_colors = {
            'WORKING': 'success',
            'REPAIR': 'warning', 
            'MAINTENANCE': 'info',
            'STORAGE': 'secondary',
            'DISPOSED': 'danger',
            'LOST': 'dark'
        }
        
        color = status_colors.get(obj.status, 'secondary')
        status_text = obj.get_status_display()
        
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, status_text
        )
    status_badge.short_description = _('Статус')
    
    def warranty_status(self, obj):
        """Статус гарантії"""
        if not obj.warranty_until:
            return format_html('<span class="text-muted">Немає даних</span>')
        
        today = timezone.now().date()
        if obj.warranty_until < today:
            return format_html('<span class="text-danger">Закінчилась</span>')
        elif obj.warranty_until <= today + timedelta(days=30):
            return format_html('<span class="text-warning">Закінчується</span>')
        else:
            return format_html('<span class="text-success">Діє</span>')
    warranty_status.short_description = _('Гарантія')
    
    def maintenance_status(self, obj):
        """Статус обслуговування"""
        if obj.needs_maintenance():
            return format_html('<span class="text-danger">Потрібне</span>')
        elif obj.next_maintenance_date:
            days_left = (obj.next_maintenance_date - timezone.now().date()).days
            if days_left <= 7:
                return format_html('<span class="text-warning">Скоро</span>')
            else:
                return format_html('<span class="text-success">Заплановано</span>')
        else:
            return format_html('<span class="text-muted">Не заплановано</span>')
    maintenance_status.short_description = _('Обслуговування')
    
    def value_display(self, obj):
        """Відображення вартості"""
        if obj.purchase_price:
            current_value = obj.get_depreciation_value()
            if current_value:
                return format_html(
                    '{:.2f} ₴<br><small class="text-muted">({:.2f} ₴)</small>',
                    obj.purchase_price, current_value
                )
            else:
                return format_html('{:.2f} ₴', obj.purchase_price)
        return format_html('<span class="text-muted">Не вказано</span>')
    value_display.short_description = _('Вартість (поточна)')
    
    def qr_code_preview(self, obj):
        """Превʼю QR-коду"""
        if obj.qrcode_image:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="width: 40px; height: 40px;" '
                'title="Клікніть для збільшення"/></a>',
                obj.qrcode_image.url, obj.qrcode_image.url
            )
        return format_html('<span class="text-muted">Немає</span>')
    qr_code_preview.short_description = _('QR-код')
    
    # Дії
    @action(
        description=_("Списати обладнання"),
        permissions=["mark_as_disposed"],
    )
    def mark_as_disposed(self, request, queryset):
        """Списати обладнання"""
        updated = queryset.filter(status__in=['WORKING', 'REPAIR', 'STORAGE']).update(
            status='DISPOSED'
        )
        
        # Створити уведомлення
        for equipment in queryset.filter(status='DISPOSED'):
            if equipment.responsible_person:
                Notification.objects.create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Обладнання списано",
                    message=f"Обладнання '{equipment.name}' ({equipment.serial_number}) було списано",
                    notification_type='INFO',
                    priority='MEDIUM'
                )
        
        self.message_user(
            request, 
            f"Списано {updated} одиниць обладнання", 
            messages.SUCCESS
        )
    
    @action(
        description=_("Запланувати обслуговування"),
        permissions=["schedule_maintenance"],
    )
    def schedule_maintenance(self, request, queryset):
        """Запланувати обслуговування"""
        if 'confirm' in request.POST:
            days = int(request.POST.get('days', 365))
            next_date = timezone.now().date() + timedelta(days=days)
            
            updated = 0
            for equipment in queryset:
                equipment.next_maintenance_date = next_date
                equipment.save(update_fields=['next_maintenance_date'])
                updated += 1
                
                # Створити уведомлення
                if equipment.responsible_person:
                    Notification.objects.create(
                        user=equipment.responsible_person,
                        equipment=equipment,
                        title="Заплановано обслуговування",
                        message=f"Для обладнання '{equipment.name}' заплановано обслуговування на {next_date}",
                        notification_type='INFO',
                        priority='MEDIUM'
                    )
            
            self.message_user(
                request,
                f"Заплановано обслуговування для {updated} одиниць обладнання на {next_date}",
                messages.SUCCESS
            )
            return redirect(request.get_full_path())
        
        return render(request, 'admin/schedule_maintenance.html', {
            'title': 'Планування обслуговування',
            'queryset': queryset,
            'action_checkbox_name': admin.ACTION_CHECKBOX_NAME,
        })
    
    @action(
        description=_("Згенерувати QR-коди"),
        permissions=["generate_qr_codes"],
    )
    def generate_qr_codes(self, request, queryset):
        """Згенерувати QR-коди для обладнання"""
        updated = 0
        for equipment in queryset:
            try:
                equipment.generate_qrcode()
                equipment.save(update_fields=['qrcode_image'])
                updated += 1
            except Exception as e:
                messages.error(request, f"Помилка генерації QR-коду для {equipment.name}: {e}")
        
        self.message_user(
            request,
            f"Згенеровано QR-коди для {updated} одиниць обладнання",
            messages.SUCCESS
        )
    
    @action(
        description=_("Експортувати в CSV"),
        permissions=["export_to_csv"],
    )
    def export_to_csv(self, request, queryset):
        """Експорт даних в CSV"""
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="equipment_export_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Назва', 'Категорія', 'Виробник', 'Модель', 'Серійний номер',
            'Статус', 'Місцезнаходження', 'Користувач', 'Дата покупки',
            'Вартість', 'Гарантія до'
        ])
        
        for equipment in queryset:
            writer.writerow([
                equipment.name,
                equipment.get_category_display(),
                equipment.manufacturer or '',
                equipment.model or '',
                equipment.serial_number,
                equipment.get_status_display(),
                equipment.location,
                equipment.current_user.get_full_name() if equipment.current_user else '',
                equipment.purchase_date or '',
                equipment.purchase_price or '',
                equipment.warranty_until or ''
            ])
        
        return response
    
    @action(
        description=_("Фінансовий звіт"),
        permissions=["export_to_csv"],
    )
    def export_financial_report(self, request, queryset):
        """Експорт фінансового звіту"""
        total_value = queryset.aggregate(total=Sum('purchase_price'))['total'] or 0
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="financial_report_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Фінансовий звіт', f'Створено: {timezone.now().strftime("%d.%m.%Y %H:%M")}'])
        writer.writerow(['Загальна вартість:', f'{total_value:.2f} ₴'])
        writer.writerow([])
        
        writer.writerow([
            'Назва', 'Серійний номер', 'Дата покупки', 'Початкова вартість',
            'Поточна вартість', 'Амортизація'
        ])
        
        for equipment in queryset.filter(purchase_price__isnull=False):
            current_value = equipment.get_depreciation_value() or 0
            depreciation = equipment.purchase_price - current_value
            
            writer.writerow([
                equipment.name,
                equipment.serial_number,
                equipment.purchase_date or '',
                f'{equipment.purchase_price:.2f}',
                f'{current_value:.2f}',
                f'{depreciation:.2f}'
            ])
        
        return response
    
    @action(
        description=_("Відмітити обслуговування завершеним"),
        permissions=["schedule_maintenance"],
    )
    def mark_maintenance_complete(self, request, queryset):
        """Відмітити обслуговування як завершене"""
        today = timezone.now().date()
        next_year = today + timedelta(days=365)
        
        updated = 0
        for equipment in queryset:
            equipment.last_maintenance_date = today
            equipment.next_maintenance_date = next_year
            equipment.save(update_fields=['last_maintenance_date', 'next_maintenance_date'])
            updated += 1
        
        self.message_user(
            request,
            f"Обслуговування завершено для {updated} одиниць обладнання",
            messages.SUCCESS
        )
    
    # Кастомні URL
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_site.admin_view(self.analytics_view), name='equipment_analytics'),
            path('generate_labels/', self.admin_site.admin_view(self.generate_labels_view), name='equipment_labels'),
        ]
        return custom_urls + urls
    
    def analytics_view(self, request):
        """Сторінка аналітики"""
        from .models import Equipment
        
        # Статистика
        stats = {
            'total': Equipment.objects.count(),
            'working': Equipment.objects.filter(status='WORKING').count(),
            'repair': Equipment.objects.filter(status='REPAIR').count(),
            'disposed': Equipment.objects.filter(status='DISPOSED').count(),
        }
        
        # По категоріях
        by_category = Equipment.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        context = {
            'title': 'Аналітика обладнання',
            'stats': stats,
            'by_category': by_category,
            'opts': self.model._meta,
        }
        
        return render(request, 'admin/equipment_analytics.html', context)
    
    def generate_labels_view(self, request):
        """Генерація етикеток"""
        if request.method == 'POST':
            selected_ids = request.POST.getlist('selected_equipment')
            equipment_list = Equipment.objects.filter(id__in=selected_ids)
            
            # Тут можна додати генерацію PDF з етикетками
            response = HttpResponse(content_type='application/json')
            labels_data = []
            
            for equipment in equipment_list:
                labels_data.append({
                    'name': equipment.name,
                    'serial': equipment.serial_number,
                    'qr_url': equipment.qrcode_image.url if equipment.qrcode_image else None
                })
            
            response.content = json.dumps(labels_data, ensure_ascii=False)
            return response
        
        equipment_list = Equipment.objects.all()
        context = {
            'title': 'Генерація етикеток',
            'equipment_list': equipment_list,
            'opts': self.model._meta,
        }
        
        return render(request, 'admin/generate_labels.html', context)


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ('title', 'user', 'equipment', 'notification_type', 'priority', 'read', 'created_at')
    list_filter = (
        ('notification_type', ChoicesDropdownFilter),
        ('priority', ChoicesDropdownFilter),
        'read',
        ('created_at', RangeDateFilter)
    )
    search_fields = ('title', 'message', 'user__username', 'equipment__name')
    ordering = ('-created_at',)
    
    readonly_fields = ('created_at', 'read_at')
    
    def mark_all_as_read(self, request, queryset):
        """Відмітити як прочитане"""
        updated = queryset.filter(read=False).update(
            read=True,
            read_at=timezone.now()
        )
        self.message_user(request, f"Відмічено {updated} уведомлень як прочитані")
    
    mark_all_as_read.short_description = "Відмітити як прочитані"
    actions = [mark_all_as_read]


# Реєстрація інших моделей
@admin.register(Software)
class SoftwareAdmin(ModelAdmin):
    list_display = ('name', 'version', 'vendor', 'license', 'installation_count')
    list_filter = ('vendor',)
    search_fields = ('name', 'vendor', 'version')
    
    def installation_count(self, obj):
        return obj.installed_on.count()
    installation_count.short_description = 'Встановлень'


@admin.register(PeripheralDevice)
class PeripheralDeviceAdmin(ModelAdmin):
    list_display = ('name', 'type', 'serial_number', 'connected_to')
    list_filter = ('type',)
    search_fields = ('name', 'serial_number')


@admin.register(EquipmentDocument)
class EquipmentDocumentAdmin(ModelAdmin):
    list_display = ('equipment', 'description', 'file', 'uploaded_at')
    list_filter = ('uploaded_at',)
    search_fields = ('equipment__name', 'description')