# inventory/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
import logging

from .models import Equipment, Notification
from .notifications import NotificationService

User = get_user_model()
logger = logging.getLogger("inventory")


@shared_task
def check_equipment_expiry():
    """Перевіряє обладнання що скоро закінчується"""
    try:
        # Перевірка на різні терміни
        warning_periods = [
            (30, "закінчується через 30 днів"),
            (7, "закінчується через тиждень"),
            (1, "закінчується завтра"),
            (0, "закінчилося сьогодні"),
        ]

        notifications_created = 0

        for days, message_suffix in warning_periods:
            target_date = timezone.now().date() + timedelta(days=days)

            # Знайти обладнання що закінчується в цей день
            expiring_equipment = Equipment.objects.filter(
                expiry_date=target_date, status__in=["WORKING", "MAINTENANCE"]
            ).select_related("current_user", "responsible_person")

            for equipment in expiring_equipment:
                # Створити уведомлення для поточного користувача
                if equipment.current_user:
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.current_user,
                        equipment=equipment,
                        title=f"Термін служби обладнання {message_suffix}",
                        defaults={
                            "message": f"Обладнання '{equipment.name}' ({equipment.serial_number}) {message_suffix}",
                            "notification_type": "WARNING" if days > 0 else "ERROR",
                            "priority": "HIGH" if days <= 7 else "MEDIUM",
                        },
                    )
                    if created:
                        notifications_created += 1

                # Створити уведомлення для відповідальної особи
                if (
                    equipment.responsible_person
                    and equipment.responsible_person != equipment.current_user
                ):
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.responsible_person,
                        equipment=equipment,
                        title=f"Термін служби обладнання {message_suffix}",
                        defaults={
                            "message": (
                                f"Обладнання '{equipment.name}' ({equipment.serial_number})"
                                f" під вашою відповідальністю {message_suffix}"
                            ),
                            "notification_type": "WARNING" if days > 0 else "ERROR",
                            "priority": "HIGH" if days <= 7 else "MEDIUM",
                        },
                    )
                    if created:
                        notifications_created += 1

        logger.info(
            f"Створено {notifications_created} уведомлень про закінчення терміну служби"
        )
        return f"Перевірено термін служби, створено {notifications_created} уведомлень"

    except Exception as e:
        logger.error(f"Помилка перевірки терміну служби: {e}")
        raise


@shared_task
def check_warranty_expiry():
    """Перевіряє закінчення гарантії"""
    try:
        warning_periods = [
            (30, "закінчується через 30 днів"),
            (7, "закінчується через тиждень"),
        ]

        notifications_created = 0

        for days, message_suffix in warning_periods:
            target_date = timezone.now().date() + timedelta(days=days)

            expiring_warranty = Equipment.objects.filter(
                warranty_until=target_date, status__in=["WORKING", "MAINTENANCE"]
            ).select_related("current_user", "responsible_person")

            for equipment in expiring_warranty:
                if equipment.responsible_person:
                    notification, created = Notification.objects.get_or_create(
                        user=equipment.responsible_person,
                        equipment=equipment,
                        title=f"Гарантія на обладнання {message_suffix}",
                        defaults={
                            "message": (
                                f"Гарантія на обладнання '{equipment.name}'"
                                f" ({equipment.serial_number}) {message_suffix}"
                            ),
                            "notification_type": "WARNING",
                            "priority": "MEDIUM",
                        },
                    )
                    if created:
                        notifications_created += 1

        logger.info(
            f"Створено {notifications_created} уведомлень про закінчення гарантії"
        )
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
            Q(next_maintenance_date__lt=today)
            | Q(
                next_maintenance_date__isnull=True,
                last_maintenance_date__lt=today - timedelta(days=365),
            ),
            status="WORKING",
        ).select_related("current_user", "responsible_person")

        for equipment in overdue_maintenance:
            if equipment.responsible_person:
                notification, created = Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Потрібне обслуговування обладнання",
                    defaults={
                        "message": f"Обладнання '{equipment.name}' ({equipment.serial_number}) потребує обслуговування",
                        "notification_type": "WARNING",
                        "priority": "HIGH",
                    },
                )
                if created:
                    notifications_created += 1

        # Попередження про майбутнє обслуговування (за 7 днів)
        upcoming_maintenance = Equipment.objects.filter(
            next_maintenance_date=today + timedelta(days=7), status="WORKING"
        ).select_related("responsible_person")

        for equipment in upcoming_maintenance:
            if equipment.responsible_person:
                notification, created = Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Планове обслуговування через тиждень",
                    defaults={
                        "message": (
                            f"Для обладнання '{equipment.name}' ({equipment.serial_number})"
                            " заплановано обслуговування через тиждень"
                        ),
                        "notification_type": "INFO",
                        "priority": "MEDIUM",
                    },
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
            read=True, created_at__lt=cutoff_date
        ).delete()

        # Видалити непрочитані уведомлення старше 90 днів
        cutoff_date_unread = timezone.now() - timedelta(days=90)
        deleted_unread = Notification.objects.filter(
            read=False, created_at__lt=cutoff_date_unread
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
            "total_equipment": Equipment.objects.count(),
            "working_equipment": Equipment.objects.filter(status="WORKING").count(),
            "repair_equipment": Equipment.objects.filter(status="REPAIR").count(),
            "new_equipment_today": Equipment.objects.filter(
                created_at__date=today
            ).count(),
            "expiring_soon": Equipment.objects.filter(
                expiry_date__lte=today + timedelta(days=30), expiry_date__gte=today
            ).count(),
            "maintenance_overdue": Equipment.objects.filter(
                Q(next_maintenance_date__lt=today)
                | Q(
                    next_maintenance_date__isnull=True,
                    last_maintenance_date__lt=today - timedelta(days=365),
                ),
                status="WORKING",
            ).count(),
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
                    "message": report_message,
                    "notification_type": "INFO",
                    "priority": "LOW",
                },
            )
            if created:
                notifications_created += 1

        logger.info(
            f"Створено щоденний звіт для {notifications_created} адміністраторів"
        )
        return f"Створено щоденний звіт для {notifications_created} адміністраторів"

    except Exception as e:
        logger.error(f"Помилка генерації щоденного звіту: {e}")
        raise


