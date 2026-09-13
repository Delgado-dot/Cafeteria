"""
Servicio central de auditoría.

Mecanismo único para registrar acciones relevantes del sistema en AuditLog.
Evita duplicar lógica de captura de IP/usuario en cada vista.
"""

from datetime import date, datetime, time
from decimal import Decimal

from .models import AuditLog


def _json_safe(value):
    """Convierte valores no serializables a tipos JSON.
    Decimal a str para conservar precision; fechas a ISO 8601. Recorre dicts y listas.
    """
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def get_client_ip(request):
    """Obtiene la IP real del cliente respetando proxies."""
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit(*, user=None, action, target="", details=None, request=None, user_name=""):
    """Crea un registro de auditoría persistente en PostgreSQL.

    Parámetros:
        user: instancia del usuario actor (opcional si se pasa request).
        action: código de la acción (ej: "product.update").
        target: objeto afectado (ej: "product:12 (Café)").
        details: dict JSON con detalles relevantes del cambio.
        request: request DRF, para extraer IP y usuario autenticado.
        user_name: nombre de respaldo (útil para actores anónimos).
    """
    actor = user
    if actor is None and request is not None:
        actor = getattr(request, "user", None)

    if actor is not None and getattr(actor, "is_authenticated", False):
        resolved = actor
        name = user_name or (actor.get_full_name() or actor.get_username())
    else:
        resolved = None
        name = user_name or (actor.get_username() if actor is not None else "")

    return AuditLog.objects.create(
        user=resolved,
        user_name=name,
        action=action,
        target=target,
        details=_json_safe(details or {}),
        ip_address=get_client_ip(request),
    )