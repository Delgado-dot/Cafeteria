"""
Punto de entrada ASGI para el proyecto Cafetería INTESUD.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.cafeteria.settings")

application = get_asgi_application()
