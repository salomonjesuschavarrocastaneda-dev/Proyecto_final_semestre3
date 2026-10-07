# 🟦 Prompt maestro — Grupo 1: Frontend

## Objetivo
Construir la interfaz web del **Sistema de Gestión de Inventario** siguiendo el mockup aprobado en Figma. El resultado debe ser profesional, claro, responsive y sencillo de mantener.

## Prompt para el equipo

Actúa como desarrollador frontend senior. Desarrolla únicamente la capa **frontend** del Sistema de Gestión de Inventario usando **HTML5, CSS3 y JavaScript vanilla**. No uses frameworks ni librerías innecesarias.

### 1. Arquitectura
Trabaja exclusivamente dentro de:
- `frontend/index.html`
- `frontend/css/`
- `frontend/js/`
- `frontend/assets/`

Mantén una estructura organizada y reutilizable. No modifiques `backend/`, `database/` ni archivos de otros grupos.

### 2. Interfaz
Implementa como mínimo:
1. Login.
2. Dashboard.
3. Listado de productos.
4. Registro de producto.
5. Edición de producto.
6. Detalle de producto.
7. Categorías.
8. Movimientos de inventario.
9. Usuarios.
10. Reportes.
11. Configuración.

El diseño debe seguir el mockup de Figma y mantener una navegación coherente.

### 3. Funcionalidad
Implementa:
- navegación entre vistas;
- formularios con validación básica;
- búsqueda y filtros;
- tablas de productos;
- estados de stock: disponible, bajo y agotado;
- botones de agregar, editar, consultar y eliminar;
- modales o confirmaciones cuando sean útiles;
- datos de prueba mientras el backend no esté conectado;
- código preparado para consumir una API REST de Django mediante `fetch()`.

**Importante:** el frontend NO debe conectarse directamente a MySQL.

### 4. Calidad
- HTML semántico.
- CSS organizado.
- JavaScript modular y entendible.
- Variables y funciones con nombres claros.
- Responsive para computador, tablet y móvil.
- Accesibilidad básica.
- No dejar código duplicado innecesariamente.
- No incluir contraseñas, claves ni credenciales.

### 5. Integración futura
Deja claramente identificados los lugares donde posteriormente se consumirán endpoints de Django, por ejemplo:
- GET productos
- POST producto
- PUT/PATCH producto
- DELETE producto
- GET categorías
- GET movimientos
- autenticación

No inventes endpoints definitivos si el contrato del backend aún no ha sido acordado.

### 6. Antes de entregar
Verifica:
- todas las vistas funcionan;
- los enlaces y botones principales funcionan;
- no hay errores en consola;
- el diseño coincide con Figma;
- las rutas de archivos son correctas;
- no se modificaron archivos de otros grupos.

### 7. Git
Trabaja en la rama:
`feature/frontend`

Haz commits claros, por ejemplo:
- `feat(frontend): create dashboard`
- `feat(frontend): add product management views`
- `fix(frontend): correct responsive layout`

Al terminar:
**commit → push → Pull Request hacia `main` → esperar revisión del líder.**

## Resultado esperado
Un frontend funcional y visualmente profesional, preparado para conectarse posteriormente con el backend Django.
