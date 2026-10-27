# Backend MAGNUSSIG SIG

API REST del sistema de gestión de inventario desarrollado con Django y Django REST Framework. La API aplica autenticación por token y permisos para separar las acciones de administradores y empleados.

## Preparación local (Windows / PowerShell)

Desde la raíz del repositorio:

```powershell
cd backend
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `.env` con las credenciales locales. No reemplaces un `.env` existente, no lo subas a GitHub y no copies contraseñas reales al README. Revisa como mínimo:

- `DB_ENGINE=mysql`
- `DB_NAME=magnussig_inventario`
- `DB_USER` y `DB_PASSWORD`
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `PORT=3000` (el frontend incluido usa `http://127.0.0.1:3000/api`)

La base de datos debe existir en MySQL y el usuario necesita permisos. El proyecto puede usar SQLite si `DB_ENGINE` no está configurado como `mysql`, pero el entorno de entrega documentado utiliza MySQL.

Luego ejecuta:

```powershell
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:3000
```

Comprueba el servicio en `http://127.0.0.1:3000/health/`. Panel de administración: `http://127.0.0.1:3000/admin/`.

Para crear el primer administrador local:

```powershell
python manage.py createsuperuser
```

No ejecutes ese comando otra vez si ya tienes una cuenta administradora.

## Pruebas automatizadas

Con el entorno virtual activo y desde la carpeta `backend/`:

```powershell
python manage.py check
python manage.py test inventario
```

La auditoría local del 27 de octubre de 2026 encontró 29 pruebas y terminó con `Ran 29 tests ... OK`, usando el motor MySQL configurado. La suite de Django crea una base de datos temporal para probar y la elimina al finalizar; no borra la base de datos de trabajo. Repite las pruebas después de modificar código y conserva la salida real de consola como evidencia.

## Persistencia, validaciones y manejo de errores

- Django ORM guarda los datos en el motor configurado en `.env`; para MySQL utiliza la base `magnussig_inventario`.
- Las migraciones administran la estructura de las tablas. Ejecuta `python manage.py migrate` cuando incorpores una migración nueva; no borres manualmente tablas para reiniciar el proyecto.
- Los serializers validan campos obligatorios, códigos únicos, categorías activas, precios, cantidades y fechas. La API devuelve errores de validación de forma estructurada.
- Las entradas aumentan el stock, las salidas verifican la disponibilidad y los ajustes están restringidos a administradores. Las ventas se guardan dentro de transacciones para evitar cambios parciales cuando no hay inventario suficiente.
- En el frontend se presentan mensajes para campos obligatorios y valores numéricos/rangos inválidos; la API mantiene las validaciones aunque se omita el formulario HTML.
- Una prueba útil de persistencia es crear un producto de prueba, cerrar sesión y volver a entrar; para comprobar reinicio de servicio, detener Django con `Ctrl+C`, iniciarlo de nuevo contra la misma base y consultar el producto de nuevo.

## Endpoints principales
- `POST /api/auth/register/` — creación de cuenta solo para administradores autenticados.
- `POST /api/auth/login/` — recibe `{ "email": "...", "password": "..." }`, devuelve token y usuario.
- `POST /api/auth/logout/` — revoca el token de la sesión autenticada.
- `POST /api/auth/password-reset/` — solicita recuperación; para envío real configura EMAIL en Django.
- `GET/POST /api/productos/`, `GET/PUT/PATCH/DELETE /api/productos/{id}/`. Solo administradores crean, editan y eliminan productos; empleados pueden consultarlos y registrar movimientos. `DELETE` elimina físicamente el producto. Las ventas y los movimientos históricos permanecen guardados con una copia del código y nombre del producto (y la categoría en los detalles de venta), aunque ya no queden vinculados al producto eliminado.
- `GET/POST /api/categorias/` y `/api/categorias/{id}/`. La escritura está reservada al administrador.
- `GET /api/movimientos/`; `POST /api/movimientos/registrar/` para entrada, salida o ajuste.
- `GET/POST /api/ventas/`, `GET /api/ventas/{id}/` — consultar ventas propias o de todo el equipo (administrador) y registrar ventas con varios productos.
- `GET/POST /api/ayuda/`, `GET /api/ayuda/{id}/`, `POST /api/ayuda/{id}/mensajes/` — conversaciones internas; usuarios ven las propias y administradores atienden la bandeja. `POST /api/ayuda/{id}/cerrar/` es solo administrador.
- `GET /api/dashboard/` — indicadores.
- `GET/POST /api/usuarios/` y `DELETE /api/usuarios/{id}/` — solo administrador. La creación permite asignar los roles Administrador o Empleado.
- `GET /health/` — comprobación básica del servicio.

## Correo y seguridad

Configura el envío real de correo mediante `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL` y `DEFAULT_FROM_EMAIL` en `.env`. No publiques estas credenciales. `.env` y los archivos temporales deben mantenerse excluidos de Git.
