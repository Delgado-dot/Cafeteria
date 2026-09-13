"""
Tests de permisos granulares RolePermission.
Verifica que HasRolePermission realmente controle acceso.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.constants import PERMISSIONS_CATALOG
from apps.accounts.models import RolePermission

User = get_user_model()


def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class PermissionGranularTests(TestCase):
    def setUp(self):
        self.admindev = User.objects.create_user(username="dev", email="dev@intesud.edu.ec", password="pass12345", role="admindev")
        self.adminbar = User.objects.create_user(username="bar", email="bar@intesud.edu.ec", password="pass12345", role="adminbar")
        self.user = User.objects.create_user(username="usr", email="usr@intesud.edu.ec", password="pass12345", role="user")
        # Crear permisos base idempotente (mimics migration)
        from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
        for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
            for code in codes:
                RolePermission.objects.update_or_create(role=role, code=code, defaults={"enabled": True})
        # Limpiar cache
        from apps.accounts.permissions import _clear_permissions_cache
        _clear_permissions_cache()

    def test_admindev_con_permiso_200(self):
        c = auth_client(self.admindev)
        res = c.get("/api/auth/users/")
        self.assertEqual(res.status_code, 200)

    def test_admindev_sin_permiso_403_y_cambio_dinamico(self):
        # Desactivar users.view para admindev
        RolePermission.objects.update_or_create(role="admindev", code="users.view", defaults={"enabled": False})
        from apps.accounts.permissions import _clear_permissions_cache
        _clear_permissions_cache()
        c = auth_client(self.admindev)
        res = c.get("/api/auth/users/")
        self.assertEqual(res.status_code, 403)
        # Reactivar
        RolePermission.objects.update_or_create(role="admindev", code="users.view", defaults={"enabled": True})
        _clear_permissions_cache()
        res = c.get("/api/auth/users/")
        self.assertEqual(res.status_code, 200)

    def test_adminbar_con_permiso_200(self):
        c = auth_client(self.adminbar)
        # adminbar necesita orders.view_all para /api/orders/all/
        res = c.get("/api/orders/all/")
        self.assertIn(res.status_code, [200])

    def test_adminbar_sin_permiso_403(self):
        RolePermission.objects.update_or_create(role="adminbar", code="orders.view_all", defaults={"enabled": False})
        from apps.accounts.permissions import _clear_permissions_cache
        _clear_permissions_cache()
        c = auth_client(self.adminbar)
        res = c.get("/api/orders/all/")
        self.assertEqual(res.status_code, 403)
        # restaurar
        RolePermission.objects.update_or_create(role="adminbar", code="orders.view_all", defaults={"enabled": True})
        _clear_permissions_cache()

    def test_user_intenta_endpoint_admin_403(self):
        c = auth_client(self.user)
        res = c.get("/api/auth/users/")
        self.assertEqual(res.status_code, 403)
        res = c.get("/api/orders/all/")
        self.assertEqual(res.status_code, 403)
        res = c.get("/api/audit/")
        self.assertEqual(res.status_code, 403)

    def test_no_autenticado_401(self):
        c = APIClient()
        res = c.get("/api/auth/users/")
        self.assertEqual(res.status_code, 401)
        res = c.get("/api/orders/all/")
        self.assertEqual(res.status_code, 401)

    def test_manipular_rol_desde_frontend_no_obtiene_privilegios(self):
        # Usuario intenta cambiar su propio rol via PATCH /me (debe ser denegado)
        c = auth_client(self.user)
        res = c.patch("/api/auth/me/", {"role": "admindev"}, format="json")
        # MeView ahora rechaza role en patch con 403
        self.assertIn(res.status_code, [403, 400])
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "user")
        # Intenta via UserDetail (si intenta editar otro)
        c2 = auth_client(self.user)
        res2 = c2.patch(f"/api/auth/users/{self.admindev.id}/", {"role": "user"}, format="json")
        self.assertEqual(res2.status_code, 403)

    def test_endpoint_sensible_sin_permiso_no_filtra_info(self):
        # Desactivar roles.edit y verificar que POST /permissions/ es 403 y no expone datos
        RolePermission.objects.update_or_create(role="admindev", code="roles.edit", defaults={"enabled": False})
        from apps.accounts.permissions import _clear_permissions_cache
        _clear_permissions_cache()
        c = auth_client(self.admindev)
        res = c.post("/api/auth/permissions/", {"role": "user", "code": "products.view", "enabled": True}, format="json")
        self.assertEqual(res.status_code, 403)
        # GET con roles.view desactivado también 403
        RolePermission.objects.update_or_create(role="admindev", code="roles.view", defaults={"enabled": False})
        _clear_permissions_cache()
        res = c.get("/api/auth/permissions/")
        self.assertEqual(res.status_code, 403)

    def test_validacion_codigo_inexistente_400(self):
        c = auth_client(self.admindev)
        res = c.post("/api/auth/permissions/", {"role": "admindev", "code": "no.existe", "enabled": True}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_validacion_rol_no_permitido_400(self):
        c = auth_client(self.admindev)
        res = c.post("/api/auth/permissions/", {"role": "hacker", "code": "users.view", "enabled": True}, format="json")
        self.assertEqual(res.status_code, 400)
