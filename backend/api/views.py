from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from django.contrib.auth import get_user_model
from .models import *
from .serializers import *
import cloudinary.uploader

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'detail': 'Sesión cerrada correctamente'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': 'Error al cerrar sesión'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'name': user.get_full_name() or user.username,
        'role': user.role,
        'cargo': user.cargo,
        'aula': user.aula,
        'active': user.is_active,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Contraseña actual incorrecta'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Contraseña actualizada correctamente'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'role': user.role,
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer

    @action(detail=False, methods=['patch'])
    def confirmar_listos(self, request):
        updated = Pedido.objects.filter(estado_pedido='ready').update(estado_pedido='delivered')
        return Response({'updated': updated}, status=status.HTTP_200_OK)

class MovimientoStockViewSet(viewsets.ModelViewSet):
    queryset = MovimientoStock.objects.all()
    serializer_class = MovimientoStockSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

class ConfiguracionCafeteriaViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionCafeteria.objects.all()
    serializer_class = ConfiguracionCafeteriaSerializer

class PerfilAdminViewSet(viewsets.ModelViewSet):
    queryset = PerfilAdmin.objects.all()
    serializer_class = PerfilAdminSerializer

class PagosResumenView(viewsets.ViewSet):
    def list(self, request):
        resumen = {}
        pedidos = Pedido.objects.all()
        for p in pedidos:
            metodo = p.metodo_pago
            resumen[metodo] = resumen.get(metodo, 0) + float(p.total)
        return Response(resumen)

