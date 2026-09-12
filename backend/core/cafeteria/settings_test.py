"""
Configuración de testing de Django.
"""

# Base en settings de desarrollo pero con base de datos en memoria
from core.cafeteria.settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Límites altísimos: el test client comparte la misma IP simulada y los
# tests ejecutan muchos login/register; no debe throttlearse.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "login": "1000000/min",
    "register": "1000000/hour",
    "assets": "1000000/min",
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
