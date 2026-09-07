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
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/me/', me_view, name='me'),
    path('auth/register/', register_view, name='register'),
    path('auth/change-password/', change_password_view, name='change_password'),
    # Upload endpoints
    path('upload/image/', upload_image, name='upload_image'),
    path('upload/avatar/', upload_avatar, name='upload_avatar'),
    path('upload/comprobante/<str:pedido_id>/', upload_comprobante, name='upload_comprobante'),
]
