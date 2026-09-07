from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'productos', ProductoViewSet)
router.register(r'pedidos', PedidoViewSet)
router.register(r'stock', MovimientoStockViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'configuracion', ConfiguracionCafeteriaViewSet)
router.register(r'perfil', PerfilAdminViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('pagos/resumen/', PagosResumenView.as_view({'get': 'list'})),
    path('ventas/resumen/', VentasResumenView.as_view({'get': 'list'})),
]
