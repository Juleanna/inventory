# inventory/automation.py — Автоматичні правила обробки обладнання
import logging
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import viewsets, serializers, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from celery import shared_task

from .models import Equipment, Notification

logger = logging.getLogger("inventory")
User = get_user_model()


# ============ MODEL ============


class AutomationRule(models.Model):
    TRIGGER_CHOICES = [
        ("EQUIPMENT_AGE", "Вік обладнання"),
        ("WARRANTY_EXPIRY", "Закінчення гарантії"),
        ("MAINTENANCE_OVERDUE", "Прострочене ТО"),
        ("STATUS_CHANGE", "Зміна статусу"),
        ("COST_THRESHOLD", "Поріг вартості"),
    ]

    name = models.CharField(max_length=255, verbose_name="Назва")
    description = models.TextField(blank=True, default="", verbose_name="Опис")
    trigger_type = models.CharField(
        max_length=50, choices=TRIGGER_CHOICES, verbose_name="Тип тригера"
    )
    conditions = models.JSONField(default=dict, verbose_name="Умови")
    actions = models.JSONField(default=list, verbose_name="Дії")
    active = models.BooleanField(default=True, verbose_name="Активне")
    last_run = models.DateTimeField(
        null=True, blank=True, verbose_name="Останній запуск"
    )
    run_count = models.IntegerField(default=0, verbose_name="Кількість запусків")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, verbose_name="Створив"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "inventory"
        verbose_name = "Правило автоматизації"
        verbose_name_plural = "Правила автоматизації"

    def __str__(self):
        return self.name


# ============ ENGINE ============


class AutomationEngine:
    """Двигун автоматизації: перевіряє умови та виконує дії"""

    @staticmethod
    def evaluate_rules():
        """Перевірити всі активні правила"""
        rules = AutomationRule.objects.filter(active=True)
        results = []
        for rule in rules:
            try:
                affected = AutomationEngine.evaluate_rule(rule)
                rule.last_run = timezone.now()
                rule.run_count += 1
                rule.save(update_fields=["last_run", "run_count"])
                results.append({"rule": rule.name, "affected": affected})
            except Exception as e:
                logger.error(f"Помилка виконання правила {rule.name}: {e}")
                results.append({"rule": rule.name, "error": str(e)})
        return results

    @staticmethod
    def evaluate_rule(rule: AutomationRule) -> int:
        """Перевірити одне правило та виконати дії"""
        equipment_qs = AutomationEngine._get_matching_equipment(rule)
        affected = 0

        for equipment in equipment_qs:
            for action_config in rule.actions:
                AutomationEngine._execute_action(action_config, equipment, rule)
                affected += 1

        return affected

    @staticmethod
    def _get_matching_equipment(rule: AutomationRule):
        """Отримати обладнання що відповідає умовам правила"""
        today = timezone.now().date()
        conditions = rule.conditions or {}

        if rule.trigger_type == "EQUIPMENT_AGE":
            age_years = int(conditions.get("value", 5))
            cutoff = today - timedelta(days=365 * age_years)
            return Equipment.objects.filter(purchase_date__lte=cutoff, status="WORKING")

        elif rule.trigger_type == "WARRANTY_EXPIRY":
            days = int(conditions.get("value", 30))
            return Equipment.objects.filter(
                warranty_until__lte=today + timedelta(days=days),
                warranty_until__gte=today,
                status="WORKING",
            )

        elif rule.trigger_type == "MAINTENANCE_OVERDUE":
            days = int(conditions.get("value", 365))
            cutoff = today - timedelta(days=days)
            return Equipment.objects.filter(
                models.Q(last_maintenance_date__lt=cutoff)
                | models.Q(
                    last_maintenance_date__isnull=True, purchase_date__lt=cutoff
                ),
                status="WORKING",
            )

        elif rule.trigger_type == "COST_THRESHOLD":
            threshold = float(conditions.get("value", 0))
            field = conditions.get("field", "purchase_price")
            return Equipment.objects.filter(
                **{f"{field}__gte": threshold}, status="WORKING"
            )

        return Equipment.objects.none()

    @staticmethod
    def _execute_action(
        action_config: dict, equipment: Equipment, rule: AutomationRule
    ):
        """Виконати дію для одного обладнання"""
        action_type = action_config.get("type", "")
        params = action_config.get("params", {})

        if action_type == "CHANGE_STATUS":
            new_status = params.get("status", "DISPOSED")
            equipment.status = new_status
            equipment.save(update_fields=["status"])

        elif action_type == "SEND_NOTIFICATION":
            if equipment.current_user:
                Notification.objects.create(
                    user=equipment.current_user,
                    equipment=equipment,
                    title=f"Автоматизація: {rule.name}",
                    message=f'Обладнання "{equipment.name}" відповідає правилу "{rule.name}"',
                    notification_type="INFO",
                    priority="MEDIUM",
                )

        elif action_type == "SEND_WEBHOOK":
            try:
                from .webhooks import WebhookService

                WebhookService.send_webhook(
                    "automation.triggered",
                    {
                        "rule": rule.name,
                        "equipment": equipment.name,
                        "serial_number": equipment.serial_number,
                        "title": f"Автоматизація: {rule.name}",
                        "message": f'Обладнання "{equipment.name}" відповідає правилу "{rule.name}"',
                    },
                )
            except Exception as e:
                logger.error(f"Webhook error: {e}")

        elif action_type == "SEND_EMAIL":
            if equipment.current_user and equipment.current_user.email:
                try:
                    send_mail(
                        subject=f"IT Inventory: {rule.name}",
                        message=(
                            f'Обладнання "{equipment.name}" ({equipment.serial_number})'
                            f' відповідає правилу "{rule.name}".'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[equipment.current_user.email],
                        fail_silently=True,
                    )
                except Exception as e:
                    logger.error(f"Email error: {e}")

        elif action_type == "CREATE_MAINTENANCE":
            try:
                from .maintenance import MaintenanceRequest

                MaintenanceRequest.objects.create(
                    equipment=equipment,
                    requester=rule.created_by
                    or User.objects.filter(is_staff=True).first(),
                    problem_description=f"Автоматично створено правилом: {rule.name}",
                    priority="MEDIUM",
                )
            except Exception as e:
                logger.error(f"Create maintenance error: {e}")


# ============ CELERY TASK ============


@shared_task
def run_automation_rules():
    """Celery задача: запустити всі активні правила автоматизації"""
    results = AutomationEngine.evaluate_rules()
    logger.info(f"Автоматизація: виконано {len(results)} правил")
    return results


# ============ SERIALIZER ============


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = "__all__"
        read_only_fields = [
            "created_by",
            "last_run",
            "run_count",
            "created_at",
            "updated_at",
        ]


# ============ VIEWSET ============


class AutomationRuleViewSet(viewsets.ModelViewSet):
    queryset = AutomationRule.objects.all().order_by("-created_at")
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        """Запустити конкретне правило"""
        rule = self.get_object()
        try:
            affected = AutomationEngine.evaluate_rule(rule)
            rule.last_run = timezone.now()
            rule.run_count += 1
            rule.save(update_fields=["last_run", "run_count"])
            return Response({"status": "ok", "affected": affected})
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"], url_path="run-all")
    def run_all(self, request):
        """Запустити всі активні правила"""
        results = AutomationEngine.evaluate_rules()
        return Response({"results": results})
