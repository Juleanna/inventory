# inventory/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q, Count
import logging

from .models import Equipment, Notification

User = get_user_model()
logger = logging.getLogger('inventory')

@shared_task
def check_equipment_expiry():
    """Перевіряє обладнання що скоро закінчується"""
    try:
        # Перевірка на різні терміни
        warning_periods = [
            (30, 'закінчується через 30 днів'),
            (7, 'закінчується через тиждень'),
            (1, 'закінчується завтра'),
            (0, 'закінчилося сьогодні')
        ]
        
        notifications_created = 0
        
        for days, message_suffix in warning_periods:
            target_date = timezone.now().date() + timedelta(days=days)
            
            # Знайти обладнання що закінчується в цей день
            expiring_equipment = Equipment.objects.filter(
                expiry_date=target_date,
                status__in=['WORKING', 'MAINTENANCE']
            ).select_related('current_user', 'responsible_person')
            
            for equipment in expiring_equipment:
                # Створити уведомлення для поточного користувача
                if equipment.current_user:
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.current_user,
                        equipment=equipment,
                        title=f"Термін служби обладнання {message_suffix}",
                        defaults={
                            'message': f"Обладнання '{equipment.name}' ({equipment.serial_number}) {message_suffix}",
                            'notification_type': 'WARNING' if days > 0 else 'ERROR',
                            'priority': 'HIGH' if days <= 7 else 'MEDIUM'
                        }
                    )
                    if created:
                        notifications_created += 1
                
                # Створити уведомлення для відповідальної особи
                if equipment.responsible_person and equipment.responsible_person != equipment.current_user:
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.responsible_person,
                        equipment=equipment,
                        title=f"Термін служби обладнання {message_suffix}",
                        defaults={
                            'message': f"Обладнання '{equipment.name}' ({equipment.serial_number}) під вашою відповідальністю {message_suffix}",
                            'notification_type': 'WARNING' if days > 0 else 'ERROR',
                            'priority': 'HIGH' if days <= 7 else 'MEDIUM'
                        }
                    )
                    if created:
                        notifications_created += 1
        
        logger.info(f"Створено {notifications_created} уведомлень про закінчення терміну служби")
        return f"Перевірено термін служби, створено {notifications_created} уведомлень"
        
    except Exception as e:
        logger.error(f"Помилка перевірки терміну служби: {e}")
        raise

@shared_task
def check_warranty_expiry():
    """Перевіряє закінчення гарантії"""
    try:
        warning_periods = [
            (30, 'закінчується через 30 днів'),
            (7, 'закінчується через тиждень')
        ]
        
        notifications_created = 0
        
        for days, message_suffix in warning_periods:
            target_date = timezone.now().date() + timedelta(days=days)
            
            expiring_warranty = Equipment.objects.filter(
                warranty_until=target_date,
                status__in=['WORKING', 'MAINTENANCE']
            ).select_related('current_user', 'responsible_person')
            
            for equipment in expiring_warranty:
                if equipment.responsible_person:
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.responsible_person,
                        equipment=equipment,
                        title=f"Гарантія на обладнання {message_suffix}",
                        defaults={
                            'message': f"Гарантія на обладнання '{equipment.name}' ({equipment.serial_number}) {message_suffix}",
                            'notification_type': 'WARNING',
                            'priority': 'MEDIUM'
                        }
                    )
                    if created:
                        notifications_created += 1
        
        logger.info(f"Створено {notifications_created} уведомлень про закінчення гарантії")
        return f"Перевірено гарантії, створено {notifications_created} уведомлень"
        
    except Exception as e:
        logger.error(f"Помилка перевірки гарантій: {e}")
        raise

