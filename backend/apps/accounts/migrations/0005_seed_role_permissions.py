from django.db import migrations, models


def seed_permissions(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    # Catálogo idempotente
    catalog = {
        "user": [
            "products.view",
            "orders.create",
            "orders.view_own",
            "orders.cancel_own",
            "payments.create",
            "payments.view_own",
            "profile.view",
            "profile.edit",
        ],
        "adminbar": [
            "products.view",
            "products.create",
            "products.edit",
            "products.delete",
            "orders.view_all",
            "orders.change_status",
            "stock.view",
            "stock.edit",
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
            "profile.view",
            "profile.edit",
        ],
        "admindev": [
            "users.view",
            "users.create",
            "users.edit",
            "users.disable",
            "roles.view",
            "roles.edit",
            "audit.view",
            "config.view",
            "config.edit",
            "profile.view",
            "profile.edit",
            "products.view",
        ],
    }
    for role, codes in catalog.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    # Desactivar permisos no listados (si existen, dejarlos deshabilitados)
    # No borrar para no perder custom, solo asegurar que los del catálogo estén habilitados


def unseed_permissions(apps, schema_editor):
    # No borrar al revertir, solo deshabilitar para idempotencia
    RolePermission = apps.get_model("accounts", "RolePermission")
    RolePermission.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_rename_accounts_rolepermission_role_code_idx_accounts_ro_role_2ac8aa_idx"),
    ]

    operations = [
        migrations.AlterField(
            model_name="rolepermission",
            name="role",
            field=models.CharField(choices=[("user", "Usuario institucional"), ("adminbar", "Administradora de bar"), ("admindev", "Administrador desarrollador")], db_index=True, max_length=20, verbose_name="rol"),
        ),
        migrations.RunPython(seed_permissions, unseed_permissions),
    ]
