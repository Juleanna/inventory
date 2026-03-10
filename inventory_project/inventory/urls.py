# inventory/urls.py (оновлена версія)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView

from . import views
from . import analytics
from . import mobile_views
from .views import (
    EquipmentViewSet, NotificationViewSet,
    LicenseViewSet, SoftwareViewSet, PeripheralDeviceViewSet,
    DashboardView, AnalyticsView, ReportsView, ExportView,
    # Нові views для запчастин
    SparePartsViewSet, SuppliersViewSet, PurchaseOrdersViewSet, SparePartCategoriesViewSet, StorageLocationsViewSet,
    # 2FA views
    TwoFactorSetupView, TwoFactorVerifyView, TwoFactorStatusView,
    # Maintenance views
    MaintenanceRequestViewSet,
    MaintenanceDashboardView, AssignTechnicianView, StartMaintenanceView, CompleteMaintenanceView,
    MaintenanceScheduleView, MaintenanceScheduleDetailView,
    # Персоналізація
    PersonalizedDashboardView, UserPreferencesView
)
from .password_api import (
    SystemCategoryViewSet, SystemViewSet, SystemAccountViewSet, PasswordAccessLogViewSet
)
from .backup_views import (
    BackupListView, BackupCreateView, BackupDownloadView, BackupDeleteView,
    BackupContentsView, BackupRestoreView,
    BackupUploadGDriveView, GDriveDeleteView, GDriveStatusView, GDriveAuthorizeView,
    GDriveUploadCredentialsView, BackupSettingsView,
)

# API роутер для ViewSets
router = DefaultRouter()
router.register(r'equipment', EquipmentViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'licenses', LicenseViewSet)
router.register(r'software', SoftwareViewSet)
router.register(r'peripherals', PeripheralDeviceViewSet)
# Нові ViewSets для запчастин
router.register(r'spare-parts', SparePartsViewSet)
router.register(r'suppliers', SuppliersViewSet)
router.register(r'purchase-orders', PurchaseOrdersViewSet)
router.register(r'spare-part-categories', SparePartCategoriesViewSet)
router.register(r'storage-locations', StorageLocationsViewSet)
router.register(r'maintenance/requests', MaintenanceRequestViewSet, basename='maintenance-request')

# PASSWORD MANAGEMENT API
router.register(r'password-systems', SystemViewSet)
router.register(r'password-categories', SystemCategoryViewSet)
router.register(r'password-accounts', SystemAccountViewSet)
router.register(r'password-logs', PasswordAccessLogViewSet)

