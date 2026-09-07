from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Sum
from .models import *
from .serializers import *


class LoginSerializer(TokenObtainPairSerializer):
    username_field = 'email'


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'El token refresh es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({'detail': 'El token refresh no es válido.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated()]

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['patch'])
    def confirmar_listos(self, request):
        updated = Pedido.objects.filter(estado_pedido='ready').update(estado_pedido='delivered')
        return Response({'updated': updated}, status=status.HTTP_200_OK)

class MovimientoStockViewSet(viewsets.ModelViewSet):
    queryset = MovimientoStock.objects.all()
    serializer_class = MovimientoStockSerializer
    permission_classes = [IsAuthenticated]

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]

class ConfiguracionCafeteriaViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionCafeteria.objects.all()
    serializer_class = ConfiguracionCafeteriaSerializer
    permission_classes = [IsAuthenticated]

class PerfilAdminViewSet(viewsets.ModelViewSet):
    queryset = PerfilAdmin.objects.all()
    serializer_class = PerfilAdminSerializer
    permission_classes = [IsAuthenticated]

class PagosResumenView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        resumen = {}
        pedidos = Pedido.objects.all()
        for p in pedidos:
            metodo = p.metodo_pago
            resumen[metodo] = resumen.get(metodo, 0) + float(p.total)
        return Response(resumen)

class VentasResumenView(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

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
