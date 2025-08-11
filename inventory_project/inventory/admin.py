# inventory/admin.py (виправлена версія без помилок)
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.shortcuts import redirect, render
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.db import models
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
import csv
import json

from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import action, display
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter, MultipleChoicesDropdownFilter,
    TextFilter, FieldTextFilter, RangeDateFilter
)
from unfold.contrib.import_export.forms import ExportForm, ImportForm
# Note: Some widgets might not be available in current Unfold version
try:
    from unfold.contrib.forms.widgets import WysiwygWidget
except ImportError:
    WysiwygWidget = None

from import_export.admin import ImportExportModelAdmin
from simple_history.admin import SimpleHistoryAdmin

from .models import (
    Equipment, Notification, Software, PeripheralDevice, EquipmentDocument,
    UserPreferences, UserActivity, CustomDashboard
)
from .spare_parts import (
    Supplier, SparePartCategory, SparePart, SparePartMovement, 
    PurchaseOrder, PurchaseOrderItem
)
from .maintenance import (
    MaintenanceRequest, MaintenanceSchedule, MaintenanceTask
)
from .password_management import (
    SystemCategory, System, SystemAccount, PasswordAccessLog,
    PasswordManagementService
)
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

@admin.register(Equipment)
class EquipmentAdmin(SimpleHistoryAdmin, ModelAdmin):
    list_display = (
        'name', 'category', 'manufacturer', 'serial_number', 'location', 
        'status_badge', 'current_user', 'purchase_date', 'warranty_status',
        'maintenance_status', 'value_display', 'qr_code_preview'
    )
    
    list_filter = (
        ('category', MultipleChoicesDropdownFilter),
        ('status', MultipleChoicesDropdownFilter),
        EquipmentLocationFilter,
        ('purchase_date', RangeDateFilter),
        ('warranty_until', RangeDateFilter),
        ('manufacturer', ChoicesDropdownFilter),
        'purchase_price',  # Змінено з RangeDateFilter на звичайний фільтр
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
    
    readonly_fields = ('barcode_image', 'qrcode_image', 'created_at', 'updated_at', 'get_age_in_years', 'get_depreciation_value', 'is_under_warranty')
    
    # Додаткова конфігурація Unfold
    compressed_fields = True
    warn_unsaved_form = True
    
    # Кастомні віджети для Unfold
    formfield_overrides = {}
    if WysiwygWidget:
        formfield_overrides[models.TextField] = {'widget': WysiwygWidget()}
    
    # Кастомні поля для readonly
    @display(description=_('Вік (роки)'), ordering='purchase_date')
    def get_age_display(self, obj):
        age = obj.get_age_in_years()
        if age:
            return f'{age:.1f} років'
        return '-'
    
    @display(description=_('Поточна вартість'))
    def get_depreciation_display(self, obj):
        value = obj.get_depreciation_value()
        if value:
            return f'{value:.2f} ₴'
        return '-'
    
    @display(description=_('Під гарантією'), boolean=True)
    def warranty_active(self, obj):
        return obj.is_under_warranty()
    
    # Додаємо get_age_display до list_display
    def get_list_display(self, request):
        list_display = list(self.list_display)
        if 'get_age_display' not in list_display:
            list_display.append('get_age_display')
        return list_display
    
    # Дозволи для дій
    def has_mark_as_disposed_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_generate_qr_codes_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_schedule_maintenance_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    def has_export_to_csv_permission(self, request):
        return request.user.has_perm('inventory.view_equipment')
    
    def has_mark_maintenance_complete_permission(self, request):
        return request.user.has_perm('inventory.change_equipment')
    
    # Список дій
    actions_list = [
        "mark_as_disposed",
        "schedule_maintenance", 
        "generate_qr_codes",
        "regenerate_qr_codes",
        "mark_maintenance_complete",
        "check_warranty_status",
        {
            "title": _("Експорт"),
            "icon": "download",
            "items": ["export_to_csv", "export_financial_report"],
        }
    ]
    
    # Кастомні методи відображення
    @display(description=_("Статус"), ordering="status")
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
    
    @display(description=_("Гарантія"), ordering="warranty_until")
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
    
    @display(description=_("Обслуговування"), ordering="next_maintenance_date")
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
    
    @display(description=_("Вартість (поточна)"), ordering="purchase_price")
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
    
    @display(description=_("QR-код"))
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
        permissions=["mark_maintenance_complete"],
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
    
    @action(
        description=_("Оновити QR-коди"),
        permissions=["generate_qr_codes"],
    )
    def regenerate_qr_codes(self, request, queryset):
        """Повторно згенерувати QR-коди"""
        updated = 0
        for equipment in queryset:
            try:
                equipment.generate_qrcode()
                equipment.save(update_fields=['qrcode_image'])
                updated += 1
            except Exception as e:
                messages.error(request, f"Помилка оновлення QR-коду для {equipment.name}: {e}")
        
        self.message_user(
            request,
            f"Оновлено QR-коди для {updated} одиниць обладнання",
            messages.SUCCESS
        )
    
    @action(
        description=_("Перевірити статус гарантії"),
        permissions=["export_to_csv"],
    )
    def check_warranty_status(self, request, queryset):
        """Перевірити статус гарантії для обладнання"""
        expired = 0
        expiring_soon = 0
        active = 0
        
        for equipment in queryset:
            if equipment.warranty_until:
                today = timezone.now().date()
                if equipment.warranty_until < today:
                    expired += 1
                elif equipment.warranty_until <= today + timedelta(days=30):
                    expiring_soon += 1
                else:
                    active += 1
        
        self.message_user(
            request,
            f"Гарантія: діє - {active}, закінчується скоро - {expiring_soon}, прострочена - {expired}",
            messages.INFO
        )


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
    
    @display(description=_('Встановлень'), ordering='installed_on__count')
    def installation_count(self, obj):
        count = obj.installed_on.count()
        return format_html('<span class="badge badge-info">{}</span>', count)


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


# ============ ДОДАТКОВІ МОДЕЛІ ============

@admin.register(UserPreferences)
class UserPreferencesAdmin(ModelAdmin):
    """Адмін для налаштувань користувачів"""
    list_display = ('user', 'theme', 'dashboard_layout', 'language', 'items_per_page')
    list_filter = ('theme', 'dashboard_layout', 'language')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserActivity)