@shared_task
def check_maintenance_schedule():
    """Перевіряє графік обслуговування"""
    try:
        notifications_created = 0
        today = timezone.now().date()
        
        # Обладнання що потребує обслуговування
        overdue_maintenance = Equipment.objects.filter(
            Q(next_maintenance_date__lt=today) |
            Q(next_maintenance_date__isnull=True, last_maintenance_date__lt=today - timedelta(days=365)),
            status='WORKING'
        ).select_related('current_user', 'responsible_person')
        
        for equipment in overdue_maintenance:
            if equipment.responsible_person:
                notification, created = Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Потрібне обслуговування обладнання",
                    defaults={
                        'message': f"Обладнання '{equipment.name}' ({equipment.serial_number}) потребує обслуговування",
                        'notification_type': 'WARNING',
                        'priority': 'HIGH'
                    }
                )
                if created:
                    notifications_created += 1
        
        # Попередження про майбутнє обслуговування (за 7 днів)
        upcoming_maintenance = Equipment.objects.filter(
            next_maintenance_date=today + timedelta(days=7),
            status='WORKING'
        ).select_related('responsible_person')
        
        for equipment in upcoming_maintenance:
            if equipment.responsible_person:
                notification, created = Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Планове обслуговування через тиждень",
                    defaults={
                        'message': f"Для обладнання '{equipment.name}' ({equipment.serial_number}) заплановано обслуговування через тиждень",
                        'notification_type': 'INFO',
                        'priority': 'MEDIUM'
                    }
                )
                if created:
                    notifications_created += 1
        
        logger.info(f"Створено {notifications_created} уведомлень про обслуговування")
        return f"Перевірено графік обслуговування, створено {notifications_created} уведомлень"
        
    except Exception as e:
        logger.error(f"Помилка перевірки графіку обслуговування: {e}")
        raise

@shared_task
def cleanup_old_notifications():
    """Очищення старих уведомлень"""
    try:
        # Видалити прочитані уведомлення старше 30 днів
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_read = Notification.objects.filter(
            read=True,
            created_at__lt=cutoff_date
        ).delete()
        
        # Видалити непрочитані уведомлення старше 90 днів
        cutoff_date_unread = timezone.now() - timedelta(days=90)
        deleted_unread = Notification.objects.filter(
            read=False,
            created_at__lt=cutoff_date_unread
        ).delete()
        
        total_deleted = deleted_read[0] + deleted_unread[0]
        logger.info(f"Видалено {total_deleted} старих уведомлень")
        return f"Видалено {total_deleted} старих уведомлень"
        
    except Exception as e:
        logger.error(f"Помилка очищення уведомлень: {e}")
        raise

@shared_task
def generate_daily_report():
    """Генерація щоденного звіту"""
    try:
        today = timezone.now().date()
        
        # Збір статистики
        stats = {
            'total_equipment': Equipment.objects.count(),
            'working_equipment': Equipment.objects.filter(status='WORKING').count(),
            'repair_equipment': Equipment.objects.filter(status='REPAIR').count(),
            'new_equipment_today': Equipment.objects.filter(created_at__date=today).count(),
            'expiring_soon': Equipment.objects.filter(
                expiry_date__lte=today + timedelta(days=30),
                expiry_date__gte=today
            ).count(),
            'maintenance_overdue': Equipment.objects.filter(
                Q(next_maintenance_date__lt=today) |
                Q(next_maintenance_date__isnull=True, last_maintenance_date__lt=today - timedelta(days=365)),
                status='WORKING'
            ).count()
        }
        
        # Створити уведомлення для адміністраторів
        admins = User.objects.filter(is_staff=True, is_active=True)
        
        report_message = f"""
        Щоденний звіт інвентаризації на {today.strftime('%d.%m.%Y')}:
        
        📊 Загальна статистика:
        • Всього обладнання: {stats['total_equipment']}
        • Робоче: {stats['working_equipment']}
        • На ремонті: {stats['repair_equipment']}
        
        📈 Зміни за сьогодні:
        • Додано нового обладнання: {stats['new_equipment_today']}
        
        ⚠️ Потребує уваги:
        • Закінчується термін служби (30 днів): {stats['expiring_soon']}
        • Прострочене обслуговування: {stats['maintenance_overdue']}
        """
        
        notifications_created = 0
        for admin in admins:
            notification, created = Notification.objects.get_or_create(
                user=admin,
                title=f"Щоденний звіт {today.strftime('%d.%m.%Y')}",
                defaults={
                    'message': report_message,
                    'notification_type': 'INFO',
                    'priority': 'LOW'
                }
            )
            if created:
                notifications_created += 1
        
        logger.info(f"Створено щоденний звіт для {notifications_created} адміністраторів")
        return f"Створено щоденний звіт для {notifications_created} адміністраторів"
        
    except Exception as e:
        logger.error(f"Помилка генерації щоденного звіту: {e}")
        raise

