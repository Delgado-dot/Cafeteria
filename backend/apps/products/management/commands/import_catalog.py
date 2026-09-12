"""Comando para importar el catalogo real del Bar INTESUD a PostgreSQL.

Uso:
    python manage.py import_catalog [--dry-run] [--yes]

Reglas:
- Reutiliza Product y Category (modelos existentes). No crea tablas nuevas.
- Los productos nuevos se crean con stock 0 y available=False (no se inventa
  existencia) y sin imagen (no se inventan fotos) ni descripcion.
- No modifica stock, imagen, min_stock, prep_time ni categoria de productos
  existentes.
- Es idempotente: repetir la ejecucion no duplica.
- Si un producto existente ya tiene el precio del catalogo se omite; si difiere,
  se pide confirmacion antes de reemplazarlo. Sin confirmacion interactiva se
  conserva el precio existente.
- Los jugos/batidos y la ensalada de frutas no tienen precio: quedan pendientes
  y no se publican.
"""

import sys
import unicodedata
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.products.models import Category, Product

#: Categoria -> (producto, precio en USD).
CATALOG = {
    "Snacks": [
        ("Panchitos", "0.50"),
        ("Papas grandes", "1.00"),
        ("Tostitos", "0.75"),
        ("Ryskos", "0.75"),
        ("Tortolines", "0.60"),
        ("Tostachos", "0.65"),
        ("Doritos", "0.75"),
        ("Pipas", "0.30"),
        ("Mix futbolero", "0.65"),
        ("Canguil", "0.50"),
        ("Habas", "1.00"),
        ("Maní dulce", "1.00"),
        ("Tostados", "1.50"),
        ("Manichos", "0.75"),
    ],
    "Dulces y chocolates": [
        ("Gomitas", "1.00"),
        ("Galak", "0.75"),
        ("Jet", "0.75"),
        ("Nestlé", "0.75"),
        ("Barriletes", "0.20"),
        ("Quipitos", "0.30"),
        ("Mentas", "0.05"),
        ("Agogo grande", "0.30"),
        ("Agogo pequeño", "0.20"),
        ("Trident pequeño", "0.50"),
        ("Trident grande", "0.75"),
        ("Bombombum", "0.30"),
        ("Bubaloo", "0.05"),
        ("Halls", "0.75"),
        ("Nucitas", "0.25"),
        ("Crunch", "0.75"),
        ("Mías", "0.75"),
        ("Tigretón", "0.80"),
        ("Inakake", "0.90"),
        ("Monedas", "0.20"),
        ("Nestlé bombón", "0.10"),
    ],
    "Galletas y pastelería": [
        ("Ritz", "0.60"),
        ("Krispis", "0.60"),
        ("Tango", "0.50"),
        ("Oreo", "0.50"),
    ],
    "Bebidas": [
        ("Aguas", "0.60"),
        ("Agua con gas", "0.60"),
        ("Agua saborizada", "0.60"),
        ("Güitig", "0.80"),
        ("Yogurt cereal", "1.10"),
        ("Sprite grande", "0.75"),
        ("Fiora grande", "0.75"),
        ("Cocacola grande", "0.85"),
        ("Fanta grande", "0.75"),
        ("Fuze Tea grande", "0.80"),
        ("Toni", "1.00"),
        ("Vive 100 grande", "1.10"),
        ("Vive 100 pequeño", "0.60"),
        ("220V grande", "1.10"),
        ("220V pequeño", "0.60"),
        ("Monster", "3.00"),
        ("Powerade", "0.80"),
        ("Gaseosas pequeñas", "0.40"),
    ],
    "Comida preparada": [
        ("Lonchys", "1.25"),
        ("Bolones", "1.00"),
        ("Empanadas de verde", "1.00"),
    ],
}

CATEGORY_ORDER = {
    name: order
    for order, name in enumerate(
        ["Snacks", "Dulces y chocolates", "Galletas y pastelería", "Bebidas", "Comida preparada"],
        start=1,
    )
}

