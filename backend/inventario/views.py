import logging
from smtplib import SMTPException

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.models import update_last_login
from django.db.models import DecimalField, ExpressionWrapper, F, Q, Sum
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import (
    SAFE_METHODS,
    AllowAny,
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response

from .models import (
    Categoria,
    MensajeAyuda,
    Movimiento,
    PerfilUsuario,
    Producto,
    SolicitudAyuda,
    Venta,
)
from .serializers import (
    CategoriaSerializer,
    MensajeAyudaSerializer,
    MovimientoSerializer,
    ProductoSerializer,
    SolicitudAyudaSerializer,
    UserCreateSerializer,
    VentaSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def is_inventory_admin(user):
    if not user or not user.is_authenticated:
        return False
    try:
        return user.is_staff or user.perfil_inventario.rol == "Administrador"
    except PerfilUsuario.DoesNotExist:
        return user.is_staff


class AdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_inventory_admin(request.user)


def user_payload(user):
    try:
        role = user.perfil_inventario.rol
    except PerfilUsuario.DoesNotExist:
        role = "Administrador" if user.is_staff else "Empleado"
    return {
        "id": user.id,
        "nombre": user.get_full_name() or user.username,
        "email": user.email,
        "rol": role,
        "is_staff": user.is_staff,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok", "service": "MAGNUSSIG SIG API"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = str(request.data.get("email", "")).strip().lower()
    password = request.data.get("password", "")
    user_obj = User.objects.filter(email__iexact=email, is_active=True).first()
    user = authenticate(
        request,
        username=user_obj.username if user_obj else email,
        password=password,
    )
    if not user:
        return Response(
            {"detail": "Correo o contraseña incorrectos."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token, _ = Token.objects.get_or_create(user=user)
    update_last_login(None, user)
    return Response({"token": token.key, "user": user_payload(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = UserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(user_payload(user), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_view(request):
    email = str(request.data.get("email", "")).strip()
    form = PasswordResetForm({"email": email})
    if not form.is_valid():
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        form.save(
            request=request,
            use_https=request.is_secure(),
            email_template_name="registration/password_reset_email.html",
        )
    except (SMTPException, OSError, ValueError):
        logger.exception("No se pudo enviar el correo de recuperación de contraseña.")
        return Response(
            {
                "detail": (
                    "No se pudo enviar el correo de recuperación. Configura SMTP "
                    "en backend/.env y vuelve a intentarlo."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(
        {
            "detail": (
                "Si el correo está registrado, recibirás instrucciones. "
                "Si no llega, verifica la configuración SMTP del backend."
            )
        }
    )


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated, AdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombre", "descripcion"]
    ordering_fields = ["nombre", "creado"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_inventory_admin(self.request.user):
            queryset = queryset.filter(activa=True)
        return queryset

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.productos.exists():
            category.activa = False
            category.save(update_fields=["activa"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        return super().destroy(request, *args, **kwargs)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related("categoria").all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, AdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nombre", "descripcion", "categoria__nombre"]
    ordering_fields = ["nombre", "stock", "precio", "creado"]

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        self.perform_destroy(product)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        queryset = super().get_queryset()
        stock_state = self.request.query_params.get("estado_stock")
        if stock_state == "agotado":
            queryset = queryset.filter(stock=0)
        elif stock_state == "bajo":
            queryset = queryset.filter(stock__gt=0, stock__lte=F("stock_minimo"))
        elif stock_state == "disponible":
            queryset = queryset.filter(stock__gt=F("stock_minimo"))
        return queryset


class MovimientoViewSet(viewsets.GenericViewSet):
    queryset = Movimiento.objects.select_related("producto", "usuario").all()
    serializer_class = MovimientoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "referencia",
        "producto__nombre",
        "producto_nombre_historico",
        "observacion",
    ]
    ordering_fields = ["fecha", "creado", "tipo"]

    def get_queryset(self):
        queryset = super().get_queryset()
        movement_type = self.request.query_params.get("tipo")
        if movement_type in {"entrada", "salida", "ajuste"}:
            queryset = queryset.filter(tipo=movement_type)
        return queryset

    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        instance = self.get_object()
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["post"], url_path="registrar")
    def registrar(self, request):
        if request.data.get("tipo") == "ajuste" and not is_inventory_admin(request.user):
            return Response(
                {"detail": "Solo un administrador puede realizar ajustes de stock."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MovimientoSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        movement = serializer.save()
        return Response(
            MovimientoSerializer(movement, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class VentaViewSet(viewsets.GenericViewSet):
    queryset = Venta.objects.select_related("vendedor").prefetch_related(
        "detalles__producto__categoria"
    )
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_inventory_admin(self.request.user):
            queryset = queryset.filter(vendedor=self.request.user)
        return queryset

    def list(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        instance = self.get_object()
        return Response(self.get_serializer(instance).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        return Response(
            self.get_serializer(sale).data,
            status=status.HTTP_201_CREATED,
        )


class SolicitudAyudaViewSet(viewsets.GenericViewSet):
    queryset = SolicitudAyuda.objects.select_related("usuario").prefetch_related(
        "mensajes__remitente"
    )
    serializer_class = SolicitudAyudaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not is_inventory_admin(self.request.user):
            queryset = queryset.filter(usuario=self.request.user)
        return queryset

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        return Response(
            self.get_serializer(ticket).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="mensajes")
    def mensajes(self, request, pk=None):
        ticket = self.get_object()
        if ticket.estado == "cerrada":
            return Response(
                {"detail": "Esta conversación está cerrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = MensajeAyudaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(
            solicitud=ticket,
            remitente=request.user,
        )
        ticket.estado = "respondida" if is_inventory_admin(request.user) else "abierta"
        ticket.save(update_fields=["estado", "actualizado"])
        return Response(
            MensajeAyudaSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="cerrar")
    def cerrar(self, request, pk=None):
        if not is_inventory_admin(request.user):
            return Response(
                {"detail": "Solo un administrador puede cerrar conversaciones."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ticket = self.get_object()
        ticket.estado = "cerrada"
        ticket.save(update_fields=["estado", "actualizado"])
        return Response(self.get_serializer(ticket).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(_request):
    products = Producto.objects.filter(estado="activo")
    movements = Movimiento.objects.filter(
        fecha__gte=timezone.localdate() - timezone.timedelta(days=6)
    )
    return Response(
        {
            "total_productos": products.count(),
            "unidades": products.aggregate(total=Sum("stock"))["total"] or 0,
            "stock_bajo": products.filter(
                stock__gt=0, stock__lte=F("stock_minimo")
            ).count(),
            "agotados": products.filter(stock=0).count(),
            "valor_inventario": products.aggregate(
                total=Sum(
                    ExpressionWrapper(
                        F("precio") * F("stock"),
                        output_field=DecimalField(max_digits=20, decimal_places=2),
                    )
                )
            )["total"]
            or 0,
            "movimientos_hoy": movements.count(),
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def users_view(request):
    if not is_inventory_admin(request.user):
        return Response(
            {"detail": "Solo un administrador puede gestionar usuarios."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == "POST":
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(user_payload(user), status=status.HTTP_201_CREATED)

    users = User.objects.all().order_by("first_name", "username")
    return Response(
        [
            {
                "id": user.id,
                "nombre": user.get_full_name() or user.username,
                "email": user.email,
                "rol": (
                    user.perfil_inventario.rol
                    if hasattr(user, "perfil_inventario")
                    else "Administrador" if user.is_staff else "Empleado"
                ),
                "estado": "Activo" if user.is_active else "Inactivo",
                "creado": user.date_joined.date().isoformat(),
            }
            for user in users
        ]
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def user_detail_view(request, user_id):
    if not is_inventory_admin(request.user):
        return Response(
            {"detail": "Solo un administrador puede gestionar usuarios."},
            status=status.HTTP_403_FORBIDDEN,
        )
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        return Response(
            {"detail": "El usuario no existe."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if user.pk == request.user.pk:
        return Response(
            {"detail": "No puedes eliminar la cuenta con la que iniciaste sesión."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if is_inventory_admin(user) and not User.objects.filter(
        Q(is_staff=True) | Q(perfil_inventario__rol="Administrador")
    ).exclude(pk=user.pk).exists():
        return Response(
            {"detail": "No puedes eliminar la última cuenta administradora."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
