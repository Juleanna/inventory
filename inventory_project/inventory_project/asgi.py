"""
ASGI config for inventory_project project.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_project.settings")
django.setup()

from django.core.asgi import get_asgi_application

try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from inventory.routing import websocket_urlpatterns

    application = ProtocolTypeRouter(
        {
            "http": get_asgi_application(),
            "websocket": URLRouter(websocket_urlpatterns),
        }
    )
except ImportError:
    # channels not installed — fallback to standard ASGI
    application = get_asgi_application()
