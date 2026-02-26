# inventory/mobile_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
import logging

from .models import Equipment, Notification
from .serializers import EquipmentSerializer

User = get_user_model()
logger = logging.getLogger('inventory')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mobile_equipment_list(request):
    """Спрощений список обладнання для мобільного додатку"""
    try:
        # Параметри фільтрації
        user_only = request.GET.get('user_only', 'false').lower() == 'true'
        status_filter = request.GET.get('status')
        location_filter = request.GET.get('location')
        search = request.GET.get('search')
        
        # Базовий запит
        queryset = Equipment.objects.all()
        
        # Фільтри
        if user_only:
            queryset = queryset.filter(current_user=request.user)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if location_filter:
            queryset = queryset.filter(location__icontains=location_filter)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(serial_number__icontains=search) |
                Q(manufacturer__icontains=search)
            )
        
        # Отримати тільки необхідні поля для мобільного додатку
        equipment_data = queryset.values(
            'id', 'name', 'category', 'status', 'location', 
            'serial_number', 'manufacturer', 'current_user__username',
            'qrcode_image'
        )[:100]  # Обмежити до 100 записів
        
        # Додати display значення
        for item in equipment_data:
            # Отримати display значення для category та status
            equipment_obj = Equipment.objects.get(id=item['id'])
            item['category_display'] = equipment_obj.get_category_display()
            item['status_display'] = equipment_obj.get_status_display()
            
            # Повний URL для QR-коду
            if item['qrcode_image']:
                item['qrcode_url'] = request.build_absolute_uri(equipment_obj.qrcode_image.url)
            else:
                item['qrcode_url'] = None
        
        return Response({
            'count': len(equipment_data),
            'results': list(equipment_data)
        })
        
    except Exception as e:
        logger.error(f"Помилка мобільного API списку обладнання: {e}")
        return Response(
            {'error': 'Помилка отримання списку обладнання'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def scan_qr_code(request):
    """Сканування QR-коду для отримання інформації про обладнання"""
    try:
        qr_data = request.data.get('qr_data')
        serial_number = request.data.get('serial_number')
        
        if not qr_data and not serial_number:
            return Response(
                {'error': 'Необхідно вказати qr_data або serial_number'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Спробувати знайти по серійному номеру з QR-коду
        equipment = None
        
        if qr_data:
            # Парсити QR-код (формат: "Equipment: Name\nSerial: XXXXX\nLocation: YYYY")
            lines = qr_data.split('\n')
            for line in lines:
                if line.startswith('Serial:'):
                    serial_number = line.replace('Serial:', '').strip()
                    break
        
        if serial_number:
            try:
                equipment = Equipment.objects.get(serial_number=serial_number)
            except Equipment.DoesNotExist:
                return Response(
                    {'error': 'Обладнання з таким серійним номером не знайдено'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if not equipment:
            return Response(
                {'error': 'Не вдалося розпізнати QR-код'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Логування сканування
        logger.info(f"QR-код відсканований користувачем {request.user.username} для обладнання {equipment.serial_number}")
        
        # Серіалізувати дані
        serializer = EquipmentSerializer(equipment)
        equipment_data = serializer.data
        
        # Додати додаткову інформацію для мобільного додатку
        equipment_data.update({
            'age_in_years': equipment.get_age_in_years(),
            'is_under_warranty': equipment.is_under_warranty(),
            'needs_maintenance': equipment.needs_maintenance(),
            'days_until_expiry': equipment.days_until_expiry(),
            'current_value': float(equipment.get_depreciation_value() or 0),
            'scan_time': timezone.now().isoformat(),
            'scanned_by': request.user.username
        })
        
        # Створити уведомлення про сканування для відповідальної особи
        if equipment.responsible_person and equipment.responsible_person != request.user:
            Notification.objects.create(
                user=equipment.responsible_person,
                equipment=equipment,
                title="Обладнання відскановане",
                message=f"Обладнання '{equipment.name}' було відскановане користувачем {request.user.get_full_name() or request.user.username}",
                notification_type='INFO',
                priority='LOW'
            )
        
        return Response(equipment_data)
        
    except Exception as e:
        logger.error(f"Помилка сканування QR-коду: {e}")
        return Response(
            {'error': 'Помилка обробки QR-коду'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_equipment_location(request):
    """Оновлення місцезнаходження обладнання (мобільний додаток)"""
    try:
        equipment_id = request.data.get('equipment_id')
        new_location = request.data.get('location')
        
        if not equipment_id or not new_location:
            return Response(
                {'error': 'Необхідно вказати equipment_id та location'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
        except Equipment.DoesNotExist:
            return Response(
                {'error': 'Обладнання не знайдено'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Перевірити права (тільки поточний користувач або відповідальна особа)
        if equipment.current_user != request.user and equipment.responsible_person != request.user:
            if not request.user.is_staff:
                return Response(
                    {'error': 'Недостатньо прав для зміни місцезнаходження'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        old_location = equipment.location
        equipment.location = new_location.strip()
        equipment.save(update_fields=['location'])
        
        # Логування
        logger.info(f"Місцезнаходження обладнання {equipment.serial_number} змінено з '{old_location}' на '{new_location}' користувачем {request.user.username}")
        
        # Створити уведомлення
        if equipment.responsible_person and equipment.responsible_person != request.user:
            Notification.objects.create(
                user=equipment.responsible_person,
                equipment=equipment,
                title="Змінено місцезнаходження",
                message=f"Місцезнаходження обладнання '{equipment.name}' змінено з '{old_location}' на '{new_location}' користувачем {request.user.get_full_name() or request.user.username}",
                notification_type='INFO',
                priority='MEDIUM'
            )
        
        return Response({
            'success': True,
            'old_location': old_location,
            'new_location': new_location,
            'updated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Помилка оновлення місцезнаходження: {e}")
        return Response(
            {'error': 'Помилка оновлення місцезнаходження'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_issue(request):
    """Повідомити про проблему з обладнанням"""
    try:
        equipment_id = request.data.get('equipment_id')
        issue_description = request.data.get('description')
        issue_type = request.data.get('type', 'GENERAL')  # GENERAL, HARDWARE, SOFTWARE, NETWORK
        
        if not equipment_id or not issue_description:
            return Response(
                {'error': 'Необхідно вказати equipment_id та description'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            equipment = Equipment.objects.get(id=equipment_id)
        except Equipment.DoesNotExist:
            return Response(
                {'error': 'Обладнання не знайдено'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Створити уведомлення для відповідальної особи
        title_map = {
            'HARDWARE': 'Апаратна проблема',
            'SOFTWARE': 'Проблема ПЗ', 
            'NETWORK': 'Мережева проблема',
            'GENERAL': 'Проблема з обладнанням'
        }
        
        title = title_map.get(issue_type, 'Проблема з обладнанням')
        
        # Створити уведомлення для відповідальної особи
        if equipment.responsible_person:
            Notification.objects.create(
                user=equipment.responsible_person,
                equipment=equipment,
                title=title,
                message=f"Користувач {request.user.get_full_name() or request.user.username} повідомив про проблему з обладнанням '{equipment.name}':\n\n{issue_description}",
                notification_type='WARNING',
                priority='HIGH'
            )
        
        # Створити уведомлення для адміністраторів
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                equipment=equipment,
                title=f"{title} (від користувача)",
                message=f"Користувач {request.user.get_full_name() or request.user.username} повідомив про проблему:\n\nОбладнання: {equipment.name} ({equipment.serial_number})\nТип: {issue_type}\nОпис: {issue_description}",
                notification_type='WARNING',
                priority='MEDIUM'
            )
        
        # Логування
        logger.warning(f"Повідомлення про проблему з обладнанням {equipment.serial_number} від користувача {request.user.username}: {issue_description}")
        
        return Response({
            'success': True,
            'message': 'Повідомлення про проблему надіслано',
            'report_time': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Помилка повідомлення про проблему: {e}")
        return Response(
            {'error': 'Помилка надсилання повідомлення'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mobile_user_equipment(request):
    """Обладнання поточного користувача"""
    try:
        user_equipment = Equipment.objects.filter(
            current_user=request.user
        ).values(
            'id', 'name', 'category', 'status', 'location',
            'serial_number', 'manufacturer', 'purchase_date',
            'warranty_until', 'next_maintenance_date'
        )
        
        # Додати додаткову інформацію
        equipment_list = []
        for equipment_data in user_equipment:
            equipment_obj = Equipment.objects.get(id=equipment_data['id'])
            
            equipment_data.update({
                'category_display': equipment_obj.get_category_display(),
                'status_display': equipment_obj.get_status_display(),
                'is_under_warranty': equipment_obj.is_under_warranty(),
                'needs_maintenance': equipment_obj.needs_maintenance(),
                'qrcode_url': request.build_absolute_uri(equipment_obj.qrcode_image.url) if equipment_obj.qrcode_image else None
            })
            
            equipment_list.append(equipment_data)
        
        return Response({
            'count': len(equipment_list),
            'equipment': equipment_list
        })
        
    except Exception as e:
        logger.error(f"Помилка отримання обладнання користувача: {e}")
        return Response(
            {'error': 'Помилка отримання обладнання'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mobile_notifications(request):
    """Уведомлення для мобільного додатку"""
    try:
        unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
        limit = int(request.GET.get('limit', 20))
        
        notifications = Notification.objects.filter(user=request.user)
        
        if unread_only:
            notifications = notifications.filter(read=False)
        
        notifications = notifications.order_by('-created_at')[:limit]
        
        notifications_data = []
        for notification in notifications:
            data = {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.notification_type,
                'priority': notification.priority,
                'read': notification.read,
                'created_at': notification.created_at.isoformat(),
                'equipment': None
            }
            
            if notification.equipment:
                data['equipment'] = {
                    'id': notification.equipment.id,
                    'name': notification.equipment.name,
                    'serial_number': notification.equipment.serial_number,
                    'location': notification.equipment.location
                }
            
            notifications_data.append(data)
        
        return Response({
            'count': len(notifications_data),
            'unread_count': Notification.objects.filter(user=request.user, read=False).count(),
            'notifications': notifications_data
        })
        
    except Exception as e:
        logger.error(f"Помилка отримання уведомлень: {e}")
        return Response(
            {'error': 'Помилка отримання уведомлень'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Позначити уведомлення як прочитане"""
    try:
        notification = Notification.objects.get(
            id=notification_id, 
            user=request.user
        )
        notification.mark_as_read()
        
        return Response({
            'success': True,
            'read_at': notification.read_at.isoformat()
        })
        
    except Notification.DoesNotExist:
        return Response(
            {'error': 'Уведомлення не знайдено'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Помилка позначення уведомлення як прочитаного: {e}")
        return Response(
            {'error': 'Помилка оновлення уведомлення'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mobile_dashboard(request):
    """Дашборд для мобільного додатку"""
    try:
        user = request.user
        today = timezone.now().date()
        
        # Статистика користувача
        user_equipment_count = Equipment.objects.filter(current_user=user).count()
        responsible_equipment_count = Equipment.objects.filter(responsible_person=user).count()
        
        # Обладнання що потребує уваги
        user_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user)
        ).distinct()
        
        needs_attention = {
            'expiring_soon': user_equipment.filter(
                expiry_date__lte=today + timedelta(days=30),
                expiry_date__gte=today
            ).count(),
            'needs_maintenance': len([eq for eq in user_equipment if eq.needs_maintenance()]),
            'warranty_expiring': user_equipment.filter(
                warranty_until__lte=today + timedelta(days=30),
                warranty_until__gte=today
            ).count()
        }
        
        # Останні уведомлення
        recent_notifications = Notification.objects.filter(
            user=user,
            created_at__gte=today - timedelta(days=7)
        ).count()
        
        unread_notifications = Notification.objects.filter(
            user=user,
            read=False
        ).count()
        
        dashboard_data = {
            'user_info': {
                'username': user.username,
                'full_name': user.get_full_name(),
                'department': getattr(user, 'department', ''),
            },
            'equipment_stats': {
                'assigned_to_me': user_equipment_count,
                'responsible_for': responsible_equipment_count,
                'total_under_control': user_equipment.count()
            },
            'attention_needed': needs_attention,
            'notifications': {
                'unread': unread_notifications,
                'recent_week': recent_notifications
            },
            'last_updated': timezone.now().isoformat()
        }
        
        return Response(dashboard_data)
        
    except Exception as e:
        logger.error(f"Помилка мобільного дашборду: {e}")
        return Response(
            {'error': 'Помилка завантаження дашборду'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )