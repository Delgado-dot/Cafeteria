"""
Punto de entrada WSGI para el proyecto Cafetería INTESUD.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.cafeteria.settings")

application = get_wsgi_application()
