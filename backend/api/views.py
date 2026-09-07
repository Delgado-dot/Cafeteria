from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from .models import *
from .serializers import *
import cloudinary.uploader

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
