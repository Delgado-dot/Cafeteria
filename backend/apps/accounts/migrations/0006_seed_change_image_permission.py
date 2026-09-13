from django.db import migrations


def seed_change_image(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    # La administradora de bar puede cambiar imágenes de productos por defecto.
    # El admin desarrollador obtiene el control granular desde la matriz de roles.
    for role in ("adminbar", "admindev"):
        RolePermission.objects.update_or_create(
            role=role, code="products.change_image", defaults={"enabled": True}
        )


def unseed_change_image(apps, schema_editor):
    RolePermission = apps.get_model("accounts", "RolePermission")
    RolePermission.objects.filter(code="products.change_image").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_seed_role_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_change_image, unseed_change_image),
    ]