@shared_task
def send_email_notifications():
    """Відправка email уведомлень для високопріоритетних сповіщень"""
    try:
        if not hasattr(settings, 'EMAIL_HOST') or not settings.EMAIL_HOST:
            logger.warning("Email не налаштований, пропускаємо відправку")
            return "Email не налаштований"
        
        # Знайти непрочитані уведомлення високого пріоритету за останні 24 години
        cutoff_time = timezone.now() - timedelta(hours=24)
        high_priority_notifications = Notification.objects.filter(
            priority__in=['HIGH', 'URGENT'],
            read=False,
            created_at__gte=cutoff_time
        ).select_related('user', 'equipment')
        
        emails_sent = 0
        
        # Групувати уведомлення по користувачах
        user_notifications = {}
        for notification in high_priority_notifications:
            if notification.user.email:
                if notification.user not in user_notifications:
                    user_notifications[notification.user] = []
                user_notifications[notification.user].append(notification)
        
        # Відправити email кожному користувачу
        for user, notifications in user_notifications.items():
            try:
                subject = f"Важливі уведомлення інвентаризації ({len(notifications)})"
                
                message_parts = [
                    f"Шановний {user.get_full_name() or user.username}!",
                    "",
                    "У вас є важливі уведомлення щодо обладнання:",
                    ""
                ]
                
                for notification in notifications:
                    message_parts.append(f"• {notification.title}")
                    message_parts.append(f"  {notification.message}")
                    if notification.equipment:
                        message_parts.append(f"  Обладнання: {notification.equipment.name} ({notification.equipment.serial_number})")
                    message_parts.append("")
                
                message_parts.extend([
                    "Будь ласка, зайдіть до системи інвентаризації для перегляду деталей.",
                    "",
                    "З повагою,",
                    "Система інвентаризації IT"
                ])
                
                message = "\n".join(message_parts)
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False
                )
                
                emails_sent += 1
                logger.info(f"Email відправлено користувачу {user.username}")
                
            except Exception as e:
                logger.error(f"Помилка відправки email користувачу {user.username}: {e}")
        
        return f"Відправлено {emails_sent} email уведомлень"
        
    except Exception as e:
        logger.error(f"Помилка відправки email уведомлень: {e}")
        raise

@shared_task
def update_equipment_metrics():
    """Оновлення метрик обладнання"""
    try:
        updated_count = 0
        
        # Оновити статус обладнання що давно не відповідало
        offline_threshold = timezone.now() - timedelta(days=7)
        
        # Знайти обладнання що не оновлювалося більше 7 днів
        stale_equipment = Equipment.objects.filter(
            updated_at__lt=offline_threshold,
            status='WORKING'
        )
        
        for equipment in stale_equipment:
            # Створити уведомлення про можливу проблему
            if equipment.responsible_person:
                Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Обладнання не відповідає",
                    defaults={
                        'message': f"Обладнання '{equipment.name}' ({equipment.serial_number}) не передавало дані більше 7 днів",
                        'notification_type': 'WARNING',
                        'priority': 'MEDIUM'
                    }
                )
            updated_count += 1
        
        logger.info(f"Перевірено {updated_count} одиниць обладнання на активність")
        return f"Перевірено {updated_count} одиниць обладнання"
        
    except Exception as e:
        logger.error(f"Помилка оновлення метрик: {e}")
        raise

@shared_task
def backup_critical_data():
    """Резервне копіювання критичних даних"""
    try:
        import json
        from django.core import serializers
        from django.conf import settings
        import os
        
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        today = timezone.now().strftime('%Y%m%d')
        backup_file = os.path.join(backup_dir, f'equipment_backup_{today}.json')
        
        # Серіалізувати критичні дані
        equipment_data = serializers.serialize('json', Equipment.objects.all())
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(equipment_data)
        
        # Видалити старі резервні копії (старше 30 днів)
        cutoff_date = timezone.now() - timedelta(days=30)
        for filename in os.listdir(backup_dir):
            if filename.startswith('equipment_backup_') and filename.endswith('.json'):
                file_path = os.path.join(backup_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                if file_time < cutoff_date.replace(tzinfo=None):
                    os.remove(file_path)
        
        logger.info(f"Створено резервну копію: {backup_file}")
        return f"Створено резервну копію: {backup_file}"
        
    except Exception as e:
        logger.error(f"Помилка створення резервної копії: {e}")
        raise