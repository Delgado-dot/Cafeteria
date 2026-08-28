"""
Administración de la aplicación de auditoría.
"""

from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user_name", "action", "target", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("user_name", "action", "target")
    readonly_fields = ("user", "user_name", "action", "target", "details", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
