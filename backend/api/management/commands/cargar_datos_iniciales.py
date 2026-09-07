from django.core.management.base import BaseCommand
from api.models import Producto

DEFAULT_PRODUCTS = [
  {'nombre': 'Hamburguesa Clásica', 'categoria': 'Hamburguesas', 'precio': 3.50, 'stock': 10, 'minStock': 3, 'prepMin': 8, 'descripcion': 'Pan, carne, queso, lechuga, tomate y salsas.'},
  {'nombre': 'Hamburguesa Especial', 'categoria': 'Hamburguesas', 'precio': 4.50, 'stock': 8, 'minStock': 3, 'prepMin': 10, 'descripcion': 'Doble carne, tocineta, queso derretido.'},
  {'nombre': 'Hamburguesa de Pollo', 'categoria': 'Hamburguesas', 'precio': 4.00, 'stock': 6, 'minStock': 2, 'prepMin': 9, 'descripcion': 'Pechuga de pollo empanizada.'},
  {'nombre': 'Hot Dog Clásico', 'categoria': 'Hot Dogs', 'precio': 2.00, 'stock': 12, 'minStock': 4, 'prepMin': 4, 'descripcion': 'Salchicha, pan, cebolla, papitas.'},
  {'nombre': 'Hot Dog Especial', 'categoria': 'Hot Dogs', 'precio': 2.75, 'stock': 5, 'minStock': 2, 'prepMin': 6, 'descripcion': 'Con tocineta, queso y salsas.'},
  {'nombre': 'Sándwich de Jamón y Queso', 'categoria': 'Sándwiches', 'precio': 2.50, 'stock': 9, 'minStock': 3, 'prepMin': 5, 'descripcion': 'Pan, jamón, queso, lechuga y tomate.'},
  {'nombre': 'Sándwich Mixto', 'categoria': 'Sándwiches', 'precio': 2.80, 'stock': 0, 'minStock': 2, 'prepMin': 6, 'descripcion': 'Jamón, quesillo y huevo.'},
  {'nombre': 'Salchipapa Pequeña', 'categoria': 'Papas y Salchipapas', 'precio': 2.50, 'stock': 10, 'minStock': 3, 'prepMin': 7, 'descripcion': 'Papas fritas con salchicha.'},
  {'nombre': 'Salchipapa Grande', 'categoria': 'Papas y Salchipapas', 'precio': 3.50, 'stock': 7, 'minStock': 2, 'prepMin': 9, 'descripcion': 'Porción grande para compartir.'},
  {'nombre': 'Papas Fritas', 'categoria': 'Papas y Salchipapas', 'precio': 1.75, 'stock': 4, 'minStock': 3, 'prepMin': 5, 'descripcion': 'Porción de papas fritas.'},
  {'nombre': 'Jugo Natural', 'categoria': 'Bebidas', 'precio': 1.50, 'stock': 15, 'minStock': 5, 'prepMin': 2, 'descripcion': 'Naranja, mora, piña o maracuyá.'},
  {'nombre': 'Gaseosa 350ml', 'categoria': 'Bebidas', 'precio': 1.00, 'stock': 20, 'minStock': 6, 'prepMin': 1, 'descripcion': 'Bebida gaseosa fría.'},
  {'nombre': 'Agua 600ml', 'categoria': 'Bebidas', 'precio': 0.80, 'stock': 2, 'minStock': 5, 'prepMin': 1, 'descripcion': 'Agua natural.'},
  {'nombre': 'Café', 'categoria': 'Bebidas', 'precio': 1.20, 'stock': 25, 'minStock': 8, 'prepMin': 2, 'descripcion': 'Café americano o con leche.'},
  {'nombre': 'Chocolate Caliente', 'categoria': 'Bebidas', 'precio': 1.40, 'stock': 12, 'minStock': 4, 'prepMin': 3, 'descripcion': 'Bebida caliente de chocolate.'},
  {'nombre': 'Nachos con Queso', 'categoria': 'Snacks', 'precio': 2.20, 'stock': 8, 'minStock': 3, 'prepMin': 6, 'descripcion': 'Totopos con queso derretido.'},
  {'nombre': 'Galletas', 'categoria': 'Snacks', 'precio': 0.75, 'stock': 30, 'minStock': 10, 'prepMin': 1, 'descripcion': 'Paquete de galletas surtidas.'},
  {'nombre': 'Empanada', 'categoria': 'Snacks', 'precio': 1.25, 'stock': 0, 'minStock': 5, 'prepMin': 4, 'descripcion': 'Empanada de carne o queso.'},
]

class Command(BaseCommand):
    help = 'Carga productos iniciales'

    def handle(self, *args, **options):
        for p in DEFAULT_PRODUCTS:
            Producto.objects.update_or_create(
                nombre=p['nombre'],
                defaults={
                    'categoria': p['categoria'],
                    'precio': p['precio'],
                    'stock': p['stock'],
                    'stock_minimo': p['minStock'],
                    'tiempo_preparacion': p['prepMin'],
                    'descripcion': p['descripcion']
                }
            )
        self.stdout.write(self.style.SUCCESS('Productos cargados correctamente'))
