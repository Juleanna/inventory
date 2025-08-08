# unfold_config.py - Конфігурація Unfold admin інтерфейсу

from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

# Основні налаштування Unfold
UNFOLD = {
    "SITE_TITLE": "Система управління обладнанням",
    "SITE_HEADER": "IT Inventory Management",
    "SITE_URL": "/",
    "SITE_ICON": {
        "light": lambda request: static("admin/img/inventory-light.svg"),
        "dark": lambda request: static("admin/img/inventory-dark.svg"),
    },
    
    # Навігація і меню
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": _("Головна"),
                "separator": True,
                "items": [
                    {
                        "title": _("Дашборд"),
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                    },
                ],
            },
            {
                "title": _("Обладнання"),
                "separator": True,
                "items": [
                    {
                        "title": _("Обладнання"),
                        "icon": "computer",
                        "link": reverse_lazy("admin:inventory_equipment_changelist"),
                        "badge": "new",
                    },
                    {
                        "title": _("Програмне забезпечення"),
                        "icon": "apps",
                        "link": reverse_lazy("admin:inventory_software_changelist"),
                    },
                    {
                        "title": _("Периферійні пристрої"),
                        "icon": "hardware",
                        "link": reverse_lazy("admin:inventory_peripheraldevice_changelist"),
                    },
                    {
                        "title": _("Документи"),
                        "icon": "description",
                        "link": reverse_lazy("admin:inventory_equipmentdocument_changelist"),
                    },
                ],
            },
            {
                "title": _("Обслуговування"),
                "separator": True,
                "items": [
                    {
                        "title": _("Запити на ТО"),
                        "icon": "build",
                        "link": reverse_lazy("admin:inventory_maintenancerequest_changelist"),
                        "badge": "priority",
                    },
                    {
                        "title": _("Розклад ТО"),
                        "icon": "schedule",
                        "link": reverse_lazy("admin:inventory_maintenanceschedule_changelist"),
                    },
                    {
                        "title": _("Завдання ТО"),
                        "icon": "task_alt",
                        "link": reverse_lazy("admin:inventory_maintenancetask_changelist"),
                    },
                ],
            },
            {
                "title": _("Запчастини"),
                "separator": True,
                "items": [
                    {
                        "title": _("Запчастини"),
                        "icon": "precision_manufacturing",
                        "link": reverse_lazy("admin:inventory_sparepart_changelist"),
                    },
                    {
                        "title": _("Постачальники"),
                        "icon": "store",
                        "link": reverse_lazy("admin:inventory_supplier_changelist"),
                    },
                    {
                        "title": _("Категорії"),
                        "icon": "category",
                        "link": reverse_lazy("admin:inventory_sparepartcategory_changelist"),
                    },
                    {
                        "title": _("Замовлення"),
                        "icon": "shopping_cart",
                        "link": reverse_lazy("admin:inventory_purchaseorder_changelist"),
                    },
                ],
            },
            {
                "title": _("Ліцензії"),
                "separator": True,
                "items": [
                    {
                        "title": _("Ліцензії"),
                        "icon": "license",
                        "link": reverse_lazy("admin:licenses_license_changelist"),
                        "badge": "warning",
                    },
                ],
            },
            {
                "title": _("Управління паролями"),
                "separator": True,
                "items": [
                    {
                        "title": _("Системи"),
                        "icon": "dns",
                        "link": reverse_lazy("admin:inventory_system_changelist"),
                        "badge": "new",
                    },
                    {
                        "title": _("Облікові записи"),
                        "icon": "vpn_key",
                        "link": reverse_lazy("admin:inventory_systemaccount_changelist"),
                        "badge": "priority",
                    },
                    {
                        "title": _("Категорії систем"),
                        "icon": "category",
                        "link": reverse_lazy("admin:inventory_systemcategory_changelist"),
                    },
                    {
                        "title": _("Логи доступу"),
                        "icon": "security",
                        "link": reverse_lazy("admin:inventory_passwordaccesslog_changelist"),
                        "badge": "info",
                    },
                ],
            },
            {
                "title": _("Користувачі"),
                "separator": True,
                "items": [
                    {
                        "title": _("Користувачі"),
                        "icon": "people",
                        "link": reverse_lazy("admin:accounts_customuser_changelist"),
                    },
                    {
                        "title": _("Профілі"),
                        "icon": "person",
                        "link": reverse_lazy("admin:accounts_userprofile_changelist"),
                    },
                    {
                        "title": _("Налаштування"),
                        "icon": "settings",
                        "link": reverse_lazy("admin:inventory_userpreferences_changelist"),
                    },
                ],
            },
            {
                "title": _("Система"),
                "separator": True,
                "items": [
                    {
                        "title": _("Сповіщення"),
                        "icon": "notifications",
                        "link": reverse_lazy("admin:inventory_notification_changelist"),
                        "badge": "info",
                    },
                    {
                        "title": _("Активність"),
                        "icon": "history",
                        "link": reverse_lazy("admin:inventory_useractivity_changelist"),
                    },
                    {
                        "title": _("Дашборди"),
                        "icon": "dashboard_customize",
                        "link": reverse_lazy("admin:inventory_customdashboard_changelist"),
                    },
                ],
            },
        ],
    },
    
    # Кольори і теми
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 232 255", 
            "200": "233 213 255",
            "300": "196 181 253",
            "400": "147 51 234",
            "500": "124 58 237",
            "600": "109 40 217",
            "700": "91 33 182",
            "800": "76 29 149",
            "900": "67 56 202",
            "950": "41 37 116",
        },
    },
    
    # Додаткові налаштування
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "ENVIRONMENT": "inventory_project.settings.get_environment_badge",
    "LOGIN": {
        "redirect_after": reverse_lazy("admin:index"),
    },
    "STYLES": [
        lambda request: static("admin/css/custom-unfold.css"),
    ],
    "SCRIPTS": [
        lambda request: static("admin/js/custom-unfold.js"),
    ],
    
    # Фільтри і дії
    "ACTIONS": True,
    "FILTERS": {
        "DATE_HIERARCHY": True,
        "SEARCH": True,
        "LIST_FILTER": True,
    },
    
    # Налаштування форм
    "FORMS": {
        "SUBMIT_BUTTON_TEXT": _("Зберегти"),
        "DELETE_BUTTON_TEXT": _("Видалити"),
        "SAVE_AND_CONTINUE_TEXT": _("Зберегти і продовжити"),
        "SAVE_AND_ADD_ANOTHER_TEXT": _("Зберегти і додати інше"),
    },
    
    # Налаштування таблиць
    "TABLES": {
        "PAGINATION": {
            "PER_PAGE": 25,
            "SHOW_INFO": True,
            "SHOW_CONTROLS": True,
        },
        "EXPORT": {
            "EXCEL": True,
            "CSV": True,
            "JSON": True,
        },
    },
}

def get_environment_badge():
    """Відображення середовища розробки"""
    import os
    environment = os.environ.get('DJANGO_ENVIRONMENT', 'development')
    
    if environment == 'production':
        return None  # Не показувати badge у продакшені
    elif environment == 'staging':
        return "staging", "warning"
    else:
        return "dev", "info"