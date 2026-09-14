"""Vista de administración de activos visuales."""

from django.contrib import admin

from .models import VisualAsset


@admin.register(VisualAsset)
class VisualAssetAdmin(admin.ModelAdmin):
    list_display = (
        "key",
        "mime_type",
        "size",
        "category",
        "is_public",
        "active",
        "updated_at",
    )
    list_filter = ("mime_type", "category", "is_public", "active")
    search_fields = ("key", "file_name")
    readonly_fields = ("key", "mime_type", "size", "sha256", "created_at", "updated_at")
    exclude = ("data",)