class VentasResumenView(viewsets.ViewSet):
    def list(self, request):
        from django.utils import timezone
        hoy = timezone.now().date()
        ventas_hoy = Pedido.objects.filter(fecha__date=hoy).aggregate(total=Sum('total'))['total'] or 0
        ventas_mes = Pedido.objects.filter(fecha__month=hoy.month).aggregate(total=Sum('total'))['total'] or 0
        ticket_promedio = Pedido.objects.aggregate(avg=Sum('total') / models.Count('id'))['avg'] or 0
        return Response({
            'ventas_hoy': ventas_hoy,
            'ventas_mes': ventas_mes,
            'ticket_promedio': ticket_promedio
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_image(request):
    """Subida genérica de imagen a Cloudinary"""
    image = request.FILES.get('image')
    folder = request.data.get('folder', 'uploads')
    
    if not image:
        return Response({'detail': 'No se envió imagen'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = cloudinary.uploader.upload(image, folder=folder)
        return Response({
            'url': result['secure_url'],
            'public_id': result['public_id'],
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': f'Error subiendo imagen: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """Subir avatar de usuario"""
    image = request.FILES.get('image')
    if not image:
        return Response({'detail': 'No se envió imagen'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = cloudinary.uploader.upload(image, folder='avatars')
        user = request.user
        user.avatar = result['secure_url']
        user.save()
        return Response({'avatar_url': result['secure_url']}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': f'Error subiendo avatar: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_comprobante(request, pedido_id):
    """Subir comprobante de pago para un pedido"""
    image = request.FILES.get('image')
    if not image:
        return Response({'detail': 'No se envió imagen'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = cloudinary.uploader.upload(image, folder='comprobantes')
        pedido = Pedido.objects.filter(numero=pedido_id).first()
        if not pedido:
            return Response({'detail': 'Pedido no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        pedido.comprobante = result['secure_url']
        pedido.save()
        return Response({'comprobante_url': result['secure_url']}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': f'Error subiendo comprobante: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== Missing endpoints for frontend compatibility =====

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    """Verificar validez del token JWT"""
    return Response({'valid': True, 'user': {
        'id': request.user.id,
        'email': request.user.email,
        'name': request.user.get_full_name() or request.user.username,
        'role': request.user.role,
    }})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Alias for /auth/me/ - frontend compatibility"""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'name': user.get_full_name() or user.username,
        'role': user.role,
        'cargo': getattr(user, 'cargo', ''),
        'aula': getattr(user, 'aula', ''),
        'active': user.is_active,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """Listar usuarios (admin)"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.all().values('id', 'email', 'first_name', 'last_name', 'role', 'cargo', 'aula', 'is_active', 'date_joined')
    return Response(list(users))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def permissions_bulk(request):
    """Permisos por rol (admindev)"""
    if request.user.role != 'admindev':
        return Response({'detail': 'Solo admindev'}, status=status.HTTP_403_FORBIDDEN)
    
    from apps.accounts.models import RolePermission
    from apps.accounts.constants import PERMISSIONS_CATALOG
    
    if request.method == 'GET':
        perms = RolePermission.objects.all().values('role', 'code', 'enabled')
        return Response(list(perms))
    
    # POST - bulk update
    data = request.data
    for item in data:
        RolePermission.objects.update_or_create(
            role=item['role'],
            code=item['code'],
            defaults={'enabled': item['enabled'], 'updated_by': request.user}
        )
    return Response({'detail': 'Permisos actualizados'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_categories(request):
    """Categorías de productos"""
    from apps.products.models import Producto
    cats = Producto.objects.values_list('categoria', flat=True).distinct()
    return Response(list(cats))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    """Pedidos del usuario actual"""
    from apps.orders.models import Order
    from apps.orders.serializers import OrderSerializer
    pedidos = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(pedidos, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_orders(request):
    """Todos los pedidos (admin)"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.orders.models import Order
    from apps.orders.serializers import OrderSerializer
    pedidos = Order.objects.all().order_by('-created_at')
    serializer = OrderSerializer(pedidos, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_methods(request):
    """Métodos de pago disponibles"""
    from apps.config.models import ConfiguracionCafeteria
    cfg = ConfiguracionCafeteria.objects.first()
    methods = []
    if cfg:
        if getattr(cfg, 'pago_efectivo_habilitado', True): methods.append({'code': 'efectivo', 'name': 'Efectivo'})
        if getattr(cfg, 'pago_transferencia_habilitado', True): methods.append({'code': 'transferencia', 'name': 'Transferencia'})
        if getattr(cfg, 'pago_deuna_habilitado', True): methods.append({'code': 'deuna', 'name': 'DEUNA'})
    return Response(methods)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_methods_admin(request):
    """Métodos de pago (admin)"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    return payment_methods(request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    """Pagos del usuario"""
    from apps.payments.models import Payment
    from apps.payments.serializers import PaymentSerializer
    pagos = Payment.objects.filter(order__user=request.user).order_by('-fecha')
    return Response(PaymentSerializer(pagos, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_payments(request):
    """Todos los pagos (admin)"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.payments.models import Payment
    from apps.payments.serializers import PaymentSerializer
    pagos = Payment.objects.all().order_by('-fecha')
    return Response(PaymentSerializer(pagos, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_payment(request, payment_id):
    """Revisar/actualizar estado de pago (adminbar)"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.payments.models import Payment
    from apps.payments.serializers import PaymentSerializer
    pago = Payment.objects.filter(id=payment_id).first()
    if not pago:
        return Response({'detail': 'Pago no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PaymentSerializer(pago, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delivery_requests(request):
    """Solicitudes de delivery"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.delivery.models import DeliveryRequest
    from apps.delivery.serializers import DeliveryRequestSerializer
    solicitudes = DeliveryRequest.objects.all().order_by('-fecha')
    return Response(DeliveryRequestSerializer(solicitudes, many=True).data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def delivery_config(request):
    """Configuración de delivery"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.delivery.models import DeliveryConfig
    from apps.delivery.serializers import DeliveryConfigSerializer
    config = DeliveryConfig.objects.first()
    if request.method == 'GET':
        if not config:
            return Response({'enabled': False})
        return Response(DeliveryConfigSerializer(config).data)
    serializer = DeliveryConfigSerializer(config, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_config(request):
    """Configuración actual de la cafetería"""
    from apps.config.models import ConfiguracionCafeteria
    from apps.config.serializers import ConfiguracionCafeteriaSerializer
    config = ConfiguracionCafeteria.objects.first()
    if not config:
        return Response({'detail': 'No hay configuración'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ConfiguracionCafeteriaSerializer(config).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    """Logs de auditoría"""
    if request.user.role != 'admindev':
        return Response({'detail': 'Solo admindev'}, status=status.HTTP_403_FORBIDDEN)
    from apps.audit.models import AuditLog
    logs = AuditLog.objects.all().order_by('-fecha')[:100]
    from apps.audit.serializers import AuditLogSerializer
    return Response(AuditLogSerializer(logs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supplier_list(request):
    """Lista de proveedores"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.suppliers.models import Proveedor
    from apps.suppliers.serializers import ProveedorSerializer
    return Response(ProveedorSerializer(Proveedor.objects.all(), many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_movements(request):
    """Movimientos de stock"""
    if request.user.role not in ['admindev', 'adminbar']:
        return Response({'detail': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)
    from apps.stock.models import MovimientoStock
    from apps.stock.serializers import MovimientoStockSerializer
    return Response(MovimientoStockSerializer(MovimientoStock.objects.all().order_by('-fecha'), many=True).data)
