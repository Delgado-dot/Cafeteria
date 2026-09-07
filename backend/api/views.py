from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import *
from .serializers import *

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
