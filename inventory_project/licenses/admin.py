from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from unfold.admin import ModelAdmin
from unfold.decorators import display, action
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter, RangeDateFilter, TextFilter
)
from .models import License

@admin.register(License)
class LicenseAdmin(ModelAdmin):
    """Адмін для ліцензій"""
    list_display = (
        'license_type', 'key_preview', 'activations', 'start_date', 'end_date', 
        'device', 'user', 'license_status', 'days_remaining'
    )
    list_filter = (
        'license_type',
        ('start_date', RangeDateFilter),
        ('end_date', RangeDateFilter)
    )
    search_fields = ('license_type', 'key', 'description')
    compressed_fields = True
    
    @display(description=_('Ключ'))
    def key_preview(self, obj):
        if len(obj.key) > 20:
            return format_html('{}...', obj.key[:17])
        return obj.key
    
    @display(description=_('Статус ліцензії'), ordering='end_date')
    def license_status(self, obj):
        today = timezone.now().date()
        if obj.end_date < today:
            return format_html('<span class="badge badge-danger">Прострочена</span>')
        elif obj.start_date <= today <= obj.end_date:
            days_left = (obj.end_date - today).days
            if days_left <= 30:
                return format_html('<span class="badge badge-warning">Закінчується</span>')
            else:
                return format_html('<span class="badge badge-success">Активна</span>')
        else:
            return format_html('<span class="badge badge-secondary">Не активна</span>')
    
    @display(description=_('Днів залишилося'), ordering='end_date')
    def days_remaining(self, obj):
        today = timezone.now().date()
        if obj.end_date >= today:
            days = (obj.end_date - today).days
            if days <= 7:
                return format_html('<span class="text-danger">{}</span>', days)
            elif days <= 30:
                return format_html('<span class="text-warning">{}</span>', days)
            else:
                return format_html('<span class="text-success">{}</span>', days)
        else:
            expired_days = (today - obj.end_date).days
            return format_html('<span class="text-danger">-{}</span>', expired_days)
    
    fieldsets = (
        ('Основна інформація', {
            'fields': ('license_type', 'key', 'description')
        }),
        ('Активації', {
            'fields': ('activations',)
        }),
        ('Дати', {
            'fields': ('start_date', 'end_date')
        }),
        ('Прив\'язка', {
            'fields': ('device', 'user')
        })
    )
