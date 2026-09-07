from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'Usuario'),
        ('adminbar', 'Administradora Bar'),
        ('admindev', 'Administrador Desarrollador'),
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    cargo = models.CharField(max_length=100, blank=True)
    aula = models.CharField(max_length=50, blank=True)
    active = models.BooleanField(default=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        swappable = 'AUTH_USER_MODEL'

    def __str__(self):
        return self.email

class Producto(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=100)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=3)
    tiempo_preparacion = models.IntegerField(default=5)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    disponible = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class Pedido(models.Model):
    numero = models.CharField(max_length=50, unique=True)
    usuario_nombre = models.CharField(max_length=200)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=50)
    estado_pago = models.CharField(max_length=50)
    estado_pedido = models.CharField(max_length=50)
    fecha = models.DateTimeField(auto_now_add=True)
    piso = models.CharField(max_length=50, blank=True, null=True)
    aula = models.CharField(max_length=50, blank=True, null=True)
    comprobante = models.ImageField(upload_to='comprobantes/', blank=True, null=True)

    def __str__(self):
        return self.numero

class ItemPedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField()

class MovimientoStock(models.Model):
    TIPO_CHOICES = [('entrada', 'Entrada'), ('salida', 'Salida')]
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

class Proveedor(models.Model):
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class ConfiguracionCafeteria(models.Model):
    horario_apertura = models.CharField(max_length=10, default='09:00')
    horario_cierre = models.CharField(max_length=10, default='09:45')
    horario_receso_inicio = models.CharField(max_length=10, default='10:00')
    horario_receso_fin = models.CharField(max_length=10, default='10:15')
    capacidad = models.IntegerField(default=10)
    estado_abierto = models.BooleanField(default=True)
    delivery_habilitado = models.BooleanField(default=True)
    pisos_habilitados = models.TextField(default='1,2,3')
    zonas = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Configuracion Cafeteria"

class PerfilAdmin(models.Model):
    nombre_mostrar = models.CharField(max_length=200)
    foto = models.ImageField(upload_to='perfil/', blank=True, null=True)

    def __str__(self):
        return self.nombre_mostrar
