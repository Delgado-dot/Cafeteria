"""
Tests de auditoría real (AuditLog) y de los fixes de productos.

Cubre:
- POST /api/products/ devuelve el id del recurso creado.
- DELETE protegido devuelve 409 sin borrar registros históricos.
- Acciones administrativas persisten registros de auditoría.
- PATCH /api/auth/me/ persiste en base de datos y queda auditado.
- GET /api/audit/ expone los registros reales a admindev.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
from apps.accounts.models import RolePermission
from apps.audit.models import AuditLog
from apps.config.models import PaymentMethod
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.products.models import Category, Product
from apps.stock.models import StockMovement, StockMovementType

User = get_user_model()


def seed_permissions():
    """Siembra permisos por rol e invalida la caché de permisos."""
    for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    from apps.accounts.permissions import _clear_permissions_cache

    _clear_permissions_cache()


def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


class AuditIntegrationTests(TestCase):
    def setUp(self):
        seed_permissions()
        self.bar = User.objects.create_user(
            username="bar", email="bar@intesud.edu.ec", password="pass12345", role="adminbar"
        )
        self.dev = User.objects.create_user(
            username="dev", email="dev@intesud.edu.ec", password="pass12345", role="admindev"
        )
        self.user = User.objects.create_user(
            username="usr", email="usr@intesud.edu.ec", password="pass12345", role="user"
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category, name="Producto", price="2.00", stock=4, min_stock=1
        )

    def create_order(self):
        order = Order.objects.create(user=self.user, delivery_method="pickup")
        OrderItem.objects.create(
            order=order, product=self.product, product_name=self.product.name,
            quantity=1, unit_price="2.00",
        )
        return order

    # ---------- Defecto 4: id en la respuesta de creación ----------

    def test_product_create_response_includes_id(self):
        c = auth_client(self.bar)
        res = c.post(
            "/api/products/",
            {"name": "Nuevo", "category": self.category.pk, "price": "1.50", "stock": 2},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(
            res.data.get("id") is not None,
            "La respuesta de creación debe exponer el id",
        )
        self.assertIsInstance(res.data["id"], int)

    # ---------- Defecto 3: DELETE protegido → 409 ----------

    def test_protected_product_delete_returns_409_and_keeps_history(self):
        self.product.adjust_stock(
            6, movement_type=StockMovementType.PURCHASE, reason="stock inicial"
        )
        self.assertTrue(StockMovement.objects.filter(product=self.product).exists())
        c = auth_client(self.bar)
        res = c.delete(f"/api/products/{self.product.pk}/")
        self.assertEqual(res.status_code, 409, res.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Producto")
        self.assertTrue(StockMovement.objects.filter(product=self.product).exists())
        self.assertFalse(
            AuditLog.objects.filter(action="product.delete").exists(),
            "No debe registrarse una eliminación exitosa",
        )

    def test_unprotected_product_can_be_deleted(self):
        c = auth_client(self.bar)
        res = c.delete(f"/api/products/{self.product.pk}/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    # ---------- Auditoría: acciones administrativas ----------

    def test_product_create_and_update_are_audited(self):
        c = auth_client(self.bar)
        created = c.post(
            "/api/products/",
            {"name": "Nuevo", "category": self.category.pk, "price": "1.50", "stock": 2},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        pid = created.data["id"]
        updated = c.patch(f"/api/products/{pid}/", {"price": "2.50"}, format="json")
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="product.create").exists())
        self.assertTrue(AuditLog.objects.filter(action="product.update").exists())

    def test_profile_update_persists_and_is_audited(self):
        c = auth_client(self.user)
        res = c.patch(
            "/api/auth/me/",
            {"first_name": "Nuevo", "last_name": "Apellido", "aula": "7C"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Nuevo")
        self.assertEqual(self.user.aula, "7C")
        audit = AuditLog.objects.filter(action="profile.update").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.details.get("first_name"), "Nuevo")

    def test_user_role_change_and_disable_are_audited(self):
        c = auth_client(self.dev)
        res = c.patch(
            f"/api/auth/users/{self.user.pk}/", {"role": "adminbar"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(AuditLog.objects.filter(action="user.role_change").exists())
        res = c.patch(
            f"/api/auth/users/{self.user.pk}/", {"is_active": False}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(AuditLog.objects.filter(action="user.deactivate").exists())

    def test_order_status_change_by_admin_is_audited(self):
        order = self.create_order()
        c = auth_client(self.bar)
        res = c.patch(
            f"/api/orders/{order.pk}/", {"status": "confirmed"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        audit = AuditLog.objects.filter(action="order.status_change").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.details.get("to"), "confirmed")
        self.assertEqual(audit.target, f"order:{order.order_number}")

    def test_config_update_is_audited(self):
        c = auth_client(self.bar)
        res = c.patch("/api/config/", {"description": "audit test"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        audit = AuditLog.objects.filter(action="config.update").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.details.get("description"), "audit test")

    def test_payment_review_is_audited(self):
        order = self.create_order()
        method = PaymentMethod.objects.create(code="efectivo-test", name="Efectivo")
        payment = Payment.objects.create(
            order=order, user=self.user, payment_method=method,
            amount="2.00", status="pending",
        )
        c = auth_client(self.bar)
        res = c.patch(
            f"/api/payments/{payment.pk}/review/", {"status": "approved"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        audit = AuditLog.objects.filter(action="payment.review").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.details.get("to"), "approved")

    def test_role_permissions_update_is_audited(self):
        c = auth_client(self.dev)
        res = c.post(
            "/api/auth/permissions/",
            {"role": "user", "code": "products.view", "enabled": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        audit = AuditLog.objects.filter(action="role_permissions.update").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.target, "role:user")

    def test_audit_endpoint_exposes_records_to_admindev(self):
        # Genera actividad real
        c = auth_client(self.bar)
        c.patch("/api/config/", {"description": "audit endpoint"}, format="json")
        dev = auth_client(self.dev)
        res = dev.get("/api/audit/")
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.data.get("results", [])), 0)
        data = res.data["results"]
        self.assertTrue(
            any(row["action"] == "config.update" for row in data),
            "El endpoint debe exponer los registros reales",
        )

    def test_register_is_audited(self):
        c = APIClient()
        res = c.post(
            "/api/auth/register/",
            {
                "username": "nuevo_u",
                "email": "nuevo@intesud.edu.ec",
                "password": "pass12345",
                "first_name": "Nuevo",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        audit = AuditLog.objects.filter(action="user.registered").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.user.username, "nuevo_u")