class UserActivityAdmin(ModelAdmin):
    """Адмін для активності користувачів"""
    list_display = ('user', 'action_type', 'target_model', 'ip_address', 'timestamp')
    list_filter = ('action_type', 'target_model', 'timestamp')
    search_fields = ('user__username', 'target_model')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'


@admin.register(CustomDashboard)
class CustomDashboardAdmin(ModelAdmin):
    """Адмін для користувацьких дашбордів"""
    list_display = ('name', 'user', 'is_shared', 'is_default', 'created_at', 'updated_at')
    list_filter = ('is_shared', 'is_default', 'created_at')
    search_fields = ('name', 'user__username', 'description')
    readonly_fields = ('created_at', 'updated_at')


# ============ SPARE PARTS MODELS ============

@admin.register(Supplier)
class SupplierAdmin(ModelAdmin):
    """Адмін для постачальників"""
    list_display = ('name', 'contact_person', 'email', 'phone', 'rating', 'is_active')
    list_filter = ('is_active', 'rating')
    search_fields = ('name', 'contact_person', 'email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SparePartCategory)
class SparePartCategoryAdmin(ModelAdmin):
    compressed_fields = True
    """Адмін для категорій запчастин"""
    list_display = ('name', 'parent', 'description')
    list_filter = ('parent',)
    search_fields = ('name', 'description')


@admin.register(SparePart)
class SparePartAdmin(ModelAdmin):
    """Адмін для запчастин"""
    list_display = (
        'name', 'part_number', 'category', 'quantity_in_stock', 
        'minimum_stock_level', 'status', 'unit_cost', 'primary_supplier'
    )
    list_filter = (
        'status', 'condition', 'category', 'primary_supplier', 'is_critical'
    )
    search_fields = (
        'name', 'part_number', 'manufacturer_part_number', 'description'
    )
    readonly_fields = ('created_at', 'updated_at', 'total_value', 'needs_reorder_display')
    compressed_fields = True
    
    def get_list_display(self, request):
        list_display = list(self.list_display)
        if 'needs_reorder_display' not in list_display:
            list_display.append('needs_reorder_display')
        return list_display
    
    fieldsets = (
        (_('Основна інформація'), {
            'fields': ('name', 'part_number', 'manufacturer_part_number', 'description', 'category')
        }),
        (_('Запаси'), {
            'fields': ('quantity_in_stock', 'minimum_stock_level', 'maximum_stock_level', 'reorder_point')
        }),
        (_('Фінансові дані'), {
            'fields': ('unit_cost', 'unit_price')
        }),
        (_('Постачальники'), {
            'fields': ('primary_supplier', 'alternative_suppliers')
        }),
        (_('Додатково'), {
            'fields': ('status', 'condition', 'storage_location', 'is_critical', 'notes')
        })
    )
    
    @display(description=_('Загальна вартість'), ordering='unit_cost')
    def total_value(self, obj):
        value = obj.quantity_in_stock * obj.unit_cost if obj.unit_cost else 0
        color = 'success' if value > 1000 else 'warning' if value > 100 else 'danger'
        return format_html('<span class="badge badge-{}">{:.2f} ₴</span>', color, value)
    
    @display(description=_('Потрібно замовлення'), boolean=True)
    def needs_reorder_display(self, obj):
        return obj.quantity_in_stock <= obj.minimum_stock_level if obj.minimum_stock_level else False


@admin.register(SparePartMovement)
class SparePartMovementAdmin(ModelAdmin):
    """Адмін для руху запчастин"""
    list_display = (
        'spare_part', 'movement_type', 'quantity', 'unit_cost', 
        'equipment', 'performed_by', 'performed_at'
    )
    list_filter = ('movement_type', 'performed_at')
    search_fields = (
        'spare_part__name', 'spare_part__part_number', 
        'equipment__name', 'performed_by__username'
    )
    readonly_fields = ('performed_at',)
    date_hierarchy = 'performed_at'


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(ModelAdmin):
    """Адмін для замовлень на закупівлю"""
    list_display = (
        'order_number', 'supplier', 'status', 'order_date', 
        'total_amount', 'expected_delivery_date'
    )
    list_filter = ('status', 'order_date', 'expected_delivery_date')
    search_fields = ('order_number', 'supplier__name')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'order_date'


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(ModelAdmin):
    """Адмін для позицій замовлення"""
    list_display = (
        'purchase_order', 'spare_part', 'quantity_ordered', 
        'quantity_received', 'unit_price', 'total_price'
    )
    list_filter = ('purchase_order__status',)
    search_fields = ('purchase_order__order_number', 'spare_part__name')
    readonly_fields = ('total_price', 'quantity_pending', 'is_fully_received')


# ============ MAINTENANCE MODELS ============

@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(ModelAdmin):
    """Адмін для запитів на ТО"""
    list_display = (
        'title', 'equipment', 'request_type', 'status', 'priority',
        'requester', 'assigned_technician', 'requested_date'
    )
    list_filter = (
        'request_type', 'status', 'priority', 'requested_date'
    )
    search_fields = (
        'title', 'equipment__name', 'requester__username', 
        'assigned_technician__username'
    )
    readonly_fields = (
        'requested_date', 'started_date', 'completed_date', 'actual_duration'
    )
    compressed_fields = True
    warn_unsaved_form = True
    
    @display(description=_('Статус заявки'), ordering='status')
    def request_status_badge(self, obj):
        status_colors = {
            'PENDING': 'warning',
            'APPROVED': 'info', 
            'IN_PROGRESS': 'primary',
            'COMPLETED': 'success',
            'CANCELLED': 'danger',
            'ON_HOLD': 'secondary'
        }
        color = status_colors.get(obj.status, 'secondary')
        return format_html('<span class="badge badge-{}">{}</span>', color, obj.get_status_display())
    
    def get_list_display(self, request):
        list_display = list(self.list_display)
        if 'request_status_badge' not in list_display:
            list_display[3] = 'request_status_badge'  # Замінюємо status на request_status_badge
        return list_display
    
    fieldsets = (
        (_('Основна інформація'), {
            'fields': ('equipment', 'request_type', 'title', 'description', 'priority')
        }),
        (_('Користувачі'), {
            'fields': ('requester', 'assigned_technician', 'approved_by')
        }),
        (_('Планування'), {
            'fields': ('scheduled_date', 'estimated_duration', 'estimated_cost')
        }),
        (_('Виконання'), {
            'fields': ('status', 'started_date', 'completed_date', 'actual_cost', 'actual_duration')
        }),
        (_('Додатково'), {
            'fields': ('parts_needed', 'downtime_required', 'notes')
        })
    )


@admin.register(MaintenanceSchedule)
class MaintenanceScheduleAdmin(ModelAdmin):
    """Адмін для розкладів ТО"""
    list_display = (
        'title', 'equipment', 'frequency', 'next_maintenance', 
        'responsible_person', 'is_active'
    )
    list_filter = ('frequency', 'is_active', 'next_maintenance')
    search_fields = ('title', 'equipment__name', 'responsible_person__username')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MaintenanceTask)
