from django.db import migrations


def seed_admindev_full_access(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    # Catálogo completo para admindev — acceso total administrativo/técnico
    # Incluye todos los permisos de PERMISSIONS_CATALOG para que admindev pueda
    # ver/modificar Configuración general, usuarios, roles, auditoría, cafetería, etc.
    catalog = [
        "products.view",
        "products.create",
        "products.edit",
        "products.delete",
        "products.change_image",
        "orders.create",
        "orders.view_own",
        "orders.cancel_own",
        "orders.view_all",
        "orders.change_status",
        "stock.view",
        "stock.edit",
        "payments.create",
        "payments.view_own",
        "payments.view_all",
        "payments.review",
        "delivery.view",
        "delivery.edit",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.delete",
        "reports.view",
        "config.view",
        "config.edit",
        "users.view",
        "users.create",
        "users.edit",
        "users.disable",
        "roles.view",
        "roles.edit",
        "audit.view",
        "profile.view",
        "profile.edit",
    ]
    for code in catalog:
        RolePermission.objects.update_or_create(
            role="admindev", code=code, defaults={"enabled": True}
        )


def unseed_admindev_full_access(apps, schema_editor):
    # No revertir a estado anterior — dejar habilitados para no bloquear acceso
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_seed_change_image_permission"),
    ]

    operations = [
        migrations.RunPython(seed_admindev_full_access, unseed_admindev_full_access),
    ]