#: Sin precio en el cartel: no se publican hasta confirmar precios/presentaciones.
PENDING = [
    "Jugos y batidos - Mora",
    "Jugos y batidos - Fresa",
    "Jugos y batidos - Maracuyá",
    "Jugos y batidos - Tomate",
    "Jugos y batidos - Naranjilla",
    "Jugos y batidos - Papaya",
    "Jugos y batidos - Piña",
    "Jugos y batidos - Melón",
    "Jugos y batidos - Guanábana",
    "Ensalada de frutas",
]

YES_ANSWERS = {"s", "si", "y", "yes", "o", "v"}


def _normalized(name):
    """Nombre en minusculas y sin acentos para comparar coincidencias."""
    return "".join(
        c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c)
    ).lower()


class Command(BaseCommand):
    help = "Importa el catálogo real del Bar INTESUD a PostgreSQL (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Solo simula, no escribe.")
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Reemplaza precios discrepantes sin preguntar (uso bajo confirmación previa).",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        auto_yes = options["yes"]
        interactive = sys.stdin.isatty()

        categories = {}
        for label, order in CATEGORY_ORDER.items():
            exists = Category.objects.filter(name=label).exists()
            if dry:
                if not exists:
                    self.stdout.write(
                        self.style.NOTICE(f"[categoria-nueva] {label} (se creará)")
                    )
                categories[label] = None
                continue
            cat, _ = Category.objects.get_or_create(
                name=label, defaults={"icon": "", "order": order}
            )
            categories[label] = cat

        existing_by_norm = {_normalized(p.name): p for p in Product.objects.all()}

        created = existing_same = price_asked = price_changed = 0

        for label in CATEGORY_ORDER:
            for name, price_text in CATALOG[label]:
                price = Decimal(price_text)
                current = existing_by_norm.get(_normalized(name))

                if current is None:
                    if dry:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"[nuevo] {label} > {name} — ${price} (stock 0, no disponible)"
                            )
                        )
                        created += 1
                        continue
                    product = Product.objects.create(
                        category=categories[label],
                        name=name,
                        price=price,
                        stock=0,
                        available=False,
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"[creado] {label} > {product.name} — ${product.price} "
                            "(stock 0, no disponible)"
                        )
                    )
                    created += 1
                    continue

                if current.price == price:
                    if not dry:
                        self.stdout.write(
                            self.style.NOTICE(
                                f"[existe] {current.name} — ${current.price} (sin cambios)"
                            )
                        )
                    existing_same += 1
                    continue

                price_asked += 1
                replace = False
                if dry:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[precio-difiere] {current.name}: existente ${current.price} "
                            f"vs catálogo ${price} (se pedirá confirmación en el run real)"
                        )
                    )
                    continue
                if auto_yes:
                    replace = True
                elif interactive:
                    answer = input(
                        f"Reemplazar precio de '{current.name}' "
                        f"de ${current.price} a ${price}? [s/N]: "
                    )
                    replace = answer.strip().lower() in YES_ANSWERS
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[precio-conservado] {current.name}: ${current.price} "
                            "(sin confirmación interactiva, no se reemplaza)"
                        )
                    )

                if replace:
                    current.price = price
                    current.save(update_fields=["price", "updated_at"])
                    price_changed += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"[precio-actualizado] {current.name}: ${price}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[precio-conservado] {current.name}: ${current.price}"
                        )
                    )

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                "--- Pendientes (sin precio: no se publican) ---"
            )
        )
        for item in PENDING:
            self.stdout.write(self.style.NOTICE(f"[pendiente] {item}"))

        created_final = created
        summary = (
            f"Catálogo: {created_final} nuevos, {existing_same} ya existían "
            f"(mismo precio), {price_asked} con precio diferente "
            f"({price_changed} reemplazados)."
        )
        if dry:
            summary += " (SIMULACIÓN: no se escribió nada en PostgreSQL)"
        self.stdout.write(self.style.MIGRATE_HEADING(summary))