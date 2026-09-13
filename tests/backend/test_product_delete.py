"""
Tests del alta/baja de productos y el manejo controlado de ProtectedError (BUG-002).

Cubre:
- DELETE de un producto sin relaciones protegidas -> 204.
- DELETE de un producto con movimientos de inventario (FK PROTECT) -> 409, sin 500.
- DELETE de un producto con historial de pedidos (OrderItem.product = SET_NULL) -> 204, sin 500, historial conservado.
- Formato de respuesta controlada (detail).
- Los registros relacionados no se eliminan.
- Autorizacion: anonimo -> 401, rol sin permiso -> 403.
- Permisos conservados: adminbar puede borrar; admindev no tiene products.delete (disenado asi).
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.constants import DEFAULT_ROLE_PERMISSIONS
from apps.accounts.models import RolePermission
from apps.accounts.permissions import _clear_permissions_cache
from apps.orders.models import Order, OrderItem
from apps.products.models import Category, Product
from apps.stock.models import StockMovement, StockMovementType

User = get_user_model()

PROTECTED_DETAIL_MESSAGE = (
    "No se puede eliminar el producto porque tiene registros relacionados de "
    "stock, pedidos u otros movimientos."
)


def seed_permissions():
    """Siembra los permisos por rol por defecto e invalida la cache de permisos."""
    for role, codes in DEFAULT_ROLE_PERMISSIONS.items():
        for code in codes:
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )
    _clear_permissions_cache()


class ProductDeleteApiTests(TestCase):
    def setUp(self):
        seed_permissions()
        self.adminbar = User.objects.create_user(
            username="bar", email="bar@intesud.edu.ec", password="pass12345", role="adminbar"
        )
        self.admindev = User.objects.create_user(
            username="dev", email="dev@intesud.edu.ec", password="pass12345", role="admindev"
        )
        self.client_user = User.objects.create_user(
            username="usr", email="usr@intesud.edu.ec", password="pass12345", role="user"
        )
        self.category = Category.objects.create(name="Alimentos")
        self.product = Product.objects.create(
            category=self.category, name="Hamburguesa", price="2.50", stock=10, min_stock=2
        )

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def delete_product(self, client, pk):
        return client.delete(f"/api/products/{pk}/")

    # ---------- 1. DELETE sin relaciones protegidas ----------

    def test_delete_product_without_protected_relations_returns_204(self):
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 204, res.data)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    # ---------- 2. DELETE con movimientos de stock (FK PROTECT) -> 409, sin 500 ----------

    def test_delete_product_with_stock_movements_returns_409_not_500(self):
        self.product.adjust_stock(
            15, movement_type=StockMovementType.PURCHASE, reason="stock inicial"
        )
        self.assertEqual(StockMovement.objects.filter(product=self.product).count(), 1)
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertNotEqual(res.status_code, 500, res.data)
        self.assertEqual(res.status_code, 409, res.data)
        # El producto y sus movimientos siguen existiendo
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())
        self.assertEqual(StockMovement.objects.filter(product=self.product).count(), 1)

    # ---------- 3. DELETE con historial de pedidos (SET_NULL) -> sin 500 ----------

    def test_delete_product_with_order_history_returns_204_and_keeps_history(self):
        order = Order.objects.create(user=self.client_user, delivery_method="pickup")
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=2,
            unit_price="2.50",
        )
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertNotEqual(res.status_code, 500, res.data)
        self.assertEqual(res.status_code, 204, res.data)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())
        # El historial de pedidos no se pierde: queda el item con producto null
        items = OrderItem.objects.filter(order=order)
        self.assertEqual(items.count(), 1)
        self.assertIsNone(items.get().product_id)
        self.assertEqual(items.get().product_name, "Hamburguesa")

    # ---------- 4 y 5. Codigo HTTP esperado y formato de error (detail) ----------

    def test_protected_delete_returns_conflict_with_detail(self):
        self.product.adjust_stock(
            15, movement_type=StockMovementType.PURCHASE, reason="stock inicial"
        )
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 409, res.data)
        self.assertIn("detail", res.data)
        self.assertEqual(res.data["detail"], PROTECTED_DETAIL_MESSAGE)

    # ---------- 6. Los registros relacionados NO se eliminan ----------

    def test_protected_delete_does_not_remove_related_records(self):
        self.product.adjust_stock(
            15, movement_type=StockMovementType.PURCHASE, reason="stock inicial"
        )
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 409, res.data)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())
        self.assertEqual(StockMovement.objects.filter(product=self.product).count(), 1)
        self.assertEqual(Product.objects.count(), 1)

    # ---------- 7. Autorizacion: anonimo y rol sin permiso ----------

    def test_anonymous_delete_returns_401(self):
        res = APIClient().delete(f"/api/products/{self.product.pk}/")
        self.assertEqual(res.status_code, 401)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_client_role_without_permission_returns_403(self):
        client = self.client_for(self.client_user)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 403, res.data)
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    # ---------- 8. Permisos de adminbar/admindev no se rompen ----------

    def test_adminbar_can_delete_unprotected_product(self):
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 204, res.data)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    def test_adminbar_protected_delete_still_returns_409(self):
        self.product.adjust_stock(
            15, movement_type=StockMovementType.PURCHASE, reason="stock inicial"
        )
        client = self.client_for(self.adminbar)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 409, res.data)

    def test_admindev_without_product_delete_permission_returns_403_not_500(self):
        # Verificar que sin permiso se deniega con 403 y no rompe la API (no 500)
        # Deshabilitar temporalmente para probar el caso sin permiso
        perm, _ = RolePermission.objects.get_or_create(role="admindev", code="products.delete", defaults={"enabled": True})
        original = perm.enabled
        perm.enabled = False
        perm.save(update_fields=["enabled"])
        _clear_permissions_cache()
        try:
            client = self.client_for(self.admindev)
            res = self.delete_product(client, self.product.pk)
            self.assertNotEqual(res.status_code, 500, res.data)
            self.assertEqual(res.status_code, 403, res.data)
            self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())
        finally:
            perm.enabled = original
            perm.save(update_fields=["enabled"])
            _clear_permissions_cache()

    def test_admindev_con_acceso_total_puede_borrar_producto_no_protegido(self):
        # Con el acceso total (nueva semilla 0007), admindev sí puede borrar
        client = self.client_for(self.admindev)
        res = self.delete_product(client, self.product.pk)
        self.assertEqual(res.status_code, 204, res.data)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())
