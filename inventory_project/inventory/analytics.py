# inventory/analytics.py
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
import logging

from .models import Equipment, Notification
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger('inventory')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def equipment_analytics(request):
    """Загальна аналітика обладнання"""
    try:
        # Основні статистики
        total_equipment = Equipment.objects.count()
        
        # Статистика по категоріях
        by_category = Equipment.objects.values('category').annotate(
            count=Count('id'),
            total_value=Sum('purchase_price')
        ).order_by('-count')
        
        # Статистика по статусах
        by_status = Equipment.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Статистика по виробниках
        by_manufacturer = Equipment.objects.exclude(
            manufacturer__isnull=True
        ).values('manufacturer').annotate(
            count=Count('id')
        ).order_by('-count')[:10]  # Топ 10
        
        # Статистика по місцезнаходженню
        by_location = Equipment.objects.values('location').annotate(
            count=Count('id'),
            working_count=Count('id', filter=Q(status='WORKING'))
        ).order_by('-count')[:10]
        
        # Фінансова статистика
        total_value = Equipment.objects.aggregate(
            total=Sum('purchase_price')
        )['total'] or Decimal('0.00')
        
        avg_price = Equipment.objects.aggregate(
            avg=Avg('purchase_price')
        )['avg'] or Decimal('0.00')
        
        # Статистика по рокам
        current_year = timezone.now().year
        equipment_by_year = []
        for year in range(current_year - 5, current_year + 1):
            count = Equipment.objects.filter(
                purchase_date__year=year
            ).count()
            if count > 0:
                equipment_by_year.append({
                    'year': year,
                    'count': count
                })
        
        # Обладнання що потребує уваги
        today = timezone.now().date()
        attention_needed = {
            'expiring_soon': Equipment.objects.filter(
                expiry_date__lte=today + timedelta(days=30),
                expiry_date__gte=today,
                status='WORKING'
            ).count(),
            'warranty_expiring': Equipment.objects.filter(
                warranty_until__lte=today + timedelta(days=30),
                warranty_until__gte=today
            ).count(),
            'maintenance_overdue': Equipment.objects.filter(
                Q(next_maintenance_date__lt=today) |
                Q(next_maintenance_date__isnull=True, 
                  last_maintenance_date__lt=today - timedelta(days=365)),
                status='WORKING'
            ).count(),
            'no_maintenance_ever': Equipment.objects.filter(
                last_maintenance_date__isnull=True,
                purchase_date__lt=today - timedelta(days=365)
            ).count()
        }
        
        response_data = {
            'summary': {
                'total_equipment': total_equipment,
                'total_value': float(total_value),
                'average_price': float(avg_price),
                'categories_count': len(by_category),
                'locations_count': Equipment.objects.values('location').distinct().count()
            },
            'by_category': list(by_category),
            'by_status': list(by_status),
            'by_manufacturer': list(by_manufacturer),
            'by_location': list(by_location),
            'by_year': equipment_by_year,
            'attention_needed': attention_needed,
            'generated_at': timezone.now().isoformat()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Помилка отримання аналітики: {e}")
        return Response(
            {'error': 'Помилка отримання аналітики'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_analytics(request):
    """Фінансова аналітика"""
    try:
        # Загальна вартість
        total_purchase_value = Equipment.objects.aggregate(
            total=Sum('purchase_price')
        )['total'] or Decimal('0.00')
        
        # Амортизаційна вартість
        current_value = Decimal('0.00')
        equipment_with_prices = Equipment.objects.filter(
            purchase_price__isnull=False,
            purchase_date__isnull=False
        )
        
        for equipment in equipment_with_prices:
            depreciation_value = equipment.get_depreciation_value()
            if depreciation_value:
                current_value += depreciation_value
        
        # Витрати по роках
        current_year = timezone.now().year
        yearly_expenses = []
        
        for year in range(current_year - 5, current_year + 1):
            year_total = Equipment.objects.filter(
                purchase_date__year=year
            ).aggregate(total=Sum('purchase_price'))['total'] or Decimal('0.00')
            
            if year_total > 0:
                yearly_expenses.append({
                    'year': year,
                    'total_spent': float(year_total),
                    'equipment_count': Equipment.objects.filter(
                        purchase_date__year=year
                    ).count()
                })
        
        # Витрати по категоріях
        category_expenses = Equipment.objects.values('category').annotate(
            total_spent=Sum('purchase_price'),
            count=Count('id'),
            avg_price=Avg('purchase_price')
        ).exclude(total_spent__isnull=True).order_by('-total_spent')
        
        # Топ дорогого обладнання
        expensive_equipment = Equipment.objects.filter(
            purchase_price__isnull=False
        ).order_by('-purchase_price')[:10].values(
            'name', 'purchase_price', 'purchase_date', 'category'
        )
        
        response_data = {
            'summary': {
                'total_purchase_value': float(total_purchase_value),
                'current_value': float(current_value),
                'depreciation_amount': float(total_purchase_value - current_value),
                'depreciation_percentage': float(
                    ((total_purchase_value - current_value) / total_purchase_value * 100) 
                    if total_purchase_value > 0 else 0
                )
            },
            'yearly_expenses': yearly_expenses,
            'category_expenses': list(category_expenses),
            'expensive_equipment': list(expensive_equipment),
            'generated_at': timezone.now().isoformat()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Помилка фінансової аналітики: {e}")
        return Response(
            {'error': 'Помилка фінансової аналітики'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def maintenance_analytics(request):
    """Аналітика обслуговування"""
    try:
        today = timezone.now().date()
        
        # Статистика обслуговування
        total_equipment = Equipment.objects.count()
        
        never_maintained = Equipment.objects.filter(
            last_maintenance_date__isnull=True,
            purchase_date__lt=today - timedelta(days=365)
        ).count()
        
        overdue_maintenance = Equipment.objects.filter(
            Q(next_maintenance_date__lt=today) |
            Q(next_maintenance_date__isnull=True, 
              last_maintenance_date__lt=today - timedelta(days=365)),
            status='WORKING'
        ).count()
        
        upcoming_maintenance = Equipment.objects.filter(
            next_maintenance_date__lte=today + timedelta(days=30),
            next_maintenance_date__gte=today
        ).count()
        
        # Обслуговування по місяцях (останні 12 місяців)
        maintenance_by_month = []
        for i in range(12):
            month_start = today.replace(day=1) - timedelta(days=30*i)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            count = Equipment.objects.filter(
                last_maintenance_date__gte=month_start,
                last_maintenance_date__lte=month_end
            ).count()
            
            maintenance_by_month.append({
                'month': month_start.strftime('%Y-%m'),
                'count': count
            })
        
        maintenance_by_month.reverse()
        
        # Обслуговування по категоріях
        maintenance_by_category = Equipment.objects.values('category').annotate(
            total_count=Count('id'),
            maintained_count=Count('id', filter=Q(last_maintenance_date__isnull=False)),
            overdue_count=Count('id', filter=Q(
                Q(next_maintenance_date__lt=today) |
                Q(next_maintenance_date__isnull=True, 
                  last_maintenance_date__lt=today - timedelta(days=365)),
                status='WORKING'
            ))
        ).order_by('category')
        
        response_data = {
            'summary': {
                'total_equipment': total_equipment,
                'never_maintained': never_maintained,
                'overdue_maintenance': overdue_maintenance,
                'upcoming_maintenance': upcoming_maintenance,
                'maintenance_completion_rate': round(
                    ((total_equipment - never_maintained) / total_equipment * 100) 
                    if total_equipment > 0 else 0, 2
                )
            },
            'maintenance_by_month': maintenance_by_month,
            'maintenance_by_category': list(maintenance_by_category),
            'generated_at': timezone.now().isoformat()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Помилка аналітики обслуговування: {e}")
        return Response(
            {'error': 'Помилка аналітики обслуговування'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_analytics(request):
    """Аналітика користувачів"""
    try:
        # Статистика по користувачах
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        # Користувачі з обладнанням
        users_with_equipment = User.objects.filter(
            assigned_equipment__isnull=False
        ).distinct().count()
        
        # Топ користувачів по кількості обладнання
        top_users = User.objects.annotate(
            equipment_count=Count('assigned_equipment')
        ).filter(equipment_count__gt=0).order_by('-equipment_count')[:10]
        
        top_users_data = []
        for user in top_users:
            total_value = Equipment.objects.filter(
                current_user=user
            ).aggregate(total=Sum('purchase_price'))['total'] or Decimal('0.00')
            
            top_users_data.append({
                'username': user.username,
                'full_name': user.get_full_name(),
                'department': getattr(user, 'department', ''),
                'equipment_count': user.equipment_count,
                'total_value': float(total_value)
            })
        
        # Обладнання по відділах
        equipment_by_department = Equipment.objects.filter(
            current_user__isnull=False
        ).values('current_user__department').annotate(
            count=Count('id'),
            total_value=Sum('purchase_price')
        ).exclude(current_user__department='').order_by('-count')
        
        # Статистика уведомлень
        notification_stats = {
            'total_notifications': Notification.objects.count(),
            'unread_notifications': Notification.objects.filter(read=False).count(),
            'notifications_last_week': Notification.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
        }
        
        response_data = {
            'summary': {
                'total_users': total_users,
                'active_users': active_users,
                'users_with_equipment': users_with_equipment,
                'equipment_coverage': round(
                    (users_with_equipment / active_users * 100) 
                    if active_users > 0 else 0, 2
                )
            },
            'top_users': top_users_data,
            'equipment_by_department': list(equipment_by_department),
            'notification_stats': notification_stats,
            'generated_at': timezone.now().isoformat()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Помилка аналітики користувачів: {e}")
        return Response(
            {'error': 'Помилка аналітики користувачів'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_report(request):
    """Генерація комплексного звіту"""
    try:
        report_type = request.GET.get('type', 'general')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        
        # Базовий фільтр
        equipment_filter = Q()
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                equipment_filter &= Q(purchase_date__gte=date_from)
            except ValueError:
                return Response(
                    {'error': 'Невірний формат дати date_from'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                equipment_filter &= Q(purchase_date__lte=date_to)
            except ValueError:
                return Response(
                    {'error': 'Невірний формат дати date_to'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        equipment_queryset = Equipment.objects.filter(equipment_filter)
        
        if report_type == 'financial':
            # Фінансовий звіт
            report_data = {
                'report_type': 'financial',
                'period': f"{date_from or 'початок'} - {date_to or 'кінець'}",
                'total_equipment': equipment_queryset.count(),
                'total_value': float(equipment_queryset.aggregate(
                    total=Sum('purchase_price')
                )['total'] or Decimal('0.00')),
                'by_category': list(equipment_queryset.values('category').annotate(
                    count=Count('id'),
                    total_value=Sum('purchase_price')
                ).order_by('-total_value')),
                'expensive_items': list(equipment_queryset.filter(
                    purchase_price__isnull=False
                ).order_by('-purchase_price')[:20].values(
                    'name', 'serial_number', 'purchase_price', 'purchase_date'
                ))
            }
            
        elif report_type == 'maintenance':
            # Звіт по обслуговуванню
            today = timezone.now().date()
            
            report_data = {
                'report_type': 'maintenance',
                'period': f"{date_from or 'початок'} - {date_to or 'кінець'}",
                'total_equipment': equipment_queryset.count(),
                'never_maintained': equipment_queryset.filter(
                    last_maintenance_date__isnull=True
                ).count(),
                'overdue_maintenance': equipment_queryset.filter(
                    Q(next_maintenance_date__lt=today) |
                    Q(next_maintenance_date__isnull=True, 
                      last_maintenance_date__lt=today - timedelta(days=365)),
                    status='WORKING'
                ).count(),
                'maintenance_schedule': list(equipment_queryset.filter(
                    next_maintenance_date__isnull=False
                ).order_by('next_maintenance_date').values(
                    'name', 'serial_number', 'next_maintenance_date', 'location'
                )[:50])
            }
            
        else:
            # Загальний звіт
            report_data = {
                'report_type': 'general',
                'period': f"{date_from or 'початок'} - {date_to or 'кінець'}",
                'summary': {
                    'total_equipment': equipment_queryset.count(),
                    'total_value': float(equipment_queryset.aggregate(
                        total=Sum('purchase_price')
                    )['total'] or Decimal('0.00')),
                    'by_status': list(equipment_queryset.values('status').annotate(
                        count=Count('id')
                    ).order_by('-count')),
                    'by_category': list(equipment_queryset.values('category').annotate(
                        count=Count('id')
                    ).order_by('-count')),
                    'by_location': list(equipment_queryset.values('location').annotate(
                        count=Count('id')
                    ).order_by('-count')[:10])
                }
            }
        
        report_data['generated_at'] = timezone.now().isoformat()
        report_data['generated_by'] = request.user.username
        
        return Response(report_data)
        
    except Exception as e:
        logger.error(f"Помилка генерації звіту: {e}")
        return Response(
            {'error': 'Помилка генерації звіту'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )