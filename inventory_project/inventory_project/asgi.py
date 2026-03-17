"""
ASGI config for inventory_project project.
"""

import logging
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_project.settings")
django.setup()

from django.core.asgi import get_asgi_application  # noqa: E402

logger = logging.getLogger("inventory")

try:
    from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

    from inventory.routing import websocket_urlpatterns  # noqa: E402

    application = ProtocolTypeRouter(
        {
            "http": get_asgi_application(),
            "websocket": URLRouter(websocket_urlpatterns),
        }
    )
    logger.info("ASGI: Django Channels enabled with WebSocket support")
except Exception as e:
    logger.warning("ASGI: Channels not available (%s), falling back to HTTP-only", e)
    application = get_asgi_application()
