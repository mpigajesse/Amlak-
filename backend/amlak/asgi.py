"""ASGI config pour Amlak."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "amlak.settings")

application = get_asgi_application()
