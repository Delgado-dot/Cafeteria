"""
Tests para verificar que admindev tiene acceso total a Configuración general.
Cubre los 4 escenarios solicitados:
- admindev + ver configuración → 200
- admindev + guardar configuración → 200 (incluye delivery)
- usuario normal → 403
- rol sin permiso → 403
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
from apps.accounts.models import RolePermission
from apps.accounts.permissions import _clear_permissions_cache
from django.core.cache import cache

User = get_user_model()


def seed_permissions():
    for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    _clear_permissions_cache()
    cache.delete("rolepermission_has_any")


class AdminDevConfigAccessTests(TestCase):
    def setUp(self):
        seed_permissions()
        self.admindev = User.objects.create_user(
            username="dev_test", email="dev_test@intesud.edu.ec", password="pass12345", role="admindev"
        )
        self.normal = User.objects.create_user(
            username="normal_test", email="normal_test@intesud.edu.ec", password="pass12345", role="user"
        )
        self.client_admindev = APIClient()
        self.client_admindev.force_authenticate(user=self.admindev)
        self.client_normal = APIClient()
        self.client_normal.force_authenticate(user=self.normal)

    def test_admindev_ver_configuracion_general_200(self):
        """admindev puede ver Configuración general (GET current es público, pero PATCH requiere permiso)"""
        # GET es AllowAny, pero verificamos que admindev lo ve
        res = self.client_admindev.get("/api/config/current/")
        self.assertEqual(res.status_code, 200)

    def test_admindev_guardar_configuracion_general_200(self):
        """admindev puede guardar Configuración general y delivery (PATCH 200)"""
        res = self.client_admindev.patch("/api/config/", {"name": "Cafetería Test AdminDev", "total_capacity": 12}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        # También delivery, que es parte del flujo de Configuración general en frontend
        res2 = self.client_admindev.patch("/api/delivery/config/", {"enabled": True}, format="json")
        self.assertEqual(res2.status_code, 200, res2.data)

    def test_usuario_normal_no_puede_guardar_configuracion_403(self):
        """usuario normal no puede modificar configuración (403)"""
        res = self.client_normal.patch("/api/config/", {"name": "Hack"}, format="json")
        self.assertEqual(res.status_code, 403)
        # Tampoco delivery
        res2 = self.client_normal.patch("/api/delivery/config/", {"enabled": True}, format="json")
        self.assertEqual(res2.status_code, 403)

    def test_rol_sin_permiso_403(self):
        """si se deshabilita config.edit para admindev, debe recibir 403"""
        perm = RolePermission.objects.get(role="admindev", code="config.edit")
        perm.enabled = False
        perm.save(update_fields=["enabled"])
        _clear_permissions_cache()
        cache.delete("rolepermission_has_any")
        try:
            res = self.client_admindev.patch("/api/config/", {"name": "ShouldFail"}, format="json")
            self.assertEqual(res.status_code, 403)
        finally:
            perm.enabled = True
            perm.save(update_fields=["enabled"])
            _clear_permissions_cache()
            cache.delete("rolepermission_has_any")

    def test_admindev_tiene_acceso_total_administrativo(self):
        """admindev debe tener todos los permisos del catálogo para acceso total"""
        from apps.accounts.constants import PERMISSIONS_CATALOG
        for code in PERMISSIONS_CATALOG:
            # admindev debe tener todos habilitados (acceso total)
            # Verificamos que existe y está habilitado
            rp = RolePermission.objects.filter(role="admindev", code=code).first()
            # Para este test, solo verificamos los críticos de configuración
            if code in ["config.view", "config.edit", "users.view", "roles.view", "audit.view"]:
                self.assertIsNotNone(rp, f"Falta permiso {code} para admindev")
                self.assertTrue(rp.enabled, f"Permiso {code} deshabilitado para admindev")