@shared_task
def send_email_notifications():
    """Відправка email уведомлень для високопріоритетних сповіщень"""
    try:
        if not hasattr(settings, "EMAIL_HOST") or not settings.EMAIL_HOST:
            logger.warning("Email не налаштований, пропускаємо відправку")
            return "Email не налаштований"

        # Знайти непрочитані уведомлення високого пріоритету за останні 24 години
        cutoff_time = timezone.now() - timedelta(hours=24)
        high_priority_notifications = Notification.objects.filter(
            priority__in=["HIGH", "URGENT"], read=False, created_at__gte=cutoff_time
        ).select_related("user", "equipment")

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
                    "",
                ]

                for notification in notifications:
                    message_parts.append(f"• {notification.title}")
                    message_parts.append(f"  {notification.message}")
                    if notification.equipment:
                        message_parts.append(
                            f"  Обладнання: {notification.equipment.name} ({notification.equipment.serial_number})"
                        )
                    message_parts.append("")

                message_parts.extend(
                    [
                        "Будь ласка, зайдіть до системи інвентаризації для перегляду деталей.",
                        "",
                        "З повагою,",
                        "Система інвентаризації IT",
                    ]
                )

                message = "\n".join(message_parts)

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )

                emails_sent += 1
                logger.info(f"Email відправлено користувачу {user.username}")

            except Exception as e:
                logger.error(
                    f"Помилка відправки email користувачу {user.username}: {e}"
                )

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
            updated_at__lt=offline_threshold, status="WORKING"
        )

        for equipment in stale_equipment:
            # Створити уведомлення про можливу проблему
            if equipment.responsible_person:
                Notification.objects.get_or_create(
                    user=equipment.responsible_person,
                    equipment=equipment,
                    title="Обладнання не відповідає",
                    defaults={
                        "message": (
                            f"Обладнання '{equipment.name}' ({equipment.serial_number})"
                            " не передавало дані більше 7 днів"
                        ),
                        "notification_type": "WARNING",
                        "priority": "MEDIUM",
                    },
                )
            updated_count += 1

        logger.info(f"Перевірено {updated_count} одиниць обладнання на активність")
        return f"Перевірено {updated_count} одиниць обладнання"

    except Exception as e:
        logger.error(f"Помилка оновлення метрик: {e}")
        raise


