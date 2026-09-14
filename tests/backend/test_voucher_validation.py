"""
Pruebas de la validación backend del comprobante de pago (voucher).

El pedido usa un metodo con requires_voucher=True y envía el comprobante por
multipart a /api/orders/. La validación (tamaño <= 2 MB y formato PNG/JPG/PDF
por contenido real, no solo por extensión) vive en OrderCreateSerializer.
"""

import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings

from rest_framework.test import APIClient

from apps.config.models import CafeConfig, PaymentMethod
from apps.orders.models import Order
from apps.products.models import Category, Product

User = get_user_model()

PNG_HEADER = b"\x89PNG\r\n\x1a\n"
JPEG_HEADER = b"\xff\xd8\xff\xe0"
PDF_HEADER = b"%PDF-1.4\n"
TWO_MB = 2 * 1024 * 1024


def open_cafe_all_day(capacity=100):
    """Abre la cafeteria 24/7 para que el checkout no se bloquee por horario."""
    cfg = CafeConfig.get_solo()
    cfg.is_open = True
    cfg.order_open_time = "00:00"
    cfg.order_close_time = "23:59"
    cfg.break_start = "00:00"
    cfg.break_end = "00:00"
    cfg.total_capacity = capacity
    cfg.current_capacity = 0
    cfg.save()
    return cfg


class VoucherValidationTests(TestCase):
    def setUp(self):
        open_cafe_all_day()
        self.media_root = tempfile.mkdtemp(prefix="cafeteria-test-voucher-")
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(shutil.rmtree, self.media_root, True)
        self.user = User.objects.create_user(
            username="voucherbuyer",
            email="voucher@intesud.edu.ec",
            password="testpass123",
        )
        self.category = Category.objects.create(name="Comida")
        self.product = Product.objects.create(
            category=self.category,
            name="Bagel",
            price="2.00",
            stock=10,
            prep_time=3,
        )
        self.payment = PaymentMethod.objects.create(
            code="transferencia-test",
            name="Transferencia test",
            requires_voucher=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def post_voucher(self, upload):
        return self.client.post(
            "/api/orders/",
            {
                "items": json.dumps(
                    [{"product_id": self.product.pk, "quantity": 1, "addons": []}]
                ),
                "delivery_method": "pickup",
                "payment_method": str(self.payment.pk),
                "voucher": upload,
            },
            format="multipart",
        )

    def test_png_under_2mb_aceptada(self):
        upload = SimpleUploadedFile(
            "comprobante.png",
            PNG_HEADER + b"datos-png",
            content_type="image/png",
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Order.objects.get(pk=response.data["id"]).payment.voucher)

    def test_jpg_under_2mb_aceptado(self):
        upload = SimpleUploadedFile(
            "comprobante.jpg",
            JPEG_HEADER + b"datos-jpg",
            content_type="image/jpeg",
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 201, response.data)

    def test_pdf_under_2mb_aceptado(self):
        upload = SimpleUploadedFile(
            "comprobante.pdf",
            PDF_HEADER + b"datos-pdf",
            content_type="application/pdf",
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 201, response.data)

    def test_voucher_mayor_a_2mb_rechazado(self):
        upload = SimpleUploadedFile(
            "comprobante.png",
            PNG_HEADER + b"\x00" * TWO_MB,
            content_type="image/png",
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("El comprobante no puede superar los 2 MB.", str(response.data))

    def test_formato_no_permitido_rechazado(self):
        upload = SimpleUploadedFile(
            "comprobante.txt", b"Hola", content_type="text/plain"
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Formato de comprobante no permitido. Use PNG, JPG, JPEG o PDF.",
            str(response.data),
        )

    def test_extension_duplicada_no_evade_la_validacion(self):
        """Aunque el nombre termine en .pdf, el contenido/MIME real es texto:
        la validacion lee bytes y content_type, no la extension."""
        upload = SimpleUploadedFile(
            "comprobante.pdf",
            b"contenido que no es pdf",
            content_type="text/plain",
        )
        response = self.post_voucher(upload)
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Formato de comprobante no permitido. Use PNG, JPG, JPEG o PDF.",
            str(response.data),
        )
        self.assertFalse(Order.objects.exists())