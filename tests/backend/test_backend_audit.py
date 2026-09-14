"""
Evidencia de bugs reales detectados en la auditoria backend 2026-09.

BUG-A: OrderSerializer/PaymentSerializer eliminan silenciosamente los campos
       user_name/user_email de la respuesta cuando el usuario fue eliminado
       (Order.user y Payment.user son SET_NULL) -> el contrato de la API pierde
       esas claves en listados/detalles de pedidos y pagos de usuarios borrados,
       lo que puede romper los paneles que las consumen.
BUG-C: RolePermissionListView.post acepta role vazio (""), se salta la
       validacion VALID_ROLES y crea filas RolePermission invalidas.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
from apps.accounts.models import RolePermission
from apps.accounts.permissions import _clear_permissions_cache
from apps.config.models import PaymentMethod
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.products.models import Category, Product

User = get_user_model()


def seed_permissions():
    for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    _clear_permissions_cache()


class DeletedUserSerializationTests(TestCase):
    """BUG-A: listar/detallar pedidos y pagos con usuario eliminado mantiene las claves."""

    def setUp(self):
        seed_permissions()
        self.adminbar = User.objects.create_user(
            username="bar", email="bar@intesud.edu.ec", password="pass12345", role="adminbar"
        )
        self.client_user = User.objects.create_user(
            username="cliente", email="cliente@intesud.edu.ec", password="pass12345", role="user",
            first_name="Clara", last_name="Lopez",
        )
        self.category = Category.objects.create(name="Alimentos")
        self.product = Product.objects.create(
            category=self.category, name="Empanada", price="1.50", stock=5, min_stock=1
        )
        self.method = PaymentMethod.objects.create(code="efectivo-b", name="Efectivo")

    def _order(self):
        order = Order.objects.create(user=self.client_user, delivery_method="pickup")
        OrderItem.objects.create(
            order=order, product=self.product, product_name=self.product.name,
            quantity=1, unit_price="1.50",
        )
        order.calculate_total()
        return order

    def test_orders_listing_keeps_user_field_keys_after_user_deletion(self):
        self._order()
        self.client_user.delete()
        client = APIClient()
        client.force_authenticate(user=self.adminbar)
        res = client.get("/api/orders/all/")
        self.assertEqual(res.status_code, 200, res.data)
        row = (res.data.get("results") or res.data)[0]
        self.assertIn("user_name", row)
        self.assertIn("user_email", row)
        self.assertEqual(row["user_name"], "")

    def test_order_detail_keeps_user_field_keys_after_user_deletion(self):
        order = self._order()
        self.client_user.delete()
        client = APIClient()
        client.force_authenticate(user=self.adminbar)
        res = client.get(f"/api/orders/{order.pk}/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["user_name"], "")
        self.assertEqual(res.data["user_email"], "")

    def test_payments_listing_keeps_user_name_key_after_user_deletion(self):
        order = self._order()
        Payment.objects.create(
            order=order, user=self.client_user, payment_method=self.method,
            amount=order.total, status="approved",
        )
        self.client_user.delete()
        client = APIClient()
        client.force_authenticate(user=self.adminbar)
        res = client.get("/api/payments/all/")
        self.assertEqual(res.status_code, 200, res.data)
        row = (res.data.get("results") or res.data)[0]
        self.assertIn("user_name", row)
        self.assertEqual(row["user_name"], "")

    def test_surviving_users_still_serialize_full_name(self):
        order = self._order()
        client = APIClient()
        client.force_authenticate(user=self.adminbar)
        res = client.get(f"/api/orders/{order.pk}/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["user_name"], "Clara Lopez")


class RolePermissionValidationTests(TestCase):
    """BUG-C: role vazio/inexistente rechazado al crear permisos por rol."""

    def setUp(self):
        seed_permissions()
        self.dev = User.objects.create_user(
            username="dev", email="dev@intesud.edu.ec", password="pass12345", role="admindev"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.dev)

    def test_empty_role_is_rejected_in_single_code_branch(self):
        res = self.client.post(
            "/api/auth/permissions/",
            {"role": "", "code": "products.view", "enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(
            RolePermission.objects.filter(role="").exists(),
            "No debe crearse un permiso con rol vacio.",
        )

    def test_empty_role_is_rejected_in_bulk_branch(self):
        res = self.client.post(
            "/api/auth/permissions/",
            {"role": "", "permissions": {"products.view": True}},
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(
            RolePermission.objects.filter(role="").exists(),
            "No debe crearse un permiso con rol vacio.",
        )

    def test_unknown_role_is_rejected(self):
        res = self.client.post(
            "/api/auth/permissions/",
            {"role": "hacker", "code": "products.view", "enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(
            RolePermission.objects.filter(role="hacker").exists(),
            "No debe crearse un permiso con rol inexistente.",
        )
