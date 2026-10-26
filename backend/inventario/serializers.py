from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers
import uuid

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

User = get_user_model()


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre", "descripcion", "activa", "creado"]


class ProductoSerializer(serializers.ModelSerializer):
    categoria = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all()
    )
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True)
    categoria_id = serializers.IntegerField(source="categoria.id", read_only=True)
    estado_stock = serializers.ReadOnlyField()

    class Meta:
        model = Producto
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "categoria",
            "categoria_id",
            "categoria_nombre",
            "precio",
            "stock",
            "stock_minimo",
            "unidad_medida",
            "fecha_caducidad",
            "lote",
            "marca",
            "proveedor",
            "ubicacion",
            "normas",
            "estado",
            "estado_stock",
            "creado",
            "actualizado",
        ]
        read_only_fields = ["id", "creado", "actualizado", "estado_stock", "categoria_id"]

    def validate_codigo(self, value):
        return value.strip().upper()

    def validate_categoria(self, value):
        if (
            not value.activa
            and (not self.instance or self.instance.categoria_id != value.pk)
        ):
            raise serializers.ValidationError(
                "Selecciona una categoría activa."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        initial_stock = validated_data.pop("stock", 0)
        product = Producto.objects.create(**validated_data, stock=initial_stock)
        if initial_stock:
            request = self.context.get("request")
            created_at = timezone.now()
            Movimiento.objects.create(
                referencia=f"MOV-{created_at:%Y%m%d%H%M%S%f}",
                producto=product,
                tipo="entrada",
                cantidad=initial_stock,
                stock_anterior=0,
                stock_nuevo=initial_stock,
                fecha=timezone.localdate(),
                observacion="Stock inicial al crear el producto.",
                usuario=(
                    request.user
                    if request and request.user.is_authenticated
                    else None
                ),
            )
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        product = Producto.objects.select_for_update().get(pk=instance.pk)
        previous_stock = product.stock
        new_stock = validated_data.pop("stock", previous_stock)

        for attribute, value in validated_data.items():
            setattr(product, attribute, value)
        product.stock = new_stock
        product.save()

        if new_stock != previous_stock:
            request = self.context.get("request")
            Movimiento.objects.create(
                referencia=f"MOV-{uuid.uuid4().hex[:32].upper()}",
                producto=product,
                tipo="ajuste",
                cantidad=abs(new_stock - previous_stock),
                stock_anterior=previous_stock,
                stock_nuevo=new_stock,
                fecha=timezone.localdate(),
                observacion=(
                    f"Ajuste de stock al editar el producto: "
                    f"{previous_stock} a {new_stock}."
                ),
                usuario=(
                    request.user
                    if request and request.user.is_authenticated
                    else None
                ),
            )
        return product


class MovimientoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    producto_id = serializers.IntegerField(source="producto.id", read_only=True)
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Movimiento
        fields = [
            "id",
            "referencia",
            "producto",
            "producto_id",
            "producto_nombre",
            "tipo",
            "cantidad",
            "stock_anterior",
            "stock_nuevo",
            "fecha",
            "observacion",
            "usuario",
            "usuario_nombre",
            "creado",
        ]
        read_only_fields = [
            "id",
            "referencia",
            "stock_anterior",
            "stock_nuevo",
            "usuario",
            "creado",
            "producto_id",
        ]

    def get_usuario_nombre(self, obj):
        return (
            obj.usuario.get_full_name() or obj.usuario.username
            if obj.usuario
            else "Sistema"
        )

    def validate_cantidad(self, value):
        if value < 1:
            raise serializers.ValidationError("La cantidad debe ser mayor que cero.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        producto_id = validated_data["producto"].pk
        tipo = validated_data["tipo"]
        cantidad = validated_data["cantidad"]
        if tipo == "entrada":
            Producto.objects.filter(pk=producto_id).update(
                stock=F("stock") + cantidad
            )
            producto = Producto.objects.get(pk=producto_id)
            nuevo = producto.stock
            anterior = nuevo - cantidad
        elif tipo == "salida":
            updated = Producto.objects.filter(
                pk=producto_id,
                stock__gte=cantidad,
            ).update(stock=F("stock") - cantidad)
            if not updated:
                disponible = Producto.objects.filter(pk=producto_id).values_list(
                    "stock", flat=True
                ).get()
                raise serializers.ValidationError(
                    {"cantidad": f"Stock insuficiente. Disponible: {disponible}."}
                )
            producto = Producto.objects.get(pk=producto_id)
            nuevo = producto.stock
            anterior = nuevo + cantidad
        else:
            producto = Producto.objects.get(pk=producto_id)
            anterior = producto.stock
            updated = Producto.objects.filter(
                pk=producto_id,
                stock=anterior,
            ).update(stock=cantidad)
            if not updated:
                raise serializers.ValidationError(
                    {"detail": "El stock cambió durante el ajuste. Intenta de nuevo."}
                )
            nuevo = cantidad
        Producto.objects.filter(pk=producto_id).update(actualizado=timezone.now())
        request = self.context.get("request")
        return Movimiento.objects.create(
            **validated_data,
            referencia=f"MOV-{timezone.now():%Y%m%d%H%M%S%f}",
            stock_anterior=anterior,
            stock_nuevo=nuevo,
            usuario=(
                request.user
                if request and request.user.is_authenticated
                else None
            ),
        )


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    producto_codigo = serializers.CharField(source="producto.codigo", read_only=True)
    categoria_nombre = serializers.CharField(
        source="producto.categoria.nombre",
        read_only=True,
    )
    subtotal = serializers.DecimalField(
        max_digits=16,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = DetalleVenta
        fields = [
            "id",
            "producto",
            "producto_nombre",
            "producto_codigo",
            "categoria_nombre",
            "cantidad",
            "precio_unitario",
            "subtotal",
        ]
        read_only_fields = ["precio_unitario", "subtotal"]


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)
    vendedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            "id",
            "referencia",
            "cliente",
            "forma_pago",
            "total",
            "vendedor",
            "vendedor_nombre",
            "fecha",
            "detalles",
        ]
        read_only_fields = ["id", "referencia", "total", "vendedor", "fecha"]

    def get_vendedor_nombre(self, obj):
        return (
            obj.vendedor.get_full_name() or obj.vendedor.username
            if obj.vendedor
            else "Usuario eliminado"
        )

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError("Agrega al menos un producto a la venta.")
        product_ids = [item["producto"].pk for item in value]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Cada producto debe aparecer una sola vez; ajusta su cantidad."
            )
        today = timezone.localdate()
        for item in value:
            product = item["producto"]
            if product.estado != "activo":
                raise serializers.ValidationError(
                    f"{product.nombre} está inactivo y no se puede vender."
                )
            if product.fecha_caducidad and product.fecha_caducidad < today:
                raise serializers.ValidationError(
                    f"{product.nombre} está vencido y no se puede vender."
                )
            if product.precio <= 0:
                raise serializers.ValidationError(
                    f"Registra un precio válido para {product.nombre} antes de venderlo."
                )
        return value

    @transaction.atomic
    def create(self, validated_data):
        detail_data = validated_data.pop("detalles")
        request = self.context["request"]
        reference = f"VEN-{timezone.now():%Y%m%d%H%M%S}-{uuid.uuid4().hex[:8].upper()}"
        sale = Venta.objects.create(
            **validated_data,
            referencia=reference,
            vendedor=request.user,
        )
        total = 0

        for item in detail_data:
            product = Producto.objects.select_for_update().get(
                pk=item["producto"].pk
            )
            quantity = item["cantidad"]
            stock_before = product.stock
            updated = Producto.objects.filter(
                pk=product.pk,
                stock__gte=quantity,
            ).update(stock=F("stock") - quantity, actualizado=timezone.now())
            if not updated:
                current_stock = Producto.objects.values_list("stock", flat=True).get(
                    pk=product.pk
                )
                raise serializers.ValidationError(
                    {
                        "detalles": (
                            f"Stock insuficiente para {product.nombre}. "
                            f"Disponible: {current_stock}."
                        )
                    }
                )

            line_total = product.precio * quantity
            total += line_total
            DetalleVenta.objects.create(
                venta=sale,
                producto=product,
                cantidad=quantity,
                precio_unitario=product.precio,
            )
            movement_reference = f"MOV-{uuid.uuid4().hex[:32].upper()}"
            Movimiento.objects.create(
                referencia=movement_reference,
                producto=product,
                tipo="salida",
                cantidad=quantity,
                stock_anterior=stock_before,
                stock_nuevo=stock_before - quantity,
                fecha=timezone.localdate(),
                observacion=f"Venta {sale.referencia}",
                usuario=request.user,
            )

        sale.total = total
        sale.save(update_fields=["total"])
        return sale


