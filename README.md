# MAGNUSSIG SIG — Sistema de Gestión de Inventario

Aplicación web académica para el control de productos, categorías, entradas/salidas de inventario, usuarios, reportes y alertas de stock de MAGNUSSIG SAS (Neiva, Huila), empresa dedicada a consultoría de gestión e ingeniería, ciberseguridad, sistemas integrados de gestión y desarrollo de software.

## Arquitectura
- `frontend/`: HTML, CSS y JavaScript vanilla con dashboard responsive.
- `backend/`: Django REST Framework, autenticación por token y reglas de negocio.
- `database/`: modelo relacional de referencia en MySQL.

## Inicio rápido en Windows
### 1. Backend (PowerShell)
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
API: `http://127.0.0.1:8000/api/`.

### 2. Frontend
En otra terminal, sirve `frontend/` con Live Server de VS Code en `http://127.0.0.1:5500` y abre `login.html`. Registra una cuenta o usa Django admin para crear usuarios.

### 3. MySQL (opcional)
Para que Django use MySQL, crea la base `magnussig_inventario`, configura las variables DB en `backend/.env` con `DB_ENGINE=mysql`, y ejecuta `python manage.py migrate`. No mezcles las tablas `_ref` de `database/database.sql` con las tablas administradas por Django; el SQL documenta el modelo de referencia.

## Funcionalidades
- Login, registro y solicitud de recuperación de contraseña (SMTP requerido para enviar correos reales).
- Dashboard con indicadores, gráfico, productos críticos y acciones rápidas.
- CRUD de productos y categorías en modo de demostración; CRUD de productos/categorías vía API autenticada.
- Entradas, salidas y ajustes que actualizan existencias y bloquean salidas mayores que el stock.
- Búsqueda, filtros, consulta de usuarios en API para administradores, reportes y exportación CSV.
- Diseño responsive con la marca MAGNUSSIG.

## Limitaciones
La demo local usa localStorage y no sincroniza equipos. No usar el modo demo para datos empresariales reales. Antes de producción se requiere configurar secretos seguros, HTTPS, SMTP, CORS, respaldos y revisar controles de acceso.