@shared_task
def backup_critical_data():
    """Автоматичне резервне копіювання критичних даних з підтримкою Google Drive."""
    try:
        from .backup_service import (
            create_full_backup,
            cleanup_old_backups,
            upload_to_gdrive,
            is_gdrive_authorized,
        )
        import json
        import os

        # Завантажити налаштування
        from django.conf import settings as dj_settings

        settings_path = os.path.join(dj_settings.BASE_DIR, "backup_settings.json")
        backup_settings = {
            "auto_backup": True,
            "auto_upload_gdrive": False,
            "max_local_backups": 30,
            "max_age_days": 30,
        }
        if os.path.exists(settings_path):
            try:
                with open(settings_path, "r") as f:
                    backup_settings.update(json.load(f))
            except Exception:
                pass

        if not backup_settings.get("auto_backup", True):
            logger.info("Автобекап вимкнено в налаштуваннях")
            return "Автобекап вимкнено"

        # Створити повний бекап
        result = create_full_backup(created_by="celery-auto")

        # Завантажити на Google Drive якщо налаштовано
        if backup_settings.get("auto_upload_gdrive") and is_gdrive_authorized():
            try:
                gdrive_result = upload_to_gdrive(result["filepath"])
                logger.info(
                    f"Бекап завантажено на Google Drive: {gdrive_result.get('name')}"
                )
            except Exception as e:
                logger.error(f"Помилка завантаження на Google Drive: {e}")

        # Очистити старі бекапи
        removed = cleanup_old_backups(
            max_age_days=backup_settings.get("max_age_days", 30),
            max_count=backup_settings.get("max_local_backups", 30),
        )
        if removed:
            logger.info(f"Видалено {removed} старих бекапів")

        logger.info(f"Створено резервну копію: {result['filename']}")
        return f"Створено резервну копію: {result['filename']}"

    except Exception as e:
        logger.error(f"Помилка створення резервної копії: {e}")
        raise


# ========== НОВІ ЗАВДАННЯ З ПОКРАЩЕНОЮ СИСТЕМОЮ СПОВІЩЕНЬ ==========


@shared_task
def run_smart_notifications():
    """Запустити розумні сповіщення"""
    try:
        results = []

        # Перевірка гарантій
        warranty_count = NotificationService.check_warranty_expiration()
        results.append(f"Гарантії: {warranty_count}")

        # Перевірка ТО
        maintenance_count = NotificationService.check_maintenance_due()
        results.append(f"ТО: {maintenance_count}")

        # Перевірка віку обладнання
        age_count = NotificationService.check_equipment_age()
        results.append(f"Вік: {age_count}")

        logger.info(f"Розумні сповіщення завершено: {', '.join(results)}")
        return f"Розумні сповіщення: {', '.join(results)}"

    except Exception as e:
        logger.error(f"Помилка розумних сповіщень: {e}")
        raise


@shared_task
def send_daily_digests():
    """Відправити щоденні дайджести"""
    try:
        digest_count = NotificationService.send_daily_digest()
        logger.info(f"Відправлено {digest_count} щоденних дайджестів")
        return f"Відправлено {digest_count} дайджестів"

    except Exception as e:
        logger.error(f"Помилка відправки дайджестів: {e}")
        raise


@shared_task
def cleanup_notifications():
    """Очистити старі сповіщення"""
    try:
        deleted_count = NotificationService.cleanup_old_notifications()
        logger.info(f"Видалено {deleted_count} старих сповіщень")
        return f"Видалено {deleted_count} сповіщень"

    except Exception as e:
        logger.error(f"Помилка очищення сповіщень: {e}")
        raise


@shared_task
def monitor_equipment_health():
    """Моніторинг здоров'я обладнання"""
    try:
        alerts_created = 0
        today = timezone.now().date()

        # Знайти обладнання що довго не оновлювалося
        stale_equipment = Equipment.objects.filter(
            updated_at__date__lt=today - timedelta(days=3), status="WORKING"
        )

        for equipment in stale_equipment:
            days_stale = (today - equipment.updated_at.date()).days

            if equipment.current_user:
                title = f"Обладнання не відповідає: {equipment.name}"
                message = f"""
                Обладнання "{equipment.name}" ({equipment.serial_number})
                не передавало дані {days_stale} днів.

                Можливі причини:
                • Вимкнено або не працює
                • Проблеми з мережею
                • Агент не запущений

                Локація: {equipment.location}
                """

                notification = NotificationService.create_notification(
                    user=equipment.current_user,
                    title=title,
                    message=message,
                    notification_type="WARNING",
                    priority="MEDIUM",
                    equipment=equipment,
                )

                if notification:
                    alerts_created += 1

        logger.info(f"Створено {alerts_created} алертів про здоров'я обладнання")
        return f"Створено {alerts_created} алертів"

    except Exception as e:
        logger.error(f"Помилка моніторингу здоров'я: {e}")
        raise


