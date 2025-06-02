from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import TokenRefreshView,TokenObtainPairView
from .views import (
    EquipmentViewSet, NotificationViewSet,
    LicenseViewSet, SoftwareViewSet, PeripheralDeviceViewSet
)

router = DefaultRouter()
router.register(r'equipment', EquipmentViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'licenses', LicenseViewSet)
router.register(r'software', SoftwareViewSet)
router.register(r'peripherals', PeripheralDeviceViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/register/', views.register, name='register'),
    path('api/login/', views.login, name='login'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # Добавлено
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/notifications/', views.get_notifications, name='get_notifications'),
    path('api/notifications/mark_read/', views.mark_notifications_read, name='mark_notifications_read'),
        
]