class MensajeAyudaSerializer(serializers.ModelSerializer):
    remitente_nombre = serializers.SerializerMethodField()
    es_admin = serializers.SerializerMethodField()

    class Meta:
        model = MensajeAyuda
        fields = ["id", "contenido", "remitente", "remitente_nombre", "es_admin", "creado"]
        read_only_fields = ["id", "remitente", "creado", "remitente_nombre", "es_admin"]

    def get_remitente_nombre(self, obj):
        if not obj.remitente:
            return "Usuario eliminado"
        return obj.remitente.get_full_name() or obj.remitente.username

    def get_es_admin(self, obj):
        return bool(obj.remitente and (
            obj.remitente.is_staff
            or getattr(
                getattr(obj.remitente, "perfil_inventario", None),
                "rol",
                None,
            ) == "Administrador"
        ))

    def validate_contenido(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Escribe un mensaje antes de enviarlo.")
        return value


class SolicitudAyudaSerializer(serializers.ModelSerializer):
    mensajes = MensajeAyudaSerializer(many=True, read_only=True)
    mensaje_inicial = serializers.CharField(write_only=True, max_length=5000)
    usuario_nombre = serializers.SerializerMethodField()
    usuario_email = serializers.EmailField(source="usuario.email", read_only=True)

    class Meta:
        model = SolicitudAyuda
        fields = [
            "id",
            "asunto",
            "estado",
            "usuario",
            "usuario_nombre",
            "usuario_email",
            "creado",
            "actualizado",
            "mensajes",
            "mensaje_inicial",
        ]
        read_only_fields = ["id", "estado", "usuario", "creado", "actualizado"]

    def get_usuario_nombre(self, obj):
        return obj.usuario.get_full_name() or obj.usuario.username

    def validate_asunto(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El asunto es obligatorio.")
        return value

    def validate_mensaje_inicial(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Escribe un mensaje para el administrador.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        initial_message = validated_data.pop("mensaje_inicial")
        ticket = SolicitudAyuda.objects.create(
            usuario=self.context["request"].user,
            **validated_data,
        )
        MensajeAyuda.objects.create(
            solicitud=ticket,
            remitente=self.context["request"].user,
            contenido=initial_message,
        )
        return ticket


class UserCreateSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    rol = serializers.ChoiceField(
        choices=PerfilUsuario.ROLES,
        default="Empleado",
    )

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con ese correo.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        candidate = User(username=attrs["email"].split("@")[0], email=attrs["email"])
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages}) from error
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        nombre = validated_data["nombre"].strip()
        base = validated_data["email"].split("@")[0]
        username = base
        index = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{index}"
            index += 1
        user = User.objects.create_user(
            username=username,
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=nombre,
            is_staff=validated_data["rol"] == "Administrador",
        )
        PerfilUsuario.objects.create(usuario=user, rol=validated_data["rol"])
        return user
