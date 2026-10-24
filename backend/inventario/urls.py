from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet,
    SolicitudAyudaViewSet,
    MovimientoViewSet,
    ProductoViewSet,
    VentaViewSet,
    dashboard_view,
    health,
    login_view,
    logout_view,
    password_reset_view,
    register_view,
    user_detail_view,
    users_view,
)
router = DefaultRouter()
router.register("productos", ProductoViewSet, basename="producto")
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("movimientos", MovimientoViewSet, basename="movimiento")
router.register("ventas", VentaViewSet, basename="venta")
router.register("ayuda", SolicitudAyudaViewSet, basename="solicitud-ayuda")
urlpatterns = [
    path("health/", health),
    path("auth/login/", login_view),
    path("auth/logout/", logout_view),
    path("auth/register/", register_view),
    path("auth/password-reset/", password_reset_view),
    path("dashboard/", dashboard_view),
    path("usuarios/", users_view),
    path("usuarios/<int:user_id>/", user_detail_view),
    path("", include(router.urls)),
]
