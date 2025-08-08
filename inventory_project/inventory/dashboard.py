# inventory/dashboard.py - Аналітика та дашборд
from django.db import models
from django.db.models import Count, Sum, Q, F, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import json
from typing import Dict, List, Any

from .models import Equipment, Notification
from accounts.models import CustomUser


class DashboardService:
    """Сервіс для отримання даних дашборду"""
    
    @staticmethod
    def get_equipment_overview() -> Dict[str, Any]:
        """Загальна статистика обладнання"""
        total_count = Equipment.objects.count()
        working_count = Equipment.objects.filter(status='WORKING').count()
        repair_count = Equipment.objects.filter(status='REPAIR').count()
        maintenance_count = Equipment.objects.filter(status='MAINTENANCE').count()
        
        return {
            'total_equipment': total_count,
            'working_equipment': working_count,
            'in_repair': repair_count,
            'in_maintenance': maintenance_count,
            'working_percentage': round((working_count / total_count * 100) if total_count > 0 else 0, 2)
        }
    
    @staticmethod
    def get_financial_overview() -> Dict[str, Any]:
        """Фінансова статистика"""
        equipment_qs = Equipment.objects.exclude(purchase_price__isnull=True)
        
        total_value = equipment_qs.aggregate(
            total=Sum('purchase_price')
        )['total'] or Decimal('0.00')
        
        # Амортизаційна вартість
        current_value = sum(
            eq.get_depreciation_value() or Decimal('0.00') 
            for eq in equipment_qs
        )
        
        # Вартість по категоріях
        category_values = equipment_qs.values('category').annotate(
            total_value=Sum('purchase_price'),
            count=Count('id')
        ).order_by('-total_value')
        
        return {
            'total_purchase_value': float(total_value),
            'current_depreciated_value': float(current_value),
            'depreciation_amount': float(total_value - current_value),
            'category_breakdown': list(category_values)
        }
    
    @staticmethod
    def get_department_statistics() -> List[Dict[str, Any]]:
        """Статистика по відділах"""
        # Групуємо по відділах користувачів
        dept_stats = []
        
        for dept_code, dept_name in CustomUser.DEPARTMENT_CHOICES:
            users_in_dept = CustomUser.objects.filter(department=dept_code)
            equipment_count = Equipment.objects.filter(
                current_user__in=users_in_dept
            ).count()
            
            equipment_value = Equipment.objects.filter(
                current_user__in=users_in_dept
            ).aggregate(
                total=Sum('purchase_price')
            )['total'] or Decimal('0.00')
            
            dept_stats.append({
                'department_code': dept_code,
                'department_name': dept_name,
                'equipment_count': equipment_count,
                'equipment_value': float(equipment_value),
                'user_count': users_in_dept.count()
            })
        
        return sorted(dept_stats, key=lambda x: x['equipment_value'], reverse=True)
    
    @staticmethod
    def get_location_statistics() -> List[Dict[str, Any]]:
        """Статистика по локаціях"""
        return list(
            Equipment.objects.values('location')
            .annotate(
                equipment_count=Count('id'),
                total_value=Sum('purchase_price'),
                working_count=Count('id', filter=Q(status='WORKING')),
                repair_count=Count('id', filter=Q(status='REPAIR'))
            )
            .filter(equipment_count__gt=0)
            .order_by('-equipment_count')[:20]  # Топ 20 локацій
        )
    
    @staticmethod
    def get_maintenance_alerts() -> Dict[str, Any]:
        """Алерти про технічне обслуговування"""
        today = timezone.now().date()
        
        # Обладнання що потребує обслуговування
        needs_maintenance = []
        for equipment in Equipment.objects.filter(status='WORKING'):
            if equipment.needs_maintenance():
                days_overdue = 0
                if equipment.last_maintenance_date:
                    maintenance_due = equipment.last_maintenance_date + timedelta(days=365)
                    days_overdue = (today - maintenance_due).days
                else:
                    days_overdue = (today - equipment.purchase_date).days if equipment.purchase_date else 999
                
                needs_maintenance.append({
                    'id': equipment.id,
                    'name': equipment.name,
                    'serial_number': equipment.serial_number,
                    'location': equipment.location,
                    'days_overdue': days_overdue,
                    'last_maintenance': equipment.last_maintenance_date.isoformat() if equipment.last_maintenance_date else None
                })
        
        # Гарантія що скоро закінчується
        warranty_expiring = list(
            Equipment.objects.filter(
                warranty_until__lte=today + timedelta(days=30),
                warranty_until__gte=today,
                status='WORKING'
            ).values(
                'id', 'name', 'serial_number', 'location', 'warranty_until'
            )[:10]
        )
        
        return {
            'needs_maintenance_count': len(needs_maintenance),
            'needs_maintenance': sorted(needs_maintenance, key=lambda x: x['days_overdue'], reverse=True)[:10],
            'warranty_expiring_count': len(warranty_expiring),
            'warranty_expiring': warranty_expiring
        }
    
    @staticmethod
    def get_monthly_trends(months: int = 12) -> Dict[str, Any]:
        """Тренди за останні місяці"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=months * 30)
        
        # Додавання нового обладнання по місяцях
        monthly_additions = (
            Equipment.objects
            .filter(created_at__date__gte=start_date)
            .extra(select={'month': "date_trunc('month', created_at)"})
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        # Витрати на придбання по місяцях
        monthly_expenses = (
            Equipment.objects
            .filter(
                purchase_date__gte=start_date,
                purchase_price__isnull=False
            )
            .extra(select={'month': "date_trunc('month', purchase_date)"})
            .values('month')
            .annotate(total_spent=Sum('purchase_price'))
            .order_by('month')
        )
        
        return {
            'monthly_additions': list(monthly_additions),
            'monthly_expenses': list(monthly_expenses)
        }
    
    @staticmethod
    def get_equipment_age_distribution() -> Dict[str, Any]:
        """Розподіл обладнання по віку"""
        today = timezone.now().date()
        age_ranges = {
            '0-1 years': 0,
            '1-2 years': 0,
            '2-3 years': 0,
            '3-5 years': 0,
            '5+ years': 0,
            'Unknown': 0
        }
        
        for equipment in Equipment.objects.filter(purchase_date__isnull=False):
            age_years = equipment.get_age_in_years()
            if age_years is None:
                age_ranges['Unknown'] += 1
            elif age_years < 1:
                age_ranges['0-1 years'] += 1
            elif age_years < 2:
                age_ranges['1-2 years'] += 1
            elif age_years < 3:
                age_ranges['2-3 years'] += 1
            elif age_years < 5:
                age_ranges['3-5 years'] += 1
            else:
                age_ranges['5+ years'] += 1
        
        # Обладнання без дати покупки
        no_date_count = Equipment.objects.filter(purchase_date__isnull=True).count()
        age_ranges['Unknown'] += no_date_count
        
        return age_ranges
    
    @staticmethod
    def get_notification_summary() -> Dict[str, Any]:
        """Сводка сповіщень"""
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        return {
            'unread_count': Notification.objects.filter(read=False).count(),
            'high_priority_count': Notification.objects.filter(
                priority='HIGH',
                read=False
            ).count(),
            'urgent_count': Notification.objects.filter(
                priority='URGENT',
                read=False
            ).count(),
            'this_week_count': Notification.objects.filter(
                created_at__date__gte=week_ago
            ).count()
        }


class ReportService:
    """Сервіс для генерації звітів"""
    
    @staticmethod
    def generate_inventory_report(filters: Dict = None) -> List[Dict[str, Any]]:
        """Генерація інвентарного звіту"""
        queryset = Equipment.objects.all()
        
        if filters:
            if filters.get('department'):
                queryset = queryset.filter(
                    current_user__department=filters['department']
                )
            if filters.get('location'):
                queryset = queryset.filter(location__icontains=filters['location'])
            if filters.get('category'):
                queryset = queryset.filter(category=filters['category'])
            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
        
        return list(queryset.values(
            'name', 'serial_number', 'category', 'manufacturer', 'model',
            'location', 'status', 'current_user__username', 'purchase_date',
            'purchase_price', 'warranty_until'
        ))
    
    @staticmethod
    def generate_financial_report() -> Dict[str, Any]:
        """Фінансовий звіт з амортизацією"""
        equipment_list = []
        
        for equipment in Equipment.objects.filter(purchase_price__isnull=False):
            current_value = equipment.get_depreciation_value()
            purchase_price = equipment.purchase_price
            
            equipment_list.append({
                'name': equipment.name,
                'serial_number': equipment.serial_number,
                'category': equipment.get_category_display(),
                'purchase_date': equipment.purchase_date,
                'purchase_price': float(purchase_price) if purchase_price else 0,
                'current_value': float(current_value) if current_value else 0,
                'depreciation': float(purchase_price - current_value) if purchase_price and current_value else 0,
                'age_years': equipment.get_age_in_years()
            })
        
        total_purchase = sum(item['purchase_price'] for item in equipment_list)
        total_current = sum(item['current_value'] for item in equipment_list)
        
        return {
            'equipment': equipment_list,
            'summary': {
                'total_purchase_value': total_purchase,
                'total_current_value': total_current,
                'total_depreciation': total_purchase - total_current,
                'depreciation_percentage': round(
                    (total_purchase - total_current) / total_purchase * 100 
                    if total_purchase > 0 else 0, 2
                )
            }
        }
    
    @staticmethod
    def generate_maintenance_report() -> List[Dict[str, Any]]:
        """Звіт по технічному обслуговуванню"""
        maintenance_data = []
        
        for equipment in Equipment.objects.all():
            maintenance_data.append({
                'name': equipment.name,
                'serial_number': equipment.serial_number,
                'location': equipment.location,
                'last_maintenance': equipment.last_maintenance_date,
                'next_maintenance': equipment.next_maintenance_date,
                'needs_maintenance': equipment.needs_maintenance(),
                'days_since_maintenance': (
                    timezone.now().date() - equipment.last_maintenance_date
                ).days if equipment.last_maintenance_date else None,
                'current_user': equipment.current_user.username if equipment.current_user else None
            })
        
        return maintenance_data