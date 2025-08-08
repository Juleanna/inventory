# inventory/personalization.py
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Equipment, Notification, UserPreferences
import json

User = get_user_model()

class PersonalizationService:
    """Сервіс для персоналізації інтерфейсу користувача"""
    
    CACHE_TIMEOUT = 3600  # 1 година
    
    @classmethod
    def get_user_preferences(cls, user):
        """Отримати налаштування користувача"""
        preferences, created = UserPreferences.objects.get_or_create(
            user=user,
            defaults={
                'dashboard_layout': 'default',
                'theme': 'light',
                'notifications_email': True,
                'notifications_push': True,
                'language': 'uk',
                'items_per_page': 25,
                'default_view': 'cards'
            }
        )
        return preferences
    
    @classmethod
    def get_personalized_dashboard(cls, user):
        """Отримати персоналізований дашборд для користувача"""
        cache_key = f"dashboard_personalized_{user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        # Отримати базові дані
        base_data = cls._get_base_dashboard_data(user)
        
        # Додати персоналізовані секції
        personalized_data = {
            'base': base_data,
            'my_equipment': cls._get_my_equipment_data(user),
            'my_tasks': cls._get_my_tasks_data(user),
            'quick_actions': cls._get_quick_actions(user),
            'recent_activity': cls._get_recent_activity(user),
            'recommendations': cls._get_recommendations(user),
            'shortcuts': cls._get_user_shortcuts(user),
            'alerts': cls._get_priority_alerts(user),
            'statistics': cls._get_personal_statistics(user)
        }
        
        cache.set(cache_key, personalized_data, cls.CACHE_TIMEOUT)
        return personalized_data
    
    @classmethod
    def _get_base_dashboard_data(cls, user):
        """Базові дані дашборду"""
        total_equipment = Equipment.objects.count()
        
        # Обладнання користувача
        user_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user)
        )
        
        return {
            'total_equipment': total_equipment,
            'user_equipment_count': user_equipment.count(),
            'working_equipment': user_equipment.filter(status='WORKING').count(),
            'needs_attention': user_equipment.filter(
                Q(status='REPAIR') | 
                Q(next_maintenance_date__lte=timezone.now().date() + timedelta(days=7))
            ).count()
        }
    
    @classmethod
    def _get_my_equipment_data(cls, user):
        """Обладнання користувача"""
        my_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user)
        ).select_related('manufacturer', 'category')[:10]
        
        equipment_data = []
        for eq in my_equipment:
            # Розрахувати здоров'я обладнання
            health_score = cls._calculate_equipment_health(eq)
            
            equipment_data.append({
                'id': eq.id,
                'name': eq.name,
                'model': eq.model,
                'status': eq.status,
                'status_display': eq.get_status_display(),
                'location': eq.location,
                'health_score': health_score,
                'health_status': cls._get_health_status(health_score),
                'needs_maintenance': eq.next_maintenance_date and eq.next_maintenance_date <= timezone.now().date() + timedelta(days=7),
                'days_until_maintenance': (eq.next_maintenance_date - timezone.now().date()).days if eq.next_maintenance_date else None,
                'is_responsible': eq.responsible_person == user,
                'category': eq.category.name if eq.category else None,
                'manufacturer': eq.manufacturer.name if eq.manufacturer else None
            })
        
        return equipment_data
    
    @classmethod
    def _get_my_tasks_data(cls, user):
        """Завдання користувача"""
        tasks = []
        
        # Обладнання що потребує ТО
        maintenance_due = Equipment.objects.filter(
            responsible_person=user,
            next_maintenance_date__lte=timezone.now().date() + timedelta(days=30)
        ).order_by('next_maintenance_date')[:5]
        
        for eq in maintenance_due:
            days_left = (eq.next_maintenance_date - timezone.now().date()).days if eq.next_maintenance_date else 0
            priority = 'HIGH' if days_left <= 7 else 'MEDIUM' if days_left <= 14 else 'LOW'
            
            tasks.append({
                'id': f"maintenance_{eq.id}",
                'type': 'maintenance',
                'title': f'ТО для {eq.name}',
                'description': f'Планове технічне обслуговування',
                'equipment': eq.name,
                'equipment_id': eq.id,
                'due_date': eq.next_maintenance_date.isoformat() if eq.next_maintenance_date else None,
                'days_left': days_left,
                'priority': priority,
                'status': 'pending'
            })
        
        # Непрочитані важливі сповіщення
        important_notifications = Notification.objects.filter(
            user=user,
            read=False,
            priority__in=['HIGH', 'URGENT']
        ).order_by('-created_at')[:3]
        
        for notif in important_notifications:
            tasks.append({
                'id': f"notification_{notif.id}",
                'type': 'notification',
                'title': notif.title,
                'description': notif.message[:100] + '...' if len(notif.message) > 100 else notif.message,
                'priority': notif.priority,
                'created_at': notif.created_at.isoformat(),
                'equipment': notif.equipment.name if notif.equipment else None,
                'equipment_id': notif.equipment.id if notif.equipment else None,
                'status': 'pending'
            })
        
        return sorted(tasks, key=lambda x: (
            {'HIGH': 0, 'URGENT': 0, 'MEDIUM': 1, 'LOW': 2}[x['priority']],
            x.get('days_left', 999)
        ))
    
    @classmethod
    def _get_quick_actions(cls, user):
        """Швидкі дії для користувача"""
        actions = []
        
        # Базові дії для всіх
        actions.extend([
            {
                'id': 'add_equipment',
                'title': 'Додати обладнання',
                'icon': 'fas fa-plus',
                'url': '/equipment/add/',
                'color': 'success',
                'available': user.has_perm('inventory.add_equipment')
            },
            {
                'id': 'scan_qr',
                'title': 'Сканувати QR',
                'icon': 'fas fa-qrcode',
                'url': '/scan/',
                'color': 'primary',
                'available': True
            },
            {
                'id': 'quick_report',
                'title': 'Повідомити про проблему',
                'icon': 'fas fa-bug',
                'url': '#',
                'color': 'warning',
                'available': True,
                'action': 'quick_report'
            }
        ])
        
        # Дії для адміністраторів
        if user.is_staff:
            actions.extend([
                {
                    'id': 'generate_report',
                    'title': 'Звіти',
                    'icon': 'fas fa-chart-bar',
                    'url': '/reports/',
                    'color': 'info',
                    'available': True
                },
                {
                    'id': 'manage_users',
                    'title': 'Користувачі',
                    'icon': 'fas fa-users',
                    'url': '/admin/auth/user/',
                    'color': 'secondary',
                    'available': True
                }
            ])
        
        return [action for action in actions if action['available']]
    
    @classmethod
    def _get_recent_activity(cls, user):
        """Недавня активність"""
        activities = []
        
        # Недавно оновлене обладнання користувача
        recent_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user),
            updated_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-updated_at')[:5]
        
        for eq in recent_equipment:
            activities.append({
                'type': 'equipment_updated',
                'title': f'Оновлено обладнання: {eq.name}',
                'icon': 'fas fa-laptop',
                'timestamp': eq.updated_at.isoformat(),
                'url': f'/equipment/{eq.id}/',
                'color': 'info'
            })
        
        # Недавні сповіщення
        recent_notifications = Notification.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(days=3)
        ).order_by('-created_at')[:5]
        
        for notif in recent_notifications:
            activities.append({
                'type': 'notification',
                'title': notif.title,
                'icon': 'fas fa-bell',
                'timestamp': notif.created_at.isoformat(),
                'url': f'/notifications/#{notif.id}',
                'color': 'warning' if notif.priority in ['HIGH', 'URGENT'] else 'secondary',
                'read': notif.read
            })
        
        # Сортувати за часом
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return activities[:10]
    
    @classmethod
    def _get_recommendations(cls, user):
        """Рекомендації для користувача"""
        recommendations = []
        
        # Рекомендації на основі стану обладнання
        old_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user),
            purchase_date__lte=timezone.now().date() - timedelta(days=365*5)
        ).count()
        
        if old_equipment > 0:
            recommendations.append({
                'id': 'old_equipment',
                'title': 'Застаріле обладнання',
                'description': f'У вас є {old_equipment} одиниць обладнання старше 5 років. Розгляньте можливість оновлення.',
                'icon': 'fas fa-exclamation-triangle',
                'color': 'warning',
                'action': 'view_old_equipment',
                'priority': 'MEDIUM'
            })
        
        # Рекомендації щодо ТО
        overdue_maintenance = Equipment.objects.filter(
            responsible_person=user,
            next_maintenance_date__lt=timezone.now().date()
        ).count()
        
        if overdue_maintenance > 0:
            recommendations.append({
                'id': 'overdue_maintenance',
                'title': 'Прострочене ТО',
                'description': f'{overdue_maintenance} одиниць обладнання потребують термінового технічного обслуговування.',
                'icon': 'fas fa-tools',
                'color': 'danger',
                'action': 'schedule_maintenance',
                'priority': 'HIGH'
            })
        
        # Рекомендації щодо документації
        undocumented_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user),
            Q(notes__isnull=True) | Q(notes='')
        ).count()
        
        if undocumented_equipment > 3:
            recommendations.append({
                'id': 'missing_documentation',
                'title': 'Відсутня документація',
                'description': f'У {undocumented_equipment} одиниць обладнання відсутні примітки. Додайте опис для кращого управління.',
                'icon': 'fas fa-file-alt',
                'color': 'info',
                'action': 'add_documentation',
                'priority': 'LOW'
            })
        
        return sorted(recommendations, key=lambda x: {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}[x['priority']])
    
    @classmethod
    def _get_user_shortcuts(cls, user):
        """Персональні ярлики користувача"""
        preferences = cls.get_user_preferences(user)
        shortcuts = preferences.dashboard_shortcuts or {}
        
        # Дефолтні ярлики
        default_shortcuts = [
            {
                'id': 'my_equipment',
                'title': 'Моє обладнання',
                'icon': 'fas fa-laptop',
                'url': f'/equipment/?user={user.id}',
                'count': Equipment.objects.filter(current_user=user).count()
            },
            {
                'id': 'notifications',
                'title': 'Сповіщення',
                'icon': 'fas fa-bell',
                'url': '/notifications/',
                'count': Notification.objects.filter(user=user, read=False).count()
            }
        ]
        
        # Об'єднати з персональними ярликами
        return default_shortcuts
    
    @classmethod
    def _get_priority_alerts(cls, user):
        """Приоритетні алерти для користувача"""
        alerts = []
        
        # Критичні проблеми з обладнанням
        critical_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user),
            status__in=['REPAIR', 'BROKEN']
        )
        
        for eq in critical_equipment:
            alerts.append({
                'id': f"critical_{eq.id}",
                'type': 'critical',
                'title': f'Критична проблема: {eq.name}',
                'message': f'Обладнання "{eq.name}" потребує негайної уваги',
                'equipment_id': eq.id,
                'severity': 'HIGH',
                'icon': 'fas fa-exclamation-circle',
                'color': 'danger'
            })
        
        # Термінові сповіщення
        urgent_notifications = Notification.objects.filter(
            user=user,
            read=False,
            priority='URGENT',
            created_at__gte=timezone.now() - timedelta(days=1)
        )
        
        for notif in urgent_notifications:
            alerts.append({
                'id': f"urgent_{notif.id}",
                'type': 'urgent',
                'title': notif.title,
                'message': notif.message,
                'notification_id': notif.id,
                'severity': 'URGENT',
                'icon': 'fas fa-bell',
                'color': 'warning'
            })
        
        return alerts[:5]  # Максимум 5 алертів
    
    @classmethod
    def _get_personal_statistics(cls, user):
        """Персональна статистика користувача"""
        user_equipment = Equipment.objects.filter(
            Q(current_user=user) | Q(responsible_person=user)
        )
        
        stats = {
            'total_equipment': user_equipment.count(),
            'equipment_by_status': {},
            'equipment_by_category': {},
            'maintenance_stats': {},
            'age_distribution': {},
            'health_overview': {}
        }
        
        # Розподіл за статусами
        status_counts = user_equipment.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats['equipment_by_status'][item['status']] = item['count']
        
        # Розподіл за категоріями
        category_counts = user_equipment.values('category__name').annotate(count=Count('id'))
        for item in category_counts:
            category_name = item['category__name'] or 'Без категорії'
            stats['equipment_by_category'][category_name] = item['count']
        
        # Статистика ТО
        overdue_maintenance = user_equipment.filter(
            next_maintenance_date__lt=timezone.now().date()
        ).count()
        
        upcoming_maintenance = user_equipment.filter(
            next_maintenance_date__gte=timezone.now().date(),
            next_maintenance_date__lte=timezone.now().date() + timedelta(days=30)
        ).count()
        
        stats['maintenance_stats'] = {
            'overdue': overdue_maintenance,
            'upcoming': upcoming_maintenance,
            'up_to_date': user_equipment.filter(
                next_maintenance_date__gt=timezone.now().date() + timedelta(days=30)
            ).count()
        }
        
        # Вікова структура
        current_date = timezone.now().date()
        age_ranges = [
            ('new', 0, 1),      # До 1 року
            ('recent', 1, 3),   # 1-3 роки
            ('mature', 3, 5),   # 3-5 років
            ('old', 5, 999)     # Старше 5 років
        ]
        
        for range_name, min_years, max_years in age_ranges:
            min_date = current_date - timedelta(days=365 * max_years)
            max_date = current_date - timedelta(days=365 * min_years)
            
            if max_years == 999:  # Для "старого" обладнання
                count = user_equipment.filter(purchase_date__lt=min_date).count()
            else:
                count = user_equipment.filter(
                    purchase_date__gte=min_date,
                    purchase_date__lt=max_date
                ).count()
            
            stats['age_distribution'][range_name] = count
        
        return stats
    
    @classmethod
    def _calculate_equipment_health(cls, equipment):
        """Розрахувати здоров'я обладнання (0-100)"""
        score = 100
        
        # Вік обладнання
        if equipment.purchase_date:
            age_years = (timezone.now().date() - equipment.purchase_date).days / 365
            if age_years > 5:
                score -= 20
            elif age_years > 3:
                score -= 10
        
        # Статус
        if equipment.status == 'REPAIR':
            score -= 30
        elif equipment.status == 'BROKEN':
            score -= 50
        elif equipment.status == 'MAINTENANCE':
            score -= 10
        
        # Технічне обслуговування
        if equipment.next_maintenance_date:
            days_overdue = (timezone.now().date() - equipment.next_maintenance_date).days
            if days_overdue > 0:
                score -= min(30, days_overdue)  # До -30 балів за прострочене ТО
        
        # Гарантія
        if equipment.warranty_until and equipment.warranty_until < timezone.now().date():
            score -= 5  # Обладнання без гарантії
        
        return max(0, score)
    
    @classmethod
    def _get_health_status(cls, health_score):
        """Отримати статус здоров'я"""
        if health_score >= 80:
            return {'status': 'excellent', 'label': 'Відмінно', 'color': 'success'}
        elif health_score >= 60:
            return {'status': 'good', 'label': 'Добре', 'color': 'info'}
        elif health_score >= 40:
            return {'status': 'fair', 'label': 'Задовільно', 'color': 'warning'}
        else:
            return {'status': 'poor', 'label': 'Погано', 'color': 'danger'}
    
    @classmethod
    def update_user_preferences(cls, user, preferences_data):
        """Оновити налаштування користувача"""
        preferences = cls.get_user_preferences(user)
        
        # Оновити поля
        for field, value in preferences_data.items():
            if hasattr(preferences, field):
                setattr(preferences, field, value)
        
        preferences.save()
        
        # Очистити кеш
        cache_key = f"dashboard_personalized_{user.id}"
        cache.delete(cache_key)
        
        return preferences