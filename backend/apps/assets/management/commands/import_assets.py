"""Importa los activos visuales del navegador a PostgreSQL.

Uso:
    python manage.py import_assets [directorios...] [--dry-run]

Sin argumentos usa los directorios estáticos del navegador definidos en
config/default. Los recursos se identifican por clave = ruta relativa sin
extensión (p. ej. "images/image"), y el primer directorio con el archivo gana.
Recursos que ya existen (mismo key o mismo SHA-256) se omiten sin error.
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.assets.models import VisualAsset
from apps.assets.validation import sha256

BROWSER_ASSET_DIRS = (
    "frontend/assets/",
)

CATEGORY_HINTS = {
    "login": "login",
    "dashboard": "dashboard",
    "icons": "iconos",
    "logos": "logos",
    "images": "general",
}

SKIP_FILES = {".gitkeep", ".gitignore", "README.md", "LICENSE"}


def _category_for(rel_path):
    rel_lower = rel_path.lower().replace("\\", "/")
    for frag, name in CATEGORY_HINTS.items():
        if frag in rel_lower:
            return name
    return "general"


class Command(BaseCommand):
    help = "Importa activos visuales del navegador hacia PostgreSQL."

    def add_arguments(self, parser):
        parser.add_argument("dirs", nargs="*", default=[])
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        dry = options["dry_run"]
        root = settings.BASE_DIR.parent
        dirs = options["dirs"] or list(BROWSER_ASSET_DIRS)
        roots = [p if Path(p).is_absolute() else root / p for p in dirs]

        files = {}
        for root in roots:
            if not root.exists():
                self.stderr.write(self.style.WARNING(f"Directorio sin archivos (omitido): {root}"))
                continue
            for file in sorted(root.rglob("*")):
                if not file.is_file():
                    continue
                if file.name in SKIP_FILES:
                    continue
                if file.suffix.lower() not in {".png", ".jpg", ".jpeg", ".svg"}:
                    continue
                key = file.relative_to(root).with_suffix("").as_posix()
                if key not in files:
                    files[key] = file

        if not files:
            self.stderr.write(self.style.ERROR("No se encontraron archivos para importar."))
            return

        created, skipped, failed = 0, 0, 0
        for key in sorted(files):
            file = files[key]
            try:
                data = file.read_bytes()
            except OSError as exc:
                self.stderr.write(self.style.ERROR(f"[{key}] no legible: {exc}"))
                failed += 1
                continue
            if not data:
                continue

            if VisualAsset.objects.filter(key=key).exists():
                self.stdout.write(self.style.WARNING(f"[omitido] existe: {key}"))
                skipped += 1
                continue
            if VisualAsset.objects.filter(sha256=sha256(data)).exists():
                self.stdout.write(self.style.WARNING(f"[omitido] duplicado: {key}"))
                skipped += 1
                continue
            if dry:
                self.stdout.write(self.style.NOTICE(f"[simular] {key} <- {file.parent.name}"))
                continue

            try:
                asset, created_flag = VisualAsset.register(
                    key=key,
                    file_name=file.name,
                    category=_category_for(str(file)),
                    data=data,
                )
            except ValueError as exc:
                self.stderr.write(self.style.ERROR(f"[{key}] rechazado: {exc}"))
                failed += 1
                continue
            if asset is None:
                skipped += 1
                continue
            if created_flag:
                self.stdout.write(self.style.SUCCESS(f"[creado] {key} ({asset.size} bytes, {asset.mime_type})"))
                created += 1
            else:
                skipped += 1

        summary = f"Importadas {created} nuevas, omitidas {skipped}, fallidas {failed}."
        if dry:
            summary += " (simulación: no se escribió nada)"
        self.stdout.write(self.style.MIGRATE_HEADING(summary))