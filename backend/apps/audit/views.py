"""
Vistas de la aplicación de auditoría.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics

from apps.accounts.permissions import IsAdminDeveloper

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """Listar registros de auditoría (solo admin dev)."""

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminDeveloper]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["action", "user"]
    search_fields = ["user_name", "action", "target"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]
