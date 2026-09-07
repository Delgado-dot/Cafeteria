from rest_framework import status
from rest_framework.test import APITestCase

from .models import Producto, Usuario


class AutenticacionYPedidosTests(APITestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            email='usuario@intesud.edu.ec', password='estudiante123'
        )
        self.producto_a = Producto.objects.create(
            nombre='Producto A', categoria='Bebidas', precio='1.50'
        )
        self.producto_b = Producto.objects.create(
            nombre='Producto B', categoria='Comidas', precio='2.00'
        )

    def login(self, password='estudiante123'):
        return self.client.post(
            '/api/auth/login/',
            {'email': self.usuario.email, 'password': password},
            format='json',
        )

    def test_login_exitoso_devuelve_access_y_refresh(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_con_credenciales_incorrectas_devuelve_401(self):
        response = self.login(password='clave-invalida')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_autoriza_la_creacion_de_pedidos(self):
        login_response = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.post('/api/pedidos/', self.pedido_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_crea_pedido_con_varios_items_y_cantidades(self):
        self.autenticar()

        response = self.client.post('/api/pedidos/', self.pedido_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['items']), 2)
        cantidades = {item['producto']: item['cantidad'] for item in response.data['items']}
        self.assertEqual(cantidades[self.producto_a.id], 2)
        self.assertEqual(cantidades[self.producto_b.id], 4)

    def test_consulta_pedido_con_items_y_productos_asociados(self):
        self.autenticar()
        creado = self.client.post('/api/pedidos/', self.pedido_payload(), format='json')

        response = self.client.get(f"/api/pedidos/{creado.data['id']}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(item['producto'], item['cantidad']) for item in response.data['items']],
            [(self.producto_a.id, 2), (self.producto_b.id, 4)],
        )

    def autenticar(self):
        login_response = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

    def pedido_payload(self):
        return {
            'numero': 'PED-001',
            'usuario_nombre': 'Estudiante Demo',
            'total': '11.00',
            'metodo_pago': 'efectivo',
            'estado_pago': 'pendiente',
            'estado_pedido': 'pendiente',
            'items': [
                {'producto': self.producto_a.id, 'cantidad': 2},
                {'producto': self.producto_b.id, 'cantidad': 4},
            ],
        }
