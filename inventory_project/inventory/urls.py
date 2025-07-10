# inventory/urls.py (оновлена версія)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView

from . import views
from . import analytics
from . import mobile_views
from .views import (
    EquipmentViewSet, NotificationViewSet,
    LicenseViewSet, SoftwareViewSet, PeripheralDeviceViewSet
)

# API роутер для ViewSets
router = DefaultRouter()
router.register(r'equipment', EquipmentViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'licenses', LicenseViewSet)
router.register(r'software', SoftwareViewSet)
router.register(r'peripherals', PeripheralDeviceViewSet)

urlpatterns = [
    # Основне API
    path('api/', include(router.urls)),
    
    # Аутентифікація
    path('api/register/', views.register, name='register'),
    path('api/login/', views.login, name='login'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Уведомлення
    path('api/notifications/get/', views.get_notifications, name='get_notifications'),
    path('api/notifications/mark_read/', views.mark_notifications_read, name='mark_notifications_read'),
    
    # Обладнання
    path('api/equipment/add/', views.add_equipment, name='add_equipment'),
    
    # Аналітика
    path('api/analytics/equipment/', analytics.equipment_analytics, name='equipment_analytics'),
    path('api/analytics/financial/', analytics.financial_analytics, name='financial_analytics'),
    path('api/analytics/maintenance/', analytics.maintenance_analytics, name='maintenance_analytics'),
    path('api/analytics/users/', analytics.user_analytics, name='user_analytics'),
    path('api/analytics/report/', analytics.generate_report, name='generate_report'),
    
    # Мобільне API
    path('api/mobile/equipment/', mobile_views.mobile_equipment_list, name='mobile_equipment_list'),
    path('api/mobile/scan/', mobile_views.scan_qr_code, name='mobile_scan_qr'),
    path('api/mobile/update_location/', mobile_views.update_equipment_location, name='mobile_update_location'),
    path('api/mobile/report_issue/', mobile_views.report_issue, name='mobile_report_issue'),
    path('api/mobile/my_equipment/', mobile_views.mobile_user_equipment, name='mobile_user_equipment'),
    path('api/mobile/notifications/', mobile_views.mobile_notifications, name='mobile_notifications'),
    path('api/mobile/notifications/<int:notification_id>/read/', mobile_views.mark_notification_read, name='mobile_mark_notification_read'),
    path('api/mobile/dashboard/', mobile_views.mobile_dashboard, name='mobile_dashboard'),
]