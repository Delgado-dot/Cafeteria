"""Activos visuales almacenados como BYTEA en PostgreSQL."""

from django.db import models

from .validation import sha256, validate_bytes


class VisualAsset(models.Model):
    key = models.SlugField("clave", max_length=120, unique=True)
    file_name = models.CharField("archivo", max_length=255)
    mime_type = models.CharField("tipo MIME", max_length=100)
    data = models.BinaryField("contenido")
    size = models.PositiveBigIntegerField("tamaño (bytes)")
    sha256 = models.CharField("SHA-256", max_length=64, unique=True)
    category = models.CharField("categoría", max_length=50, blank=True, default="")
    is_public = models.BooleanField("público", default=True)
    active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        db_table = "activos_visuales"
        verbose_name = "activo visual"
        verbose_name_plural = "activos visuales"
        ordering = ["key"]

    def __str__(self):
        return self.key

    @classmethod
    def register(cls, *, key, file_name, category, data):
        """Valida los bytes y crea el recurso evitando duplicados (key o SHA-256)."""
        mime = validate_bytes(data, file_name)
        digest = sha256(data)
        if cls.objects.filter(key=key).exists():
            return None, False
        if cls.objects.filter(sha256=digest).exists():
            return None, False
        asset = cls.objects.create(
            key=key,
            file_name=file_name,
            mime_type=mime,
            data=data,
            size=len(data),
            sha256=digest,
            category=category,
            is_public=True,
            active=True,
        )
        return asset, True