urlpatterns = [
    # Головна сторінка
    path('', views.home, name='home'),

    # Health check
    path('api/health/', views.health_check, name='health_check'),

    # ============ SPARE PARTS (before router to avoid pk conflict) ============
    path('api/spare-parts/movements/', views.SparePartMovementView.as_view(), name='spare-parts-movements'),
    path('api/spare-parts/issue/', views.IssueSparePartView.as_view(), name='issue-spare-part'),
    path('api/spare-parts/receive/', views.ReceiveSparePartView.as_view(), name='receive-spare-part'),
    path('api/spare-parts/create-order/', views.CreatePurchaseOrderView.as_view(), name='create-purchase-order'),
    path('api/spare-parts/equipment/<str:equipment_id>/', views.get_spare_parts_for_equipment, name='spare-parts-for-equipment'),
    path('api/spare-parts/analytics/', views.spare_parts_analytics, name='spare-parts-analytics'),

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
    
    # ============ НОВІ API ENDPOINTS ДЛЯ АНАЛІТИКИ ============
    # Дашборд та аналітика
    path('api/dashboard/', DashboardView.as_view(), name='dashboard'),
    path('api/analytics/', AnalyticsView.as_view(), name='analytics'),
    
    # Звіти та експорт
    path('api/reports/', ReportsView.as_view(), name='reports'),
    path('api/export/', ExportView.as_view(), name='export'),
    
    # Додаткові endpoints для конкретних метрик
    path('api/dashboard/equipment-overview/', DashboardView.as_view(), {'section': 'equipment'}, name='dashboard-equipment'),
    path('api/dashboard/financial-overview/', DashboardView.as_view(), {'section': 'financial'}, name='dashboard-financial'),
    path('api/dashboard/alerts/', DashboardView.as_view(), {'section': 'alerts'}, name='dashboard-alerts'),
    
    # ============ ПЕРСОНАЛІЗАЦІЯ ============
    path('api/personalized-dashboard/', PersonalizedDashboardView.as_view(), name='personalized-dashboard'),
    path('api/user-preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    
    # ============ ПРОФІЛЬ ТА ПАРОЛЬ ============
    path('api/profile/', views.user_profile, name='user-profile'),
    path('api/auth/change-password/', views.change_password, name='change-password'),
    path('api/users/', views.users_list, name='users-list'),
    path('api/users/create/', views.user_create, name='user-create'),
    path('api/users/bulk-action/', views.users_bulk_action, name='users-bulk-action'),
    path('api/users/stats/', views.users_stats, name='users-stats'),
    path('api/users/import/', views.users_import, name='users-import'),
    path('api/users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('api/users/<int:user_id>/equipment/', views.user_equipment, name='user-equipment'),
    path('api/users/<int:user_id>/history/', views.user_history, name='user-history'),

    # ============ 2FA AUTHENTICATION ============
    path('api/auth/2fa-setup/', TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('api/auth/2fa-verify/', TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('api/auth/2fa-status/', TwoFactorStatusView.as_view(), name='2fa-status'),
    
    # ============ MAINTENANCE MODULE ============
    path('api/maintenance/dashboard/', MaintenanceDashboardView.as_view(), name='maintenance-dashboard'),
    path('api/maintenance/assign-technician/', AssignTechnicianView.as_view(), name='assign-technician'),
    path('api/maintenance/start/', StartMaintenanceView.as_view(), name='start-maintenance'),
    path('api/maintenance/complete/', CompleteMaintenanceView.as_view(), name='complete-maintenance'),
    path('api/maintenance/schedules/', MaintenanceScheduleView.as_view(), name='maintenance-schedules'),
    path('api/maintenance/schedules/<int:pk>/', MaintenanceScheduleDetailView.as_view(), name='maintenance-schedule-detail'),
    path('api/maintenance/technicians/', views.get_technicians, name='get-technicians'),
    path('api/maintenance/create-scheduled/', views.create_scheduled_maintenance, name='create-scheduled-maintenance'),
    
    # ============ SPARE PARTS MANAGEMENT (routes moved before router) ============
    
    # ============ ДОКУМЕНТИ ОБЛАДНАННЯ ============
    path('api/equipment/<int:equipment_id>/documents/<int:doc_id>/', views.delete_equipment_document, name='delete-equipment-document'),

    # ============ AGENT ============
    path('api/agent/report/', views.agent_report, name='agent-report'),

    # ============ BACKUP & GOOGLE DRIVE ============
    path('api/backups/', BackupListView.as_view(), name='backup-list'),
    path('api/backups/create/', BackupCreateView.as_view(), name='backup-create'),
    path('api/backups/settings/', BackupSettingsView.as_view(), name='backup-settings'),
    path('api/backups/download/<str:filename>/', BackupDownloadView.as_view(), name='backup-download'),
    path('api/backups/delete/<str:filename>/', BackupDeleteView.as_view(), name='backup-delete'),
    path('api/backups/contents/<str:filename>/', BackupContentsView.as_view(), name='backup-contents'),
    path('api/backups/restore/<str:filename>/', BackupRestoreView.as_view(), name='backup-restore'),
    path('api/backups/upload-gdrive/', BackupUploadGDriveView.as_view(), name='backup-upload-gdrive'),
    path('api/backups/gdrive/status/', GDriveStatusView.as_view(), name='gdrive-status'),
    path('api/backups/gdrive/authorize/', GDriveAuthorizeView.as_view(), name='gdrive-authorize'),
    path('api/backups/gdrive/credentials/', GDriveUploadCredentialsView.as_view(), name='gdrive-credentials'),
    path('api/backups/gdrive/delete/<str:file_id>/', GDriveDeleteView.as_view(), name='gdrive-delete'),

    # ============ PWA SUPPORT ============
    path('api/csrf-token/', views.csrf_token, name='csrf-token'),
    path('api/quick-report/', views.quick_report, name='quick-report'),
]