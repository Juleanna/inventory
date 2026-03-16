# inventory/webhooks.py — Webhook інтеграція (Slack/Teams)
import json
import hashlib
import hmac
import logging

from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

import requests as http_requests

logger = logging.getLogger("inventory")
User = get_user_model()


# ============ MODELS ============


class WebhookConfig(models.Model):
    name = models.CharField(max_length=255, verbose_name="Назва")
    url = models.URLField(verbose_name="URL")
    events = models.JSONField(default=list, verbose_name="Події")
    secret = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Секретний ключ"
    )
    active = models.BooleanField(default=True, verbose_name="Активний")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, verbose_name="Створив"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "inventory"
        verbose_name = "Webhook"
        verbose_name_plural = "Webhooks"

    def __str__(self):
        return self.name


class WebhookLog(models.Model):
    webhook = models.ForeignKey(
        WebhookConfig, on_delete=models.CASCADE, related_name="logs"
    )
    event = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    response_status = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True, default="")
    success = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "inventory"
        ordering = ["-sent_at"]
        verbose_name = "Лог Webhook"
        verbose_name_plural = "Логи Webhooks"


# ============ SERVICE ============


class WebhookService:
    """Сервіс для відправки webhook сповіщень"""

    SUPPORTED_EVENTS = [
        "equipment.created",
        "equipment.updated",
        "equipment.status_changed",
        "maintenance.created",
        "maintenance.completed",
        "contract.expiring",
        "license.expiring",
    ]

    @staticmethod
    def send_webhook(event: str, payload: dict):
        """Надіслати webhook для всіх активних конфігурацій з відповідною подією"""
        webhooks = WebhookConfig.objects.filter(active=True)
        for webhook in webhooks:
            if event in webhook.events:
                WebhookService._deliver(webhook, event, payload)

    @staticmethod
    def _deliver(webhook: WebhookConfig, event: str, payload: dict):
        """Доставити webhook"""
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
        }

        body = json.dumps(payload, ensure_ascii=False, default=str)

        if webhook.secret:
            signature = hmac.new(
                webhook.secret.encode(), body.encode(), hashlib.sha256
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        # Визначити формат за URL
        if "hooks.slack.com" in webhook.url:
            body = json.dumps(
                WebhookService._format_slack(event, payload),
                ensure_ascii=False,
                default=str,
            )
        elif "webhook.office.com" in webhook.url or "microsoft.com" in webhook.url:
            body = json.dumps(
                WebhookService._format_teams(event, payload),
                ensure_ascii=False,
                default=str,
            )

        log = WebhookLog(webhook=webhook, event=event, payload=payload)

        try:
            resp = http_requests.post(
                webhook.url, data=body, headers=headers, timeout=10
            )
            log.response_status = resp.status_code
            log.response_body = resp.text[:2000]
            log.success = 200 <= resp.status_code < 300
        except Exception as e:
            log.response_body = str(e)[:2000]
            log.success = False

        log.save()

    @staticmethod
    def _format_slack(event: str, payload: dict) -> dict:
        """Форматувати як Slack повідомлення"""
        title = payload.get("title", event)
        message = payload.get(
            "message", json.dumps(payload, ensure_ascii=False, default=str)[:500]
        )
        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": f"🔔 {title}"},
                },
                {"type": "section", "text": {"type": "mrkdwn", "text": message}},
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"Подія: `{event}` | IT Inventory"}
                    ],
                },
            ]
        }

    @staticmethod
    def _format_teams(event: str, payload: dict) -> dict:
        """Форматувати як Microsoft Teams Adaptive Card"""
        title = payload.get("title", event)
        message = payload.get(
            "message", json.dumps(payload, ensure_ascii=False, default=str)[:500]
        )
        return {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "summary": title,
            "themeColor": "0076D7",
            "title": f"🔔 {title}",
            "sections": [
                {
                    "activityTitle": event,
                    "text": message,
                }
            ],
        }


# ============ SERIALIZERS ============


class WebhookConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookConfig
        fields = "__all__"
        read_only_fields = ["created_by", "created_at", "updated_at"]


class WebhookLogSerializer(serializers.ModelSerializer):
    webhook_name = serializers.CharField(source="webhook.name", read_only=True)

    class Meta:
        model = WebhookLog
        fields = "__all__"


# ============ VIEWSET ============


class WebhookViewSet(viewsets.ModelViewSet):
    queryset = WebhookConfig.objects.all()
    serializer_class = WebhookConfigSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        """Тестове надсилання webhook"""
        webhook = self.get_object()
        payload = {
            "title": "Тестовий webhook",
            "message": "Це тестове повідомлення з IT Inventory",
            "event": "test",
            "timestamp": timezone.now().isoformat(),
        }
        WebhookService._deliver(webhook, "test", payload)
        return Response({"status": "sent"})

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        """Логи доставки webhook"""
        webhook = self.get_object()
        logs = webhook.logs.all()[:50]
        serializer = WebhookLogSerializer(logs, many=True)
        return Response({"results": serializer.data})
