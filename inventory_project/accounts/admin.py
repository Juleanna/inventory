from django.contrib import admin
from .models import CustomUser, UserProfile
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import display, action
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter, MultipleChoicesDropdownFilter,
    TextFilter, FieldTextFilter, RangeDateFilter
)
from simple_history.admin import SimpleHistoryAdmin
from django.utils.translation import gettext_lazy as _
from import_export.admin import ImportExportModelAdmin
from django.contrib.auth.forms import PasswordChangeForm
from django.shortcuts import render
from django.contrib.auth import update_session_auth_hash
from django.http import HttpResponseRedirect
from django.urls import path
from django.utils.html import format_html
from django.urls import reverse

# Удаляем регистрацию, если она уже существует
try:
    admin.site.unregister(CustomUser)
except admin.sites.NotRegistered:
    pass

# Регистрируем заново с вашим классом админки
@admin.register(CustomUser)
class CustomUserAdmin(SimpleHistoryAdmin, ImportExportModelAdmin, ModelAdmin):
    list_display = ('username', 'email', 'phone', 'position', 'department', 'user_status', 'last_login_display')
    search_fields = ('username', 'email', 'phone', 'position', 'department')
    list_filter = (
        ('is_active', ChoicesDropdownFilter),
        ('is_staff', ChoicesDropdownFilter),
        ('is_superuser', ChoicesDropdownFilter),
        'department',
        ('date_joined', RangeDateFilter)
    )
    
    compressed_fields = True
    warn_unsaved_form = True
    
    @display(description=_('Статус користувача'), boolean=True)
    def user_status(self, obj):
        return obj.is_active
    
    @display(description=_('Останній вхід'), ordering='last_login')
    def last_login_display(self, obj):
        if obj.last_login:
            from django.utils import timezone
            delta = timezone.now() - obj.last_login
            if delta.days == 0:
                return format_html('<span class="text-success">Сьогодні</span>')
            elif delta.days <= 7:
                return format_html('<span class="text-warning">{} днів тому</span>', delta.days)
            else:
                return format_html('<span class="text-danger">{} днів тому</span>', delta.days)
        return format_html('<span class="text-muted">Ніколи</span>')
    fieldsets = (
        (
            _("Основная информация"),
            {
                "classes": ["tab"],
                "fields": [
                    "username",
                    "email",
                    "password",  # Поле пароля
                    "first_name",
                    "last_name",
                    "phone",
                    "position",
                    "department",
                ],
            },
        ),
        (
            _("Дополнительно"),
            {
                "classes": ["tab"],
                "fields": [
                    "devices",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ],
            },
        ),
    )

    def password_change_action(self, obj):
        if obj:
            url = reverse('admin:customuser_change_password', args=[obj.pk])
            return format_html('<a class="button" href="{}">Изменить пароль</a>', url)
        return None

    actions_for_obj = ['password_change_action']


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    """Адмін для профілів користувачів"""
    list_display = (
        'user', 'items_per_page', 'default_equipment_view', 
        'email_digest_frequency', 'favorite_count'
    )
    list_filter = (
        ('default_equipment_view', ChoicesDropdownFilter),
        ('email_digest_frequency', ChoicesDropdownFilter)
    )
    search_fields = ('user__username', 'user__email')
    compressed_fields = True
    
    @display(description=_('Кількість улюблених'), ordering='favorite_equipment__count')
    def favorite_count(self, obj):
        count = obj.favorite_equipment.count()
        if count > 0:
            return format_html('<span class="badge badge-info">{}</span>', count)
        return format_html('<span class="text-muted">0</span>')
    
    fieldsets = (
        (_('Користувач'), {
            'fields': ('user',)
        }),
        (_('Налаштування інтерфейсу'), {
            'fields': ('items_per_page', 'default_equipment_view')
        }),
        (_('Улюблене обладнання'), {
            'fields': ('favorite_equipment',)
        }),
        (_('Сповіщення'), {
            'fields': ('email_digest_frequency',)
        }),
        (_('Швидкі дії'), {
            'fields': ('quick_actions',)
        })
    )