class MaintenanceTaskAdmin(ModelAdmin):
    """Адмін для завдань ТО"""
    list_display = (
        'title', 'maintenance_request', 'status', 'assigned_to',
        'order', 'started_at', 'completed_at'
    )
    list_filter = ('status', 'started_at', 'completed_at')
    search_fields = (
        'title', 'maintenance_request__title', 'assigned_to__username'
    )
    readonly_fields = ('started_at', 'completed_at', 'actual_duration')
    compressed_fields = True
    
    @display(description=_('Статус завдання'), ordering='status')
    def task_status_badge(self, obj):
        status_colors = {
            'PENDING': 'warning',
            'IN_PROGRESS': 'primary', 
            'COMPLETED': 'success',
            'PAUSED': 'info',
            'CANCELLED': 'danger'
        }
        color = status_colors.get(obj.status, 'secondary')
        return format_html('<span class="badge badge-{}">{}</span>', color, obj.get_status_display())
    
    def get_list_display(self, request):
        list_display = list(self.list_display)
        if 'task_status_badge' not in list_display:
            list_display[2] = 'task_status_badge'  # Замінюємо status на task_status_badge
        return list_display


# ============ PASSWORD MANAGEMENT MODELS ============

@admin.register(SystemCategory)
class SystemCategoryAdmin(ModelAdmin):
    """Адмін для категорій систем"""
    list_display = ('name', 'description', 'is_active', 'systems_count', 'color_preview')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    compressed_fields = True
    
    @display(description=_('Колір'), ordering='color')
    def color_preview(self, obj):
        return format_html(
            '<div style="width: 20px; height: 20px; background-color: {}; border: 1px solid #ccc; border-radius: 3px;"></div>',
            obj.color
        )
    
    @display(description=_('Кількість систем'))
    def systems_count(self, obj):
        count = obj.system.count()
        return format_html('<span class="badge badge-info">{}</span>', count)


