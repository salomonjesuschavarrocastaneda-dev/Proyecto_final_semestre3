from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Categoria, Movimiento, Producto, Venta

User = get_user_model()


class InventoryApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="employee",
            email="employee@example.test",
            password="UnitTestPassword!246",
        )
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.test",
            password="UnitTestPassword!246",
            is_staff=True,
        )
        self.client = APIClient()
        self.category = Categoria.objects.create(nombre="Prueba")
        self.product = Producto.objects.create(
            codigo="TEST-1",
            nombre="Producto de prueba",
            categoria=self.category,
            precio="1000.00",
            stock=10,
            stock_minimo=2,
        )

    def authenticate(self, user=None):
        token, _ = Token.objects.get_or_create(user=user or self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        return token

    def test_protected_endpoints_reject_anonymous_requests(self):
        for path in (
            "/api/productos/",
            "/api/categorias/",
            "/api/movimientos/",
            "/api/dashboard/",
            "/api/usuarios/",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)

    def test_employee_can_read_inventory_and_register_stock_movements(self):
        self.authenticate()
        for path in (
            "/api/productos/",
            "/api/categorias/",
            "/api/movimientos/",
            "/api/dashboard/",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

        response = self.client.post(
            "/api/movimientos/registrar/",
            {
                "producto": self.product.id,
                "tipo": "entrada",
                "cantidad": 1,
                "fecha": date.today().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_employee_cannot_manage_catalog_or_users(self):
        self.authenticate()
        product_data = {
            "codigo": "NEW-1",
            "nombre": "Nuevo",
            "categoria": self.category.id,
            "precio": "10.00",
        }
        self.assertEqual(
            self.client.post("/api/productos/", product_data, format="json").status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/categorias/",
                {"nombre": "Nueva"},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)
        self.assertEqual(
            self.client.post("/api/usuarios/", {}, format="json").status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/movimientos/registrar/",
                {
                    "producto": self.product.id,
                    "tipo": "ajuste",
                    "cantidad": 2,
                    "fecha": date.today().isoformat(),
                },
                format="json",
            ).status_code,
            403,
        )

    def test_admin_creates_and_deletes_users_with_selected_role(self):
        self.authenticate(self.admin)
        response = self.client.post(
            "/api/usuarios/",
            {
                "nombre": "Nuevo usuario",
                "email": "new@example.test",
                "password": "AnotherUnitTestPassword!246",
                "password_confirm": "AnotherUnitTestPassword!246",
                "rol": "Empleado",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="new@example.test")
        self.assertTrue(user.check_password("AnotherUnitTestPassword!246"))
        self.assertEqual(user.perfil_inventario.rol, "Empleado")
        token = Token.objects.create(user=user)

        response = self.client.delete(f"/api/usuarios/{user.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=user.pk).exists())
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_admin_can_assign_administrator_role(self):
        self.authenticate(self.admin)
        response = self.client.post(
            "/api/usuarios/",
            {
                "nombre": "Otro administrador",
                "email": "another-admin@example.test",
                "password": "AnotherUnitTestPassword!246",
                "password_confirm": "AnotherUnitTestPassword!246",
                "rol": "Administrador",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="another-admin@example.test")
        self.assertTrue(user.is_staff)
        self.assertEqual(user.perfil_inventario.rol, "Administrador")

    def test_admin_cannot_delete_own_account(self):
        self.authenticate(self.admin)
        response = self.client.delete(f"/api/usuarios/{self.admin.id}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

    def test_public_registration_is_disabled(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "nombre": "Registro público",
                "email": "public@example.test",
                "password": "AnotherUnitTestPassword!246",
                "password_confirm": "AnotherUnitTestPassword!246",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertFalse(User.objects.filter(email="public@example.test").exists())

    def test_admin_creates_product_with_inventory_details(self):
        self.authenticate(self.admin)
        response = self.client.post(
            "/api/productos/",
            {
                "codigo": "CHEM-001",
                "nombre": "Alcohol",
                "categoria": self.category.id,
                "precio": "15000.00",
                "stock": 4,
                "stock_minimo": 1,
                "unidad_medida": "botella",
                "fecha_caducidad": "2027-05-01",
                "lote": "A-42",
                "marca": "Marca de prueba",
                "proveedor": "Proveedor de prueba",
                "ubicacion": "Bodega A",
                "normas": "Información declarada por el proveedor",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        product = Producto.objects.get(codigo="CHEM-001")
        self.assertEqual(product.fecha_caducidad.isoformat(), "2027-05-01")
        self.assertEqual(product.unidad_medida, "botella")
        self.assertEqual(product.lote, "A-42")
        self.assertEqual(response.data["categoria_nombre"], "Prueba")
        initial_movement = Movimiento.objects.get(producto=product)
        self.assertEqual(initial_movement.tipo, "entrada")
        self.assertEqual(initial_movement.stock_anterior, 0)
        self.assertEqual(initial_movement.stock_nuevo, 4)
        self.assertEqual(initial_movement.usuario, self.admin)

    def test_admin_can_reactivate_category_without_losing_its_products(self):
        self.authenticate(self.admin)
        category = Categoria.objects.create(nombre="Reactivable")
        product = Producto.objects.create(
            codigo="KEEP-1",
            nombre="Producto conservado",
            categoria=category,
            precio="1.00",
        )
        response = self.client.delete(f"/api/categorias/{category.id}/")
        self.assertEqual(response.status_code, 204)
        category.refresh_from_db()
        self.assertFalse(category.activa)
        self.assertTrue(Producto.objects.filter(pk=product.pk).exists())

        response = self.client.patch(
            f"/api/categorias/{category.id}/",
            {"activa": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        category.refresh_from_db()
        self.assertTrue(category.activa)

    def test_product_cannot_use_inactive_category(self):
        self.authenticate(self.admin)
        category = Categoria.objects.create(nombre="Desactivada", activa=False)
        response = self.client.post(
            "/api/productos/",
            {
                "codigo": "INACTIVE-1",
                "nombre": "Producto inválido",
                "categoria": category.id,
                "precio": "1.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_seeded_categories_and_catalog_products_exist(self):
        for name in ("EPP", "Emergencia", "Señalización", "Botiquín", "Extintor", "Higiene"):
            with self.subTest(name=name):
                self.assertTrue(Categoria.objects.filter(nombre=name, activa=True).exists())
        self.assertTrue(Producto.objects.filter(codigo="MAG-EPP-001", nombre="Alcohol").exists())
        self.assertEqual(Producto.objects.filter(codigo__startswith="MAG-EPP-").count(), 8)

    def test_employee_registers_multi_product_sale_and_stock_movements(self):
        self.product.precio = "1250.00"
        self.product.save(update_fields=["precio"])
        second_product = Producto.objects.create(
            codigo="TEST-2",
            nombre="Segundo producto",
            categoria=self.category,
            precio="500.00",
            stock=5,
        )
        self.authenticate()
        response = self.client.post(
            "/api/ventas/",
            {
                "cliente": "Cliente de prueba",
                "forma_pago": "transferencia",
                "detalles": [
                    {"producto": self.product.id, "cantidad": 2},
                    {"producto": second_product.id, "cantidad": 1},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(str(response.data["total"]), "3000.00")
        self.assertEqual(len(response.data["detalles"]), 2)
        self.product.refresh_from_db()
        second_product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        self.assertEqual(second_product.stock, 4)
        self.assertEqual(
            Movimiento.objects.filter(observacion__contains=response.data["referencia"]).count(),
            2,
        )
        self.assertEqual(response.data["vendedor"], self.user.id)

    def test_sale_rejects_insufficient_stock_without_partial_changes(self):
        self.product.precio = "100.00"
        self.product.save(update_fields=["precio"])
        second_product = Producto.objects.create(
            codigo="NO-STOCK",
            nombre="Sin stock",
            categoria=self.category,
            precio="50.00",
            stock=0,
        )
        self.authenticate()
        response = self.client.post(
            "/api/ventas/",
            {
                "forma_pago": "efectivo",
                "detalles": [
                    {"producto": self.product.id, "cantidad": 4},
                    {"producto": second_product.id, "cantidad": 1},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertFalse(Venta.objects.exists())

    def test_employee_sale_history_is_private_and_admin_can_view_all(self):
        self.product.precio = "100.00"
        self.product.save(update_fields=["precio"])
        self.authenticate(self.admin)
        self.client.post(
            "/api/ventas/",
            {
                "forma_pago": "efectivo",
                "detalles": [{"producto": self.product.id, "cantidad": 1}],
            },
            format="json",
        )
        self.client.credentials()
        self.authenticate(self.user)
        self.assertEqual(self.client.get("/api/ventas/").data, [])
        response = self.client.post(
            "/api/ventas/",
            {
                "forma_pago": "efectivo",
                "detalles": [{"producto": self.product.id, "cantidad": 1}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(self.client.get("/api/ventas/").data), 1)
        self.client.credentials()
        self.authenticate(self.admin)
        self.assertEqual(len(self.client.get("/api/ventas/").data), 2)

    def test_expired_or_unpriced_products_cannot_be_sold(self):
        self.authenticate()
        self.product.precio = "100.00"
        self.product.fecha_caducidad = date.today() - timedelta(days=1)
        self.product.save(update_fields=["precio", "fecha_caducidad"])
        response = self.client.post(
            "/api/ventas/",
            {
                "forma_pago": "efectivo",
                "detalles": [{"producto": self.product.id, "cantidad": 1}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Venta.objects.exists())
        self.product.fecha_caducidad = date.today() + timedelta(days=1)
        self.product.precio = "0.00"
        self.product.save(update_fields=["fecha_caducidad", "precio"])
        response = self.client.post(
            "/api/ventas/",
            {
                "forma_pago": "efectivo",
                "detalles": [{"producto": self.product.id, "cantidad": 1}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_user_help_ticket_and_admin_reply_are_private_and_persisted(self):
        self.authenticate()
        response = self.client.post(
            "/api/ayuda/",
            {
                "asunto": "Ayuda con el inventario",
                "mensaje_inicial": "No encuentro un producto.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        ticket_id = response.data["id"]
        self.assertEqual(len(response.data["mensajes"]), 1)
        self.assertEqual(self.client.get("/api/ayuda/").data[0]["id"], ticket_id)

        self.client.credentials()
        self.authenticate(self.admin)
        response = self.client.post(
            f"/api/ayuda/{ticket_id}/mensajes/",
            {"contenido": "Te ayudo a buscarlo."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["es_admin"])
        self.assertEqual(
            self.client.get(f"/api/ayuda/{ticket_id}/").data["estado"],
            "respondida",
        )
        self.client.credentials()
        self.authenticate(self.user)
        response = self.client.get(f"/api/ayuda/{ticket_id}/")
        self.assertEqual(len(response.data["mensajes"]), 2)
        self.assertEqual(response.data["mensajes"][1]["contenido"], "Te ayudo a buscarlo.")

        other_user = User.objects.create_user(
            username="other",
            email="other@example.test",
            password="UnitTestPassword!246",
        )
        self.client.credentials()
        self.authenticate(other_user)
        self.assertEqual(self.client.get(f"/api/ayuda/{ticket_id}/").status_code, 404)

    def test_only_admin_can_close_help_ticket(self):
        self.authenticate()
        response = self.client.post(
            "/api/ayuda/",
            {"asunto": "Consulta", "mensaje_inicial": "Necesito ayuda"},
            format="json",
        )
        ticket_id = response.data["id"]
        self.assertEqual(
            self.client.post(f"/api/ayuda/{ticket_id}/cerrar/").status_code,
            403,
        )
        self.client.credentials()
        self.authenticate(self.admin)
        response = self.client.post(f"/api/ayuda/{ticket_id}/cerrar/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], "cerrada")

    def test_login_returns_real_token_and_user(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "employee@example.test", "password": "UnitTestPassword!246"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Token.objects.filter(key=response.data["token"]).exists())
        self.assertEqual(response.data["user"]["email"], "employee@example.test")

    def test_exit_movement_updates_stock(self):
        self.authenticate()
        response = self.client.post(
            "/api/movimientos/registrar/",
            {
                "producto": self.product.id,
                "tipo": "salida",
                "cantidad": 3,
                "fecha": date.today().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)

    def test_exit_movement_cannot_overdraw(self):
        self.authenticate()
        response = self.client.post(
            "/api/movimientos/registrar/",
            {
                "producto": self.product.id,
                "tipo": "salida",
                "cantidad": 30,
                "fecha": date.today().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    def test_logout_revokes_token(self):
        token = self.authenticate()
        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())
