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
    path('auth/verify/', verify_token, name='verify_token'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/me/', me_view, name='me'),
    path('auth/me/', me_view, name='me'),  # duplicate for compatibility
    path('auth/register/', register_view, name='register'),
    path('auth/change-password/', change_password_view, name='change_password'),
    path('auth/users/', user_list, name='user_list'),
    path('auth/permissions/', permissions_bulk, name='permissions_bulk'),
    path('auth/permissions/bulk/', permissions_bulk, name='permissions_bulk_post'),
    # Product endpoints
    path('products/categories/', product_categories, name='product_categories'),
    # Order endpoints
    path('orders/mine/', my_orders, name='my_orders'),
    path('orders/all/', all_orders, name='all_orders'),
    # Payment endpoints
    path('payments/methods/', payment_methods, name='payment_methods'),
    path('payments/methods/admin/', payment_methods_admin, name='payment_methods_admin'),
    path('payments/mine/', my_payments, name='my_payments'),
    path('payments/all/', all_payments, name='all_payments'),
    path('payments/<str:payment_id>/review/', review_payment, name='review_payment'),
    # Delivery endpoints
    path('delivery/requests/', delivery_requests, name='delivery_requests'),
    path('delivery/config/', delivery_config, name='delivery_config'),
    # Config endpoints
    path('config/current/', current_config, name='current_config'),
    # Audit endpoints
    path('audit/', audit_logs, name='audit_logs'),
    # Supplier endpoints
    path('suppliers/', supplier_list, name='supplier_list'),
    # Stock endpoints
    path('stock/movements/', stock_movements, name='stock_movements'),
    # Upload endpoints
    path('upload/image/', upload_image, name='upload_image'),
    path('upload/avatar/', upload_avatar, name='upload_avatar'),
    path('upload/comprobante/<str:pedido_id>/', upload_comprobante, name='upload_comprobante'),
]