@admin.register(System)
class SystemAdmin(ModelAdmin):
    """Адмін для систем"""
    list_display = (
        'name', 'category', 'system_type', 'criticality_badge', 
        'owner', 'is_active', 'accounts_count', 'url_link'
    )
    list_filter = (
        ('category', ChoicesDropdownFilter),
        ('system_type', ChoicesDropdownFilter),
        ('criticality', ChoicesDropdownFilter),
        'is_active',
        ('created_at', RangeDateFilter)
    )
    search_fields = ('name', 'description', 'url', 'ip_address')
    readonly_fields = ('created_at', 'updated_at', 'accounts_count')
    
    fieldsets = (
        (_('Основна інформація'), {
            'fields': ('name', 'category', 'system_type', 'description')
        }),
        (_('Мережеві параметри'), {
            'fields': ('url', 'ip_address', 'port')
        }),
        (_('Керування доступом'), {
            'fields': ('owner', 'administrators', 'criticality', 'is_active')
        })
    )
    
    @display(description=_('Критичність'), ordering='criticality')
    def criticality_badge(self, obj):
        colors = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger', 
            'critical': 'dark'
        }
        color = colors.get(obj.criticality, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_criticality_display()
        )
    
    @display(description=_('Кількість облікових записів'))
    def accounts_count(self, obj):
        count = obj.get_access_count()
        if count > 0:
            return format_html('<span class="badge badge-info">{}</span>', count)
        return format_html('<span class="text-muted">0</span>')
    
    @display(description=_('Посилання'))
    def url_link(self, obj):
        if obj.url:
            return format_html(
                '<a href="{}" target="_blank" title="Відкрити в новій вкладці">🔗</a>',
                obj.url
            )
        return '-'


class SystemAccountInline(admin.TabularInline):
    """Інлайн для облікових записів системи"""
    model = SystemAccount
    fields = ('username', 'account_type', 'status', 'assigned_to')
    readonly_fields = ('password_created', 'last_password_change')
    extra = 0
    max_num = 10


