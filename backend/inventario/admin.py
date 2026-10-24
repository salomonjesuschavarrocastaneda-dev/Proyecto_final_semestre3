from django.contrib import admin
from .models import (
    Categoria,
    DetalleVenta,
    MensajeAyuda,
    Movimiento,
    PerfilUsuario,
    Producto,
    SolicitudAyuda,
    Venta,
)
@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin): list_display=("id","nombre","activa","creado"); search_fields=("nombre",)
@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin): list_display=("codigo","nombre","categoria","unidad_medida","fecha_caducidad","precio","stock","stock_minimo","estado"); list_filter=("estado","categoria","unidad_medida"); search_fields=("codigo","nombre","lote","proveedor")
@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin): list_display=("referencia","fecha","producto","tipo","cantidad","stock_anterior","stock_nuevo","usuario"); list_filter=("tipo","fecha"); search_fields=("referencia","producto__nombre")
@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin): list_display=("usuario","rol"); list_filter=("rol",)

class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 0

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ("referencia", "fecha", "cliente", "forma_pago", "vendedor", "total")
    list_filter = ("forma_pago", "fecha")
    search_fields = ("referencia", "cliente", "vendedor__username")
    inlines = (DetalleVentaInline,)
    readonly_fields = ("referencia", "fecha", "total")

class MensajeAyudaInline(admin.TabularInline):
    model = MensajeAyuda
    extra = 0
    readonly_fields = ("remitente", "contenido", "creado")

@admin.register(SolicitudAyuda)
class SolicitudAyudaAdmin(admin.ModelAdmin):
    list_display = ("asunto", "usuario", "estado", "creado", "actualizado")
    list_filter = ("estado",)
    search_fields = ("asunto", "usuario__username", "usuario__email")
    inlines = (MensajeAyudaInline,)
