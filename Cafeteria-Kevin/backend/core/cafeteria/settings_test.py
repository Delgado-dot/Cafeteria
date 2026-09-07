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

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# El repositorio todavia no contiene migraciones iniciales por decision del proyecto.
# En tests se crean las tablas directamente desde el estado actual de los modelos.
MIGRATION_MODULES = {
    "accounts": None,
    "products": None,
    "suppliers": None,
    "stock": None,
    "orders": None,
    "delivery": None,
    "payments": None,
    "audit": None,
    "config": None,
}
