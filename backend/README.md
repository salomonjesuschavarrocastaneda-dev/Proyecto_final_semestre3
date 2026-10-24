# Backend MAGNUSSIG SIG

Django REST API para el sistema de inventario. Para facilitar una primera ejecución se usa SQLite por defecto; puede cambiarse a MySQL mediante variables de entorno.

## Instalación (Windows / PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/`. Salud: `http://127.0.0.1:8000/health/`. Admin: `/admin/`.

## Endpoints principales
- `POST /api/auth/register/` — creación de cuenta solo para administradores autenticados.
- `POST /api/auth/login/` — recibe `{ "email": "...", "password": "..." }`, devuelve token y usuario.
- `POST /api/auth/logout/` — revoca el token de la sesión autenticada.
- `POST /api/auth/password-reset/` — solicita recuperación; para envío real configura EMAIL en Django.
- `GET/POST /api/productos/`, `GET/PUT/PATCH/DELETE /api/productos/{id}/`. Solo administradores crean, editan y eliminan productos; empleados pueden consultarlos y registrar movimientos.
- `GET/POST /api/categorias/` y `/api/categorias/{id}/`. La escritura está reservada al administrador.
- `GET /api/movimientos/`; `POST /api/movimientos/registrar/` para entrada, salida o ajuste.
- `GET/POST /api/ventas/`, `GET /api/ventas/{id}/` — consultar ventas propias o de todo el equipo (administrador) y registrar ventas con varios productos.
- `GET/POST /api/ayuda/`, `GET /api/ayuda/{id}/`, `POST /api/ayuda/{id}/mensajes/` — conversaciones internas; usuarios ven las propias y administradores atienden la bandeja. `POST /api/ayuda/{id}/cerrar/` es solo administrador.
- `GET /api/dashboard/` — indicadores.
- `GET/POST /api/usuarios/` y `DELETE /api/usuarios/{id}/` — solo administrador. La creación permite asignar los roles Administrador o Empleado.

Las rutas protegidas requieren autenticación por token. Los empleados pueden registrar entradas, salidas y ventas; solo administradores realizan ajustes de stock y gestionan usuarios. Una venta registra precios unitarios, vendedor, cliente opcional y forma de pago, valida stock y crea sus movimientos de salida en una transacción. Las categorías EPP, Emergencia, Señalización, Botiquín, Extintor e Higiene y ocho referencias iniciales de seguridad se crean con las migraciones. El catálogo inicial tiene stock cero, precio por configurar y campos de normas/certificaciones en blanco: deben completarse con la información real del proveedor. Las fichas guardan unidad de medida, fecha de caducidad, lote, marca, proveedor, ubicación, normas y descripción. El centro de ayuda conserva mensajes y respuestas dentro del sistema; las conversaciones se actualizan automáticamente mientras el panel está abierto. El frontend no cambia a datos locales cuando la API falla; muestra el error en el módulo afectado.

La configuración SMTP se define con `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL` y `DEFAULT_FROM_EMAIL` en `backend/.env`. Las rutas de recuperación HTML de Django están disponibles bajo `/accounts/`.

Para MySQL: instala el conector requerido, crea la base `magnussig_inventario`, configura `DB_ENGINE=mysql` y demás valores en `.env`, y ejecuta `python manage.py migrate`. No subas `.env` ni contraseñas a GitHub.