@admin.register(SystemAccount)
class SystemAccountAdmin(ModelAdmin):
    """Адмін для облікових записів систем"""
    list_display = (
        'username', 'system', 'account_type', 'status_badge', 
        'assigned_to', 'password_status', 'created_by'
    )
    list_filter = (
        ('system__category', ChoicesDropdownFilter),
        ('account_type', ChoicesDropdownFilter),
        ('status', ChoicesDropdownFilter),
        ('password_expires', RangeDateFilter),
        ('created_at', RangeDateFilter)
    )
    search_fields = (
        'username', 'email', 'system__name', 
        'assigned_to__username', 'description'
    )
    readonly_fields = (
        'password_created', 'last_password_change', 'created_at', 
        'updated_at', 'password_strength_display'
    )
    
    fieldsets = (
        (_('Основна інформація'), {
            'fields': ('system', 'username', 'email', 'account_type', 'description')
        }),
        (_('Пароль та безпека'), {
            'fields': ('password_expires', 'password_strength_display'),
            'description': 'Пароль зберігається в зашифрованому вигляді'
        }),
        (_('Керування доступом'), {
            'fields': ('status', 'assigned_to', 'created_by')
        }),
        (_('Додатково'), {
            'fields': ('notes',)
        }),
        (_('Метадані'), {
            'fields': ('password_created', 'last_password_change', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    # Права доступу
    def has_view_permission(self, request, obj=None):
        if obj:
            # Перевіряємо чи має користувач доступ
            accessible_accounts = PasswordManagementService.get_user_accessible_accounts(request.user)
            return obj in accessible_accounts
        return super().has_view_permission(request, obj)
    
    def has_change_permission(self, request, obj=None):
        if obj:
            accessible_accounts = PasswordManagementService.get_user_accessible_accounts(request.user)
            return obj in accessible_accounts
        return super().has_change_permission(request, obj)
    
    @display(description=_('Статус'), ordering='status')
    def status_badge(self, obj):
        colors = {
            'active': 'success',
            'disabled': 'secondary',
            'expired': 'danger',
            'locked': 'warning'
        }
        color = colors.get(obj.status, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_status_display()
        )
    
    @display(description=_('Статус пароля'))
    def password_status(self, obj):
        if obj.is_password_expired():
            return format_html('<span class="badge badge-danger">Прострочений</span>')
        
        days_left = obj.days_until_expiry()
        if days_left is not None:
            if days_left <= 7:
                return format_html('<span class="badge badge-warning">Закінчується ({} дн.)</span>', days_left)
            elif days_left <= 30:
                return format_html('<span class="badge badge-info">{} днів</span>', days_left)
            else:
                return format_html('<span class="badge badge-success">Активний</span>')
        
        return format_html('<span class="text-muted">Не вказано</span>')
    
    @display(description=_('Сила пароля'))
    def password_strength_display(self, obj):
        if not obj._encrypted_password:
            return format_html('<span class="text-muted">Пароль не встановлено</span>')
        
        try:
            password = obj.password
            from .password_management import PasswordManagementService
            strength = PasswordManagementService.get_password_strength_score(password)
            
            if strength >= 80:
                color = 'success'
                level = 'Сильний'
            elif strength >= 60:
                color = 'info'
                level = 'Середній'
            elif strength >= 40:
                color = 'warning'
                level = 'Слабкий'
            else:
                color = 'danger'
                level = 'Очень слабкий'
            
            return format_html(
                '<span class="badge badge-{}">{} ({}%)</span>',
                color, level, strength
            )
        except:
            return format_html('<span class="text-danger">Помилка дешифрування</span>')
    
    # Кастомні дії
    @action(
        description=_("Генерувати нові паролі"),
        permissions=["change"],
    )
    def generate_passwords(self, request, queryset):
        """Генерація нових паролів"""
        updated = 0
        for account in queryset:
            account.generate_password(16)
            account.save()
            
            # Логування
            PasswordManagementService.log_password_access(
                account, request.user, 'generate', request,
                'Пароль згенеровано автоматично'
            )
            updated += 1
        
        self.message_user(
            request,
            f"Згенеровано нові паролі для {updated} облікових записів",
            messages.SUCCESS
        )
    
    actions = ['generate_passwords']


@admin.register(PasswordAccessLog)
class PasswordAccessLogAdmin(ModelAdmin):
    """Адмін для логів доступу до паролів"""
    list_display = (
        'timestamp', 'user', 'action_badge', 'account', 
        'account_system', 'ip_address'
    )
    list_filter = (
        ('action', ChoicesDropdownFilter),
        ('timestamp', RangeDateFilter),
        ('account__system__category', ChoicesDropdownFilter)
    )
    search_fields = (
        'user__username', 'account__username', 
        'account__system__name', 'ip_address'
    )
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    
    # Тільки перегляд, не можна редагувати логи
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    @display(description=_('Дія'), ordering='action')
    def action_badge(self, obj):
        colors = {
            'view': 'info',
            'copy': 'warning',
            'edit': 'primary',
            'create': 'success',
            'delete': 'danger',
            'generate': 'secondary'
        }
        color = colors.get(obj.action, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_action_display()
        )
    
    @display(description=_('Система'))
    def account_system(self, obj):
        return obj.account.system.name