# inventory/password_api.py - API для управління паролями підсистем

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Count
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from datetime import timedelta

from .password_management import (
    SystemCategory, System, SystemAccount, PasswordAccessLog,
    PasswordManagementService
)
from rest_framework import serializers


class SystemCategorySerializer(serializers.ModelSerializer):
    systems_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SystemCategory
        fields = ['id', 'name', 'description', 'icon', 'color', 'is_active', 
                 'systems_count', 'created_at', 'updated_at']


class SystemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True, default='')
    accounts_count = serializers.IntegerField(read_only=True, default=0)
    criticality_display = serializers.CharField(source='get_criticality_display', read_only=True)

    class Meta:
        model = System
        fields = [
            'id', 'name', 'category', 'category_name', 'system_type', 'url',
            'ip_address', 'port', 'description', 'criticality', 'criticality_display',
            'owner', 'owner_name', 'administrators', 'is_active', 'accounts_count',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'owner': {'read_only': True},
        }


class SystemAccountSerializer(serializers.ModelSerializer):
    system_name = serializers.CharField(source='system.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    password_expired = serializers.BooleanField(source='is_password_expired', read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    
    # Поле для зміни пароля (не повертається при читанні)
    new_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = SystemAccount
        fields = [
            'id', 'system', 'system_name', 'username', 'account_type', 'email',
            'description', 'status', 'status_display', 'assigned_to', 'assigned_to_name',
            'password_expires', 'password_expired', 'days_until_expiry',
            'notes', 'created_at', 'updated_at', 'new_password'
        ]
        # Не включаємо зашифрований пароль у серіалізацію
        extra_kwargs = {
            '_encrypted_password': {'write_only': True},
        }
    
    def create(self, validated_data):
        new_password = validated_data.pop('new_password', None)
        instance = super().create(validated_data)
        if new_password:
            instance.set_password(new_password)
            instance.save()
        return instance

    def update(self, instance, validated_data):
        # Обробка зміни пароля
        new_password = validated_data.pop('new_password', None)
        if new_password:
            instance.set_password(new_password)

            # Логування зміни пароля
            request = self.context.get('request')
            if request:
                PasswordManagementService.log_password_access(
                    instance, request.user, 'edit', request,
                    'Пароль змінено через API'
                )

        return super().update(instance, validated_data)


class PasswordAccessLogSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.username', read_only=True)
    system_name = serializers.CharField(source='account.system.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = PasswordAccessLog
        fields = [
            'id', 'account', 'account_name', 'system_name', 'user', 'user_name',
            'action', 'action_display', 'ip_address', 'timestamp', 'notes'
        ]


# ViewSets
class SystemCategoryViewSet(viewsets.ModelViewSet):
    queryset = SystemCategory.objects.annotate(
        systems_count=Count('system')
    ).order_by('name')
    serializer_class = SystemCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class SystemViewSet(viewsets.ModelViewSet):
    queryset = System.objects.all()
    serializer_class = SystemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'system_type', 'criticality', 'is_active', 'owner']
    search_fields = ['name', 'description', 'url']
    ordering_fields = ['name', 'criticality', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        return System.objects.annotate(
            accounts_count=Count('system_accounts')
        ).select_related('category', 'owner').prefetch_related('administrators')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def accounts(self, request, pk=None):
        """Отримати облікові записи системи"""
        system = self.get_object()
        accounts = SystemAccount.objects.filter(system=system)
        
        # Перевірка прав доступу
        accessible_accounts = PasswordManagementService.get_user_accessible_accounts(request.user)
        accounts = accounts.filter(id__in=accessible_accounts.values_list('id', flat=True))
        
        serializer = SystemAccountSerializer(accounts, many=True, context={'request': request})
        return Response(serializer.data)


class SystemAccountViewSet(viewsets.ModelViewSet):
    queryset = SystemAccount.objects.all()
    serializer_class = SystemAccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['system', 'account_type', 'status', 'assigned_to']
    search_fields = ['username', 'email', 'description']
    ordering_fields = ['username', 'system__name', 'created_at']
    ordering = ['system__name', 'username']
    
    def get_queryset(self):
        # Повертаємо тільки доступні користувачу облікові записи
        return PasswordManagementService.get_user_accessible_accounts(
            self.request.user
        ).select_related('system', 'assigned_to', 'created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def get_password(self, request, pk=None):
        """Отримати пароль (з логуванням)"""
        account = self.get_object()
        
        try:
            password = account.password
            
            # Логування перегляду пароля
            PasswordManagementService.log_password_access(
                account, request.user, 'view', request,
                'Пароль переглянуто через API'
            )
            
            return Response({
                'password': password,
                'strength': PasswordManagementService.get_password_strength_score(password),
                'expires': account.password_expires,
                'days_until_expiry': account.days_until_expiry()
            })
        except Exception as e:
            return Response({
                'error': 'Помилка дешифрування пароля'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def generate_password(self, request, pk=None):
        """Згенерувати новий пароль"""
        account = self.get_object()
        length = request.data.get('length', 16)
        
        try:
            new_password = account.generate_password(int(length))
            account.save()
            
            # Логування генерації
            PasswordManagementService.log_password_access(
                account, request.user, 'generate', request,
                f'Згенеровано новий пароль довжиною {length} символів'
            )
            
            return Response({
                'message': 'Пароль успішно згенеровано',
                'password': new_password,
                'strength': PasswordManagementService.get_password_strength_score(new_password)
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Отримати паролі що скоро закінчуються"""
        days_ahead = int(request.query_params.get('days', 7))
        accounts = PasswordManagementService.check_expiring_passwords(days_ahead)
        
        # Фільтруємо тільки доступні користувачу
        accessible_accounts = PasswordManagementService.get_user_accessible_accounts(request.user)
        accounts = accounts.filter(id__in=accessible_accounts.values_list('id', flat=True))
        
        serializer = self.get_serializer(accounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Статистика паролів"""
        accessible_accounts = PasswordManagementService.get_user_accessible_accounts(request.user)
        
        total = accessible_accounts.count()
        active = accessible_accounts.filter(status='active').count()
        expired = sum(1 for acc in accessible_accounts if acc.is_password_expired())
        expiring_soon = PasswordManagementService.check_expiring_passwords(7).filter(
            id__in=accessible_accounts.values_list('id', flat=True)
        ).count()
        
        return Response({
            'total_accounts': total,
            'active_accounts': active,
            'expired_passwords': expired,
            'expiring_soon': expiring_soon,
            'by_system_type': list(
                accessible_accounts.values('system__system_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
        })


class PasswordAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PasswordAccessLog.objects.all()
    serializer_class = PasswordAccessLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'user']
    search_fields = ['account__username', 'account__system__name', 'user__username']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        # Показуємо тільки логи для доступних користувачу облікових записів
        accessible_accounts = PasswordManagementService.get_user_accessible_accounts(self.request.user)
        
        return PasswordAccessLog.objects.filter(
            account__in=accessible_accounts
        ).select_related('account', 'account__system', 'user')
    
    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """Активність поточного користувача"""
        logs = self.get_queryset().filter(user=request.user)[:50]
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)