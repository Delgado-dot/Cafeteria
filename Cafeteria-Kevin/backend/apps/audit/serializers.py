"""
Serializadores de la aplicación de auditoría.
"""

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializador de registros de auditoría."""

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "action",
            "target",
            "details",
            "ip_address",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
