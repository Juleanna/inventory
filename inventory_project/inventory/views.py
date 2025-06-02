from rest_framework import status, permissions
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Equipment, Notification, License, Software, PeripheralDevice
from .serializers import (
    EquipmentSerializer, NotificationSerializer,
    LicenseSerializer, SoftwareSerializer, PeripheralDeviceSerializer
)
from .filters import EquipmentFilter  # Убедитесь, что фильтр настроен, или уберите эту строку
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.serializers import Serializer, CharField
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from datetime import datetime

class EquipmentViewSet(ModelViewSet):
    """
    ViewSet для модели Equipment.
    Позволяет выполнять CRUD операции, фильтрацию, сортировку и поиск.
    """
    queryset = Equipment.objects.all()  # Получаем все записи из модели Equipment
    serializer_class = EquipmentSerializer  # Сериализатор для обработки данных
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]  # Подключаем фильтры, поиск и сортировку
    filterset_class = EquipmentFilter  # Кастомный фильтр. Если не используется, замените на filterset_fields
    search_fields = ['name', 'serial_number', 'location']  # Поля для поиска
    ordering_fields = ['name', 'purchase_date', 'last_maintenance_date']  # Поля для сортировки
    ordering = ['name']  # Сортировка по умолчанию
    permission_classes = [permissions.IsAuthenticated]  # Доступ только для авторизованных пользователей
    

# Сериализатор для регистрации пользователя
class RegisterSerializer(Serializer):
    username = CharField(max_length=100)
    password = CharField(max_length=100)

class NotificationViewSet(ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer


class LicenseViewSet(ModelViewSet):
    queryset = License.objects.all()
    serializer_class = LicenseSerializer


class SoftwareViewSet(ModelViewSet):
    queryset = Software.objects.all()
    serializer_class = SoftwareSerializer


class PeripheralDeviceViewSet(ModelViewSet):
    queryset = PeripheralDevice.objects.all()
    serializer_class = PeripheralDeviceSerializer


# Регистрация нового пользователя
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    if request.method == 'POST':
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            user = User.objects.create_user(username=username, password=password)
            return Response({"message": "Пользователь создан"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Логин пользователя и получение JWT токена
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    from rest_framework_simplejwt.tokens import RefreshToken

    if request.method == 'POST':
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()

        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response({"message": "Неверное имя пользователя или пароль"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    user = request.user
    notifications = Notification.objects.filter(user=user, read=False).order_by('-created_at')
    notifications_data = [{"message": n.message, "created_at": n.created_at} for n in notifications]
    return Response(notifications_data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    user = request.user
    Notification.objects.filter(user=user, read=False).update(read=True)
    return Response({"message": "Все уведомления помечены как прочитанные"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_equipment(request):
    serializer = EquipmentSerializer(data=request.data)
    if serializer.is_valid():
        equipment = serializer.save()
        Notification.objects.create(
            user=request.user,
            message="Новый предмет добавлен в инвентарь",
        )
        return Response({"message": "Оборудование добавлено", "equipment": serializer.data})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def check_expired_equipment():
    expired_equipment = Equipment.objects.filter(expiry_date__lt=datetime.now())
    for item in expired_equipment:
        Notification.objects.create(
            user=item.owner,
            message=f"Срок службы оборудования {item.name} истек.",
        )


