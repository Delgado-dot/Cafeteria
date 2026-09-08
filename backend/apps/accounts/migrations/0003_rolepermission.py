from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_alter_user_groups_alter_user_user_permissions_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="RolePermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(db_index=True, max_length=50, verbose_name="rol")),
                ("code", models.CharField(db_index=True, max_length=80, verbose_name="código de permiso")),
                ("enabled", models.BooleanField(default=False, verbose_name="habilitado")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="actualizado")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="role_permission_updates", to=settings.AUTH_USER_MODEL, verbose_name="actualizado por")),
            ],
            options={
                "verbose_name": "permiso por rol",
                "verbose_name_plural": "permisos por rol",
                "ordering": ["role", "code"],
                "unique_together": {("role", "code")},
            },
        ),
        migrations.AddIndex(
            model_name="rolepermission",
            index=models.Index(fields=["role", "code"], name="accounts_rolepermission_role_code_idx"),
        ),
    ]
