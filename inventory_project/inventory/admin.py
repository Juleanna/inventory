from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Equipment, Notification

from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import  Group
from django.contrib.admin.filters import ChoicesFieldListFilter

from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm
from unfold.paginator import InfinitePaginator
from unfold.contrib.filters.admin import (
    ChoicesDropdownFilter,
    MultipleChoicesDropdownFilter,
    TextFilter, FieldTextFilter,
)

from django.contrib.admin import register
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _
from django.http import HttpRequest
from unfold.decorators import action

from import_export.admin import ImportExportModelAdmin
from simple_history.admin import SimpleHistoryAdmin
from unfold.contrib.import_export.forms import ExportForm, ImportForm
from django.utils.html import format_html

from django.contrib.auth import get_user_model

User = get_user_model()

class HorizontalChoicesFieldListFilter(ChoicesFieldListFilter):
    horizontal = True # Enable horizontal layout

admin.site.unregister(Group)

@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    # Forms loaded from `unfold.forms`
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    def has_action1_permission(self, request):
        # Логика проверки разрешений для action1
        return True

    def has_action2_permission(self, request):
        # Логика проверки разрешений для action2
        return True

    def has_action3_permission(self, request):
        # Логика проверки разрешений для action3
        return True

    def has_action4_permission(self, request):
        # Логика проверки разрешений для action4
        return True
    
    actions_list = [
        "action1",  # Метод `action1` должен быть определён в этом классе
        "action2",  # Метод `action2` должен быть определён в этом классе
        {
            "title": "Dropdown action",
            "icon": "person",  # Опционально: отображает иконку рядом с названием
            "items": ["action3", "action4"],  # Эти методы также должны быть определены
        }
    ]

    @action(
        description=_("Action 1 description"),  # Описание для интерфейса
        permissions=["action1"],  # Права для выполнения действия
    )
    def action1(self, request, queryset):
        # Логика действия 1
        for user in queryset:
            user.is_active = not user.is_active  # Пример: переключение активности
            user.save()
        self.message_user(request, _("Action 1 executed successfully."))

    @action(
        description=_("Action 2 description"), 
        permissions=["action2"],
    )
    def action2(self, request, queryset):
        # Логика действия 2
        queryset.update(is_staff=True)  # Пример: назначение роли "стандартный персонал"
        self.message_user(request, _("Action 2 executed successfully."))

    @action(
        description=_("Action 3 description"), 
        permissions=["action3"],
    )
    def action3(self, request, queryset):
        # Логика действия 3
        for user in queryset:
            user.is_superuser = True  # Пример: назначение суперпользователя
            user.save()
        self.message_user(request, _("Action 3 executed successfully."))

    @action(
        description=_("Action 4 description"), 
        permissions=["action4"],
    )
    def action4(self, request, queryset):
        # Логика действия 4
        queryset.delete()  # Пример: удаление выбранных записей
        self.message_user(request, _("Action 4 executed successfully."))


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(Equipment)
class EquipmentAdmin(SimpleHistoryAdmin, ImportExportModelAdmin,ModelAdmin):
    list_display = ('name', 'category', 'serial_number', 'status', 'location', 'purchase_date','barcode_preview', 'qrcode_preview')
    compressed_fields = True  # Default: False
    list_fullwidth = True
    list_filter_submit = True
    list_filter = (("category", MultipleChoicesDropdownFilter),
                   ("status", MultipleChoicesDropdownFilter),  ('location',HorizontalChoicesFieldListFilter),
         )
    search_fields = ('name', 'serial_number', 'manufacturer', 'mac_address', 'ip_address')
    ordering = ('name', 'status')
    paginator = InfinitePaginator
    show_full_result_count = False
    import_form_class = ImportForm
    export_form_class = ExportForm
    def barcode_preview(self, obj):
        if obj.barcode_image:
            return format_html(f'<a href="{obj.barcode_image.url}" target="_blank"><img src="{obj.barcode_image.url}" style="width: 100px;"/></a>')
        return "Нет штрих-кода"

    barcode_preview.short_description = "Штрих-код"

    def qrcode_preview(self, obj):
        if obj.qrcode_image:
            return format_html(f'<a href="{obj.qrcode_image.url}" target="_blank"><img src="{obj.qrcode_image.url}" style="width: 100px;"/></a>')
        return "Нет QR-кода"

    qrcode_preview.short_description = "QR-код"

   

@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ('user', 'message', 'read', 'created_at')
    list_filter = ('read', 'created_at')
    search_fields = ('user__username', 'message')
    ordering = ('-created_at',)
   