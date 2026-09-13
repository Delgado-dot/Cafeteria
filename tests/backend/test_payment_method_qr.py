"""
Tests del campo qr_image del método de pago (imagen QR configurable).
"""

import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import RolePermission
from apps.config.models import PaymentMethod

User = get_user_model()


def seed_permissions():
    for role in ("adminbar", "user"):
        for code in ("payments.view_all", "payments.create"):
            RolePermission.objects.update_or_create(
                role=role, code=code, defaults={"enabled": True}
            )


class PaymentMethodQrImageTests(TestCase):
    """El administrador sube una imagen QR y se expone por la API al comprador."""

    def setUp(self):
        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-payqr-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)
        seed_permissions()
        self.adminbar = User.objects.create_user(
            username="barqr",
            email="barqr@intesud.edu.ec",
            password="testpass123",
            role="adminbar",
        )
        self.buyer = User.objects.create_user(
            username="buyerqr",
            email="buyerqr@intesud.edu.ec",
            password="testpass123",
            role="user",
        )
        self.method = PaymentMethod.objects.create(
            code="deuna-test",
            name="DEUNA test",
            qr_info="DEUNA-TEST-2026-001",
            active=True,
        )
        self.admin = APIClient()
        self.admin.force_authenticate(self.adminbar)
        self.user = APIClient()
        self.user.force_authenticate(self.buyer)

    def png_upload(self, name="deuna_qr.png", size=(300, 300)):
        buf = io.BytesIO()
        Image.new("RGB", size, (20, 40, 80)).save(buf, format="PNG")
        return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")

    def test_admin_can_upload_qr_image(self):
        res = self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {
                "instructions": "Escanea el QR DEUNA",
                "qr_image": self.png_upload(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn("qr_image", res.data)
        self.assertIn("qr_image_url", res.data)
        url = res.data["qr_image_url"]
        self.assertTrue(url.startswith("http://testserver/media/payment_qr/"), url)
        self.assertTrue(url.endswith("/deuna_qr.png"), url)

        self.method.refresh_from_db()
        self.assertIsNotNone(self.method.qr_image)
        self.assertTrue(self.method.qr_image.name.startswith("payment_qr/"))
        self.assertTrue(self.method.qr_image.storage.exists(self.method.qr_image.name))

    def test_qr_image_persists_and_appears_for_buyer(self):
        self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"qr_image": self.png_upload()},
            format="multipart",
        )
        self.method.refresh_from_db()

        detail = self.admin.get(f"/api/payments/methods/{self.method.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(
            detail.data["qr_image_url"].startswith("http://testserver/media/payment_qr/")
        )

        methods = self.user.get("/api/payments/methods/")
        self.assertEqual(methods.status_code, 200)
        rows = methods.data["results"] if isinstance(methods.data, dict) else methods.data
        deuna = next(x for x in rows if x["code"] == "deuna-test")
        self.assertEqual(deuna["name"], "DEUNA test")
        self.assertEqual(deuna["qr_info"], "DEUNA-TEST-2026-001")
        self.assertEqual(deuna["qr_image_url"], detail.data["qr_image_url"])
        self.assertTrue(deuna["qr_image_url"].startswith("http://testserver/media/payment_qr/"))

    def test_without_image_qr_image_url_is_null_and_flow_works(self):
        res = self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"instructions": "Solo texto, sin QR"},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNone(res.data["qr_image_url"])

        methods = self.user.get("/api/payments/methods/")
        rows = methods.data["results"] if isinstance(methods.data, dict) else methods.data
        deuna = next(x for x in rows if x["code"] == "deuna-test")
        self.assertIsNone(deuna["qr_image_url"])

    def test_rejects_non_image_and_oversized_files(self):
        txt = SimpleUploadedFile("qr.txt", b"contenido", content_type="text/plain")
        res = self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"qr_image": txt},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("qr_image", res.data)

        big = SimpleUploadedFile(
            "big.png",
            b"\x00" * (2 * 1024 * 1024 + 1),
            content_type="image/png",
        )
        res = self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"qr_image": big},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("qr_image", res.data)

    def test_previous_image_kept_when_not_replaced(self):
        self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"qr_image": self.png_upload()},
            format="multipart",
        )
        self.method.refresh_from_db()
        original = self.method.qr_image.name

        res = self.admin.patch(
            f"/api/payments/methods/{self.method.pk}/",
            {"instructions": "Instrucciones nuevas"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.method.refresh_from_db()
        self.assertEqual(self.method.qr_image.name, original)