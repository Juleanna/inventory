# inventory/notifications.py - Система автоматичних сповіщень
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from datetime import datetime, timedelta
import logging

from .models import Equipment, Notification
from accounts.models import CustomUser

logger = logging.getLogger('inventory')


class NotificationService:
    """Сервіс для управління сповіщеннями"""
    
    @staticmethod
    def create_notification(user, title, message, notification_type='INFO', priority='MEDIUM', equipment=None):
        """Створити сповіщення"""
        try:
            notification = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                equipment=equipment
            )
            
            # Відправити email якщо налаштовано
            if user.notification_preferences.get('email_notifications', True):
                NotificationService.send_email_notification(user, notification)
            
            logger.info(f"Створено сповіщення для {user.username}: {title}")
            return notification
            
        except Exception as e:
            logger.error(f"Помилка створення сповіщення: {e}")
            return None
    
    @staticmethod
    def send_email_notification(user, notification):
        """Відправити email сповіщення"""
        try:
            if not user.email:
                return
            
            subject = f"[Inventory] {notification.title}"
            
            # HTML шаблон для email
            html_message = render_to_string('emails/notification.html', {
                'user': user,
                'notification': notification,
                'equipment': notification.equipment
            })
            
            # Текстова версія
            plain_message = f"""
            Привіт {user.get_full_name() or user.username}!
            
            {notification.message}
            
            {f"Обладнання: {notification.equipment.name} ({notification.equipment.serial_number})" if notification.equipment else ""}
            
            Дата: {notification.created_at.strftime('%d.%m.%Y %H:%M')}
            Тип: {notification.get_notification_type_display()}
            Пріоритет: {notification.get_priority_display()}
            
            ---
            Система інвентаризації IT-обладнання
            """
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Email сповіщення відправлено на {user.email}")
            
        except Exception as e:
            logger.error(f"Помилка відправки email сповіщення: {e}")
    
    @staticmethod
    def check_warranty_expiration():
        """Перевірити закінчення гарантії"""
        today = timezone.now().date()
        warning_date = today + timedelta(days=30)  # 30 днів до закінчення
        
        expiring_equipment = Equipment.objects.filter(
            warranty_until__lte=warning_date,
            warranty_until__gte=today,
            status='WORKING'
        )
        
        notifications_created = 0
        
        for equipment in expiring_equipment:
            days_left = (equipment.warranty_until - today).days
            
            # Знайти відповідальних користувачів
            users_to_notify = []
            
            if equipment.current_user:
                users_to_notify.append(equipment.current_user)
            
            if equipment.responsible_person and equipment.responsible_person != equipment.current_user:
                users_to_notify.append(equipment.responsible_person)
            
            # Додати IT менеджерів
            it_managers = CustomUser.objects.filter(
                department='IT',
                is_staff=True
            )
            users_to_notify.extend(it_managers)
            
            for user in users_to_notify:
                # Перевірити чи не було вже сповіщення за останні 7 днів
                recent_notification = Notification.objects.filter(
                    user=user,
                    equipment=equipment,
                    title__icontains='гарантія',
                    created_at__gte=today - timedelta(days=7)
                ).exists()
                
                if not recent_notification:
                    title = f"Закінчується гарантія на {equipment.name}"
                    message = f"""
                    Гарантія на обладнання "{equipment.name}" (серійний номер: {equipment.serial_number}) 
                    закінчується через {days_left} днів ({equipment.warranty_until.strftime('%d.%m.%Y')}).
                    
                    Локація: {equipment.location}
                    Виробник: {equipment.manufacturer}
                    """
                    
                    priority = 'HIGH' if days_left <= 7 else 'MEDIUM'
                    
                    NotificationService.create_notification(
                        user=user,
                        title=title,
                        message=message,
                        notification_type='WARNING',
                        priority=priority,
                        equipment=equipment
                    )
                    
                    notifications_created += 1
        
        logger.info(f"Створено {notifications_created} сповіщень про закінчення гарантії")
        return notifications_created
    
    @staticmethod
    def check_maintenance_due():
        """Перевірити потребу в технічному обслуговуванні"""
        today = timezone.now().date()
        notifications_created = 0
        
        equipment_needing_maintenance = []
        for equipment in Equipment.objects.filter(status='WORKING'):
            if equipment.needs_maintenance():
                equipment_needing_maintenance.append(equipment)
        
        for equipment in equipment_needing_maintenance:
            # Визначити скільки днів прострочено
            if equipment.last_maintenance_date:
                days_overdue = (today - equipment.last_maintenance_date).days - 365
            else:
                days_overdue = (today - equipment.purchase_date).days if equipment.purchase_date else 999
            
            # Знайти користувачів для сповіщення
            users_to_notify = []
            
            if equipment.responsible_person:
                users_to_notify.append(equipment.responsible_person)
            
            # Додати IT відділ
            it_staff = CustomUser.objects.filter(department='IT')
            users_to_notify.extend(it_staff)
            
            for user in users_to_notify:
                # Перевірити чи не було сповіщення за останні 14 днів
                recent_notification = Notification.objects.filter(
                    user=user,
                    equipment=equipment,
                    title__icontains='технічне обслуговування',
                    created_at__gte=today - timedelta(days=14)
                ).exists()
                
                if not recent_notification:
                    title = f"Потребує ТО: {equipment.name}"
                    message = f"""
                    Обладнання "{equipment.name}" (серійний номер: {equipment.serial_number}) 
                    потребує технічного обслуговування.
                    
                    {"Прострочено на " + str(days_overdue) + " днів" if days_overdue > 0 else "Час планового ТО"}
                    Останнє ТО: {equipment.last_maintenance_date or "Невідомо"}
                    Локація: {equipment.location}
                    """
                    
                    priority = 'URGENT' if days_overdue > 90 else 'HIGH' if days_overdue > 30 else 'MEDIUM'
                    
                    NotificationService.create_notification(
                        user=user,
                        title=title,
                        message=message,
                        notification_type='WARNING',
                        priority=priority,
                        equipment=equipment
                    )
                    
                    notifications_created += 1
        
        logger.info(f"Створено {notifications_created} сповіщень про технічне обслуговування")
        return notifications_created
    
    @staticmethod
    def check_equipment_age():
        """Перевірити вік обладнання (для заміни)"""
        today = timezone.now().date()
        notifications_created = 0
        
        old_equipment = []
        for equipment in Equipment.objects.filter(status='WORKING', purchase_date__isnull=False):
            age = equipment.get_age_in_years()
            if age and age >= 5:  # 5+ років
                old_equipment.append((equipment, age))
        
        for equipment, age in old_equipment:
            # Знайти IT менеджерів та відповідальних
            users_to_notify = []
            
            it_managers = CustomUser.objects.filter(
                department='IT',
                position__in=['MANAGER', 'DIRECTOR', 'ADMIN']
            )
            users_to_notify.extend(it_managers)
            
            if equipment.responsible_person:
                users_to_notify.append(equipment.responsible_person)
            
            for user in users_to_notify:
                # Сповіщення раз на місяць для старого обладнання
                recent_notification = Notification.objects.filter(
                    user=user,
                    equipment=equipment,
                    title__icontains='заміна',
                    created_at__gte=today - timedelta(days=30)
                ).exists()
                
                if not recent_notification:
                    title = f"Розглянути заміну: {equipment.name}"
                    message = f"""
                    Обладнання "{equipment.name}" (серійний номер: {equipment.serial_number}) 
                    використовується вже {age:.1f} років.
                    
                    Рекомендується розглянути можливість заміни або модернізації.
                    
                    Дата покупки: {equipment.purchase_date}
                    Поточна вартість: {equipment.get_depreciation_value() or "Невідомо"}
                    Локація: {equipment.location}
                    Користувач: {equipment.current_user.get_full_name() if equipment.current_user else "Не призначено"}
                    """
                    
                    priority = 'LOW'
                    
                    NotificationService.create_notification(
                        user=user,
                        title=title,
                        message=message,
                        notification_type='INFO',
                        priority=priority,
                        equipment=equipment
                    )
                    
                    notifications_created += 1
        
        logger.info(f"Створено {notifications_created} сповіщень про старе обладнання")
        return notifications_created
    
    @staticmethod
    def send_daily_digest(user_id=None):
        """Відправити щоденний дайджест"""
        today = timezone.now().date()
        
        if user_id:
            users = CustomUser.objects.filter(id=user_id)
        else:
            # Користувачі які хочуть отримувати дайджест
            users = CustomUser.objects.filter(
                notification_preferences__daily_reports=True,
                is_active=True
            )
        
        digests_sent = 0
        
        for user in users:
            # Збираємо статистику для користувача
            user_equipment = Equipment.objects.filter(
                models.Q(current_user=user) | models.Q(responsible_person=user)
            ).distinct()
            
            if not user_equipment.exists():
                continue  # Немає обладнання - немає дайджесту
            
            # Статистика
            total_equipment = user_equipment.count()
            needs_maintenance = len([eq for eq in user_equipment if eq.needs_maintenance()])
            warranty_expiring = user_equipment.filter(
                warranty_until__lte=today + timedelta(days=30),
                warranty_until__gte=today
            ).count()
            
            unread_notifications = Notification.objects.filter(
                user=user,
                read=False,
                created_at__date=today
            ).count()
            
            # Відправляємо дайджест тільки якщо є що розповісти
            if needs_maintenance > 0 or warranty_expiring > 0 or unread_notifications > 0:
                
                subject = f"Щоденний дайджест інвентаризації - {today.strftime('%d.%m.%Y')}"
                
                html_message = render_to_string('emails/daily_digest.html', {
                    'user': user,
                    'date': today,
                    'total_equipment': total_equipment,
                    'needs_maintenance': needs_maintenance,
                    'warranty_expiring': warranty_expiring,
                    'unread_notifications': unread_notifications,
                })
                
                plain_message = f"""
                Щоденний дайджест інвентаризації - {today.strftime('%d.%m.%Y')}
                
                Привіт {user.get_full_name() or user.username}!
                
                Загальна статистика вашого обладнання:
                • Всього одиниць: {total_equipment}
                • Потребує ТО: {needs_maintenance}
                • Гарантія закінчується (30 днів): {warranty_expiring}
                • Нових сповіщень: {unread_notifications}
                
                ---
                Система інвентаризації IT-обладнання
                """
                
                try:
                    send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        html_message=html_message,
                        fail_silently=False
                    )
                    
                    digests_sent += 1
                    logger.info(f"Щоденний дайджест відправлено користувачу {user.username}")
                    
                except Exception as e:
                    logger.error(f"Помилка відправки дайджесту користувачу {user.username}: {e}")
        
        logger.info(f"Відправлено {digests_sent} щоденних дайджестів")
        return digests_sent
    
    @staticmethod
    def cleanup_old_notifications(days=90):
        """Очистити старі прочитані сповіщення"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        deleted_count = Notification.objects.filter(
            read=True,
            created_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Видалено {deleted_count} старих сповіщень")
        return deleted_count


# Функції для інтеграції з зовнішніми системами

class SlackNotificationService:
    """Сервіс для інтеграції з Slack"""
    
    @staticmethod
    def send_slack_message(message, channel='#it-alerts', urgent=False):
        """Відправити повідомлення в Slack"""
        # Тут буде інтеграція з Slack API
        # Поки що тільки логування
        logger.info(f"Slack повідомлення [{channel}]: {message}")
        
        # TODO: Реалізувати реальну інтеграцію
        # import slack_sdk
        # client = slack_sdk.WebClient(token=settings.SLACK_BOT_TOKEN)
        # client.chat_postMessage(channel=channel, text=message)


class TeamsNotificationService:
    """Сервіс для інтеграції з Microsoft Teams"""
    
    @staticmethod
    def send_teams_message(message, webhook_url=None):
        """Відправити повідомлення в Teams"""
        logger.info(f"Teams повідомлення: {message}")
        
        # TODO: Реалізувати інтеграцію з Teams
        # import requests
        # requests.post(webhook_url, json={'text': message})