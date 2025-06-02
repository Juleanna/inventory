from django.contrib import admin
from .models import CustomUser
from unfold.admin import ModelAdmin
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
    list_display = ('username', 'email', 'phone', 'position', 'department')
    search_fields = ('username', 'email', 'phone', 'position', 'department')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'department')
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
