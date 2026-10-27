# MAGNUSSIG SIG — Sistema de gestión de inventario

Proyecto de aula de Ingeniería de Software de la Fundación Escuela Tecnológica de Neiva (FET). La aplicación permite administrar el catálogo de productos, categorías, existencias, movimientos, ventas, usuarios y solicitudes de ayuda de MAGNUSSIG S.A.S., empresa de Neiva, Huila, orientada a consultoría, ingeniería, ciberseguridad y desarrollo de software.

## Estado de la Entrega 3

La entrega aborda refinamiento, validaciones, persistencia y manejo de errores. En la verificación local documentada el 26 de octubre de 2026, Django pasó `manage.py check` y **23 pruebas automatizadas de `inventario` terminaron con resultado `OK`**. La conexión a MySQL también se verificó localmente. Estos resultados corresponden a la ejecución documentada; vuelve a ejecutar las pruebas después de cualquier cambio de código.

La matriz de pruebas y la explicación técnica se encuentran en [docs/ENTREGA3.md](docs/ENTREGA3.md).

## Funcionalidades

- Inicio de sesión mediante correo y token de Django REST Framework.
- Dashboard con indicadores del inventario y movimientos recientes.
- CRUD de productos y categorías, con permisos por rol.
- Entradas, salidas y ajustes de existencias, con control de stock insuficiente.
- Registro de ventas con varios productos y cálculo de totales.
- Gestión de usuarios, roles Administrador/Empleado y cierre de sesión.
- Centro de ayuda con conversaciones entre empleados y administradores.
- Reportes y exportación de inventario a CSV.
- Validación en frontend y backend; respuestas de error que no deben provocar el cierre de la aplicación.

## Arquitectura y estructura

| Capa | Tecnología | Ubicación |
|---|---|---|
| Frontend | HTML, CSS y JavaScript | `frontend/` |
| API y lógica de negocio | Python, Django y Django REST Framework | `backend/` |
| Persistencia relacional | MySQL / MySQL Workbench | Base `magnussig_inventario`, configurada en `backend/.env` |
| Script SQL de referencia | MySQL | `database/database.sql` |

El navegador se comunica con la API de Django; **el frontend no se conecta directamente a MySQL**. Django ORM realiza las lecturas y escrituras. El archivo `database/database.sql` documenta un modelo relacional de referencia; no debe mezclarse con las tablas gestionadas por las migraciones de Django.

## Requisitos

- Python 3.12 o una versión compatible con las dependencias instaladas.
- MySQL Server y MySQL Workbench (para la configuración MySQL).
- Visual Studio Code y Live Server para ejecutar el frontend local.
- Git.

## Instalación e inicio en Windows

Abre una terminal PowerShell en la carpeta del repositorio y entra al backend:

```powershell
cd backend
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `backend/.env` con los valores locales de MySQL antes de migrar. Como mínimo revisa `DB_ENGINE=mysql`, `DB_NAME=magnussig_inventario`, `DB_USER`, `DB_PASSWORD`, `DB_HOST=localhost` y `DB_PORT=3306`. La base debe existir y el usuario debe tener permisos. No copies tus contraseñas en el repositorio ni las compartas en capturas.

Luego ejecuta:

```powershell
python manage.py check
python manage.py migrate
python manage.py runserver 127.0.0.1:3000
```

Deja esta terminal abierta mientras trabajas. La configuración de ejemplo del frontend apunta a `http://127.0.0.1:3000/api`; si cambias el puerto, actualiza también la URL de API o usa la configuración `inventario.apiBase` documentada en el código.

### Abrir el frontend

En VS Code, haz clic derecho en `frontend/login.html` y selecciona **Open with Live Server**. La dirección será normalmente `http://127.0.0.1:5500/frontend/login.html` o `http://127.0.0.1:5500/login.html`, según la carpeta raíz elegida por Live Server. Mantén ambas terminales (Django y Live Server) abiertas.

### Administrador local

Para crear un administrador por primera vez, desde `backend/` ejecuta:

```powershell
python manage.py createsuperuser
```

Si ya existe, no lo vuelvas a crear. El panel de Django se encuentra en `http://127.0.0.1:3000/admin/` cuando el backend se ejecuta en el puerto 3000.

## Persistencia y manejo de errores

- Los registros de productos, categorías, movimientos, ventas, usuarios y ayuda se guardan mediante Django ORM en la base de datos configurada.
- Con MySQL, los registros permanecen después de cerrar sesión o reiniciar el servidor siempre que se use la misma base de datos.
- Ejecuta `python manage.py migrate` al incorporar migraciones nuevas. No borres la base ni sus tablas para “reiniciar” el proyecto.
- Los serializers validan campos, valores mínimos, claves únicas, categorías activas y cantidades. Los movimientos actualizan el stock y rechazan salidas superiores al disponible. Las ventas comprueban existencias y agrupan cambios relacionados en transacciones.
- Las validaciones HTML ayudan al usuario en formularios; la validación del backend sigue siendo obligatoria porque una llamada a la API puede omitir el formulario.
- `.env`, entornos virtuales, `__pycache__`, registros y la base SQLite local están excluidos por `.gitignore`. No subas credenciales reales.

## Pruebas

Desde `backend/`, con el entorno virtual activado:

```powershell
python manage.py check
python manage.py test inventario
```

La ejecución registrada para la Entrega 3 encontró 23 pruebas y finalizó con `Ran 23 tests ... OK`. Django crea una base de pruebas separada y la destruye al finalizar; no significa que borre la base de datos de trabajo. Las pruebas manuales CP-01–CP-10, sus resultados y la observación de validación de formularios se documentan en [docs/ENTREGA3.md](docs/ENTREGA3.md).

## Git y contribución

Usa ramas de funcionalidad, commits descriptivos y Pull Requests para respetar el flujo colaborativo del proyecto. No subas `.env`, contraseñas ni archivos de datos privados. Comprueba `git status` antes de hacer commit y revisa el diff.

- Repositorio: https://github.com/salomonjesuschavarrocastaneda-dev/Proyecto_final_semestre3
- Rama de trabajo de la entrega: `entrega3-refinamiento`, integrada a `main` mediante el Pull Request #9.

## Tecnologías

HTML · CSS · JavaScript · Python · Django · Django REST Framework · MySQL · MySQL Workbench · Git · GitHub


## Organización del equipo y flujo colaborativo

El trabajo se organiza por responsabilidades coordinadas:

- **Frontend:** interfaz, formularios, tablas y comunicación con la API en `frontend/`.
- **Backend:** modelos, serializers, permisos, endpoints y reglas de negocio en `backend/`.
- **Base de datos:** modelo relacional, consultas y script de referencia en `database/`.

El flujo sugerido es `rama de trabajo → commits descriptivos → Pull Request → revisión → merge`. Mantén `main` como rama estable y coordina los cambios que afecten a más de un grupo. Cada integrante debe registrar sus propios aportes desde su cuenta; no se deben inventar ni atribuir commits de otro integrante.
