# inventory/consumers.py — WebSocket consumer для real-time сповіщень
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebSocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

from django.contrib.auth import get_user_model

logger = logging.getLogger("inventory")
User = get_user_model()


class NotificationConsumer(AsyncWebSocketConsumer):
    """WebSocket consumer для сповіщень в реальному часі"""

    async def connect(self):
        # Аутентифікація через JWT token в query params
        token = (
            self.scope["query_string"].decode().split("token=")[-1]
            if b"token=" in self.scope["query_string"]
            else None
        )

        if not token:
            await self.close(code=4001)
            return

        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return

        self.user = user
        self.group_name = f"user_{user.id}"

        # Приєднатися до групи користувача
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        # Приєднатися до загальної групи
        await self.channel_layer.group_add("all_users", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("all_users", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    # Обробники подій від channel layer
    async def notification_message(self, event):
        """Надіслати сповіщення клієнту"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "payload": event.get("payload", {}),
                    "timestamp": event.get("timestamp", ""),
                }
            )
        )

    async def equipment_update(self, event):
        """Надіслати оновлення обладнання"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "equipment_update",
                    "payload": event.get("payload", {}),
                    "timestamp": event.get("timestamp", ""),
                }
            )
        )

    async def maintenance_alert(self, event):
        """Надіслати алерт обслуговування"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "maintenance_alert",
                    "payload": event.get("payload", {}),
                    "timestamp": event.get("timestamp", ""),
                }
            )
        )

    async def system_event(self, event):
        """Надіслати системну подію"""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "system_event",
                    "payload": event.get("payload", {}),
                    "timestamp": event.get("timestamp", ""),
                }
            )
        )

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user_id = access_token["user_id"]
            return User.objects.get(id=user_id)
        except Exception:
            return None
