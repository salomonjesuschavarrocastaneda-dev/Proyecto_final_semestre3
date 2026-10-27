from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator

class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    activa = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["nombre"]
        verbose_name_plural = "categorías"
    def __str__(self): return self.nombre

class Producto(models.Model):
    ESTADOS = [("activo", "Activo"), ("inactivo", "Inactivo")]
    UNIDADES_MEDIDA = [
        ("unidad", "Unidad"),
        ("par", "Par"),
        ("caja", "Caja"),
        ("paquete", "Paquete"),
        ("botella", "Botella"),
        ("litro", "Litro"),
        ("rollo", "Rollo"),
        ("kit", "Kit"),
        ("metro", "Metro"),
    ]
    codigo = models.CharField(max_length=40, unique=True)
    nombre = models.CharField(max_length=180)
    descripcion = models.TextField(blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos")
    precio = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    unidad_medida = models.CharField(max_length=12, choices=UNIDADES_MEDIDA, default="unidad")
    fecha_caducidad = models.DateField(null=True, blank=True)
    lote = models.CharField(max_length=80, blank=True)
    marca = models.CharField(max_length=100, blank=True)
    proveedor = models.CharField(max_length=150, blank=True)
    ubicacion = models.CharField(max_length=150, blank=True)
    normas = models.TextField(blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="activo")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    class Meta: ordering = ["nombre"]
    def __str__(self): return f"{self.codigo} — {self.nombre}"
    @property
    def estado_stock(self):
        if self.stock == 0: return "agotado"
        if self.stock <= self.stock_minimo: return "bajo"
        return "disponible"

class Movimiento(models.Model):
    TIPOS = [("entrada", "Entrada"), ("salida", "Salida"), ("ajuste", "Ajuste")]
    referencia = models.CharField(max_length=40, unique=True, blank=True)
    producto = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos",
    )
    producto_codigo_historico = models.CharField(max_length=40, blank=True, default="")
    producto_nombre_historico = models.CharField(max_length=180, blank=True, default="")
    tipo = models.CharField(max_length=10, choices=TIPOS)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    stock_anterior = models.PositiveIntegerField(default=0)
    stock_nuevo = models.PositiveIntegerField(default=0)
    fecha = models.DateField()
    observacion = models.CharField(max_length=500, blank=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="movimientos_inventario")
    creado = models.DateTimeField(auto_now_add=True)
    class Meta: ordering = ["-creado"]
    def __str__(self):
        nombre = self.producto.nombre if self.producto else self.producto_nombre_historico
        return f"{self.referencia} · {nombre}"


class Venta(models.Model):
    FORMAS_PAGO = [
        ("efectivo", "Efectivo"),
        ("transferencia", "Transferencia"),
        ("tarjeta", "Tarjeta"),
        ("credito", "Crédito"),
        ("otro", "Otro"),
    ]
    referencia = models.CharField(max_length=40, unique=True)
    cliente = models.CharField(max_length=180, blank=True)
    forma_pago = models.CharField(max_length=20, choices=FORMAS_PAGO)
    total = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ventas_inventario",
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.referencia} · {self.total}"


class DetalleVenta(models.Model):
    venta = models.ForeignKey(Venta, on_delete=models.CASCADE, related_name="detalles")
    producto = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="detalles_venta",
    )
    producto_codigo_historico = models.CharField(max_length=40, blank=True, default="")
    producto_nombre_historico = models.CharField(max_length=180, blank=True, default="")
    categoria_nombre_historica = models.CharField(max_length=100, blank=True, default="")
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(max_digits=14, decimal_places=2)

    @property
    def subtotal(self):
        return self.precio_unitario * self.cantidad


class SolicitudAyuda(models.Model):
    ESTADOS = [
        ("abierta", "Abierta"),
        ("respondida", "Respondida"),
        ("cerrada", "Cerrada"),
    ]
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="solicitudes_ayuda",
    )
    asunto = models.CharField(max_length=180)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="abierta")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actualizado"]
        verbose_name = "solicitud de ayuda"
        verbose_name_plural = "solicitudes de ayuda"

    def __str__(self):
        return f"{self.asunto} · {self.usuario}"


class MensajeAyuda(models.Model):
    solicitud = models.ForeignKey(
        SolicitudAyuda,
        on_delete=models.CASCADE,
        related_name="mensajes",
    )
    remitente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="mensajes_ayuda",
    )
    contenido = models.TextField(max_length=5000)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["creado"]


class PerfilUsuario(models.Model):
    ROLES = [("Administrador", "Administrador"), ("Empleado", "Empleado")]
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="perfil_inventario")
    rol = models.CharField(max_length=20, choices=ROLES, default="Empleado")
    def __str__(self): return f"{self.usuario.username} ({self.rol})"