@shared_task
def generate_weekly_summary():
    """Генерувати тижневу зводку"""
    try:
        pass

        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        # Статистика за тиждень
        weekly_stats = {
            "new_equipment": Equipment.objects.filter(
                created_at__date__gte=week_ago
            ).count(),
            "equipment_repaired": Equipment.objects.filter(
                updated_at__date__gte=week_ago, status="WORKING"
            ).count(),
            "notifications_created": Notification.objects.filter(
                created_at__date__gte=week_ago
            ).count(),
            "maintenance_completed": Equipment.objects.filter(
                last_maintenance_date__gte=week_ago
            ).count(),
        }

        # Створити сводку для IT менеджерів
        it_managers = User.objects.filter(
            department="IT", position__in=["MANAGER", "DIRECTOR"], is_active=True
        )

        summary_message = f"""
        Тижнева зводка інвентаризації ({week_ago.strftime('%d.%m')} - {today.strftime('%d.%m.%Y')})

        📊 Статистика:
        • Додано нового обладнання: {weekly_stats['new_equipment']}
        • Відремонтовано: {weekly_stats['equipment_repaired']}
        • Проведено ТО: {weekly_stats['maintenance_completed']}
        • Створено сповіщень: {weekly_stats['notifications_created']}

        💡 Рекомендації:
        • Перевірити прострочене ТО
        • Оновити інформацію про гарантії
        • Провести аудит обладнання
        """

        summaries_sent = 0
        for manager in it_managers:
            notification = NotificationService.create_notification(
                user=manager,
                title=f"Тижнева зводка {today.strftime('%d.%m.%Y')}",
                message=summary_message,
                notification_type="INFO",
                priority="LOW",
            )

            if notification:
                summaries_sent += 1

        logger.info(f"Відправлено {summaries_sent} тижневих зводок")
        return f"Відправлено {summaries_sent} тижневих зводок"

    except Exception as e:
        logger.error(f"Помилка генерації тижневої зводки: {e}")
        raise


@shared_task
def detect_equipment_anomalies():
    """Виявити аномалії в обладнанні"""
    try:
        anomalies_found = 0

        # Обладнання без користувача довше 30 днів
        unassigned_equipment = Equipment.objects.filter(
            current_user__isnull=True,
            status="WORKING",
            created_at__lt=timezone.now() - timedelta(days=30),
        )

        for equipment in unassigned_equipment:
            # Повідомити IT відділ
            it_staff = User.objects.filter(department="IT", is_active=True)

            for user in it_staff:
                notification = NotificationService.create_notification(
                    user=user,
                    title=f"Обладнання без користувача: {equipment.name}",
                    message=(
                        f'Обладнання "{equipment.name}" ({equipment.serial_number})'
                        f" не має призначеного користувача вже"
                        f" {(timezone.now().date() - equipment.created_at.date()).days} днів.\n"
                        f"Локація: {equipment.location}\n"
                        f"Статус: {equipment.get_status_display()}"
                    ),
                    notification_type="WARNING",
                    priority="LOW",
                    equipment=equipment,
                )

                if notification:
                    anomalies_found += 1

        # Обладнання з дублікатами серійних номерів
        from django.db.models import Count

        duplicate_serials = (
            Equipment.objects.values("serial_number")
            .annotate(count=Count("serial_number"))
            .filter(count__gt=1)
        )

        for dup in duplicate_serials:
            Equipment.objects.filter(serial_number=dup["serial_number"])

            # Повідомити адміністраторів
            admins = User.objects.filter(is_staff=True, is_active=True)

            for admin in admins:
                notification = NotificationService.create_notification(
                    user=admin,
                    title="Знайдено дублікати серійних номерів",
                    message=f"""
                    Серійний номер "{dup['serial_number']}" використовується
                    для {dup['count']} одиниць обладнання.

                    Необхідно перевірити та виправити дублікати.
                    """,
                    notification_type="ERROR",
                    priority="HIGH",
                )

                if notification:
                    anomalies_found += 1

        logger.info(f"Виявлено {anomalies_found} аномалій")
        return f"Виявлено {anomalies_found} аномалій"

    except Exception as e:
        logger.error(f"Помилка виявлення аномалій: {e}")
        raise
