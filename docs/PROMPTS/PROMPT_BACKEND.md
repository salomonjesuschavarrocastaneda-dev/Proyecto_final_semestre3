# 🟩 Prompt maestro — Grupo 2: Backend

## Objetivo
Construir la capa de servidor del **Sistema de Gestión de Inventario** usando **Python + Django**, responsable de la lógica, modelos, API y comunicación con MySQL.

## Prompt para el equipo

Actúa como desarrollador backend senior especializado en **Python y Django**. Desarrolla únicamente el backend del Sistema de Gestión de Inventario.

### 1. Arquitectura
Trabaja dentro de:
- `backend/`

La estructura esperada es:
```
backend/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── ...
└── inventario/
    ├── models.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    └── migrations/
```

No modifiques `frontend/` ni `database/` salvo que exista un acuerdo explícito de integración.

### 2. Configuración
Crear y configurar:
- proyecto Django;
- aplicación `inventario`;
- conexión a MySQL;
- variables de entorno para credenciales;
- configuración segura para desarrollo;
- migraciones.

No subir contraseñas ni credenciales reales al repositorio.

### 3. Modelo funcional
El sistema debe contemplar como mínimo:
- Producto.
- Categoría.
- Movimiento de inventario.
- Usuario/rol, utilizando el sistema de autenticación de Django cuando sea apropiado.

Un producto debe contemplar datos como nombre, descripción, categoría, precio, stock, stock mínimo, estado y fechas relevantes.

Los movimientos deben permitir registrar entradas y salidas y mantener coherente el stock.

### 4. API
Diseña una API REST clara para que el frontend pueda consumirla.

Como mínimo deben existir operaciones para:
- listar productos;
- consultar producto;
- crear producto;
- actualizar producto;
- eliminar producto;
- listar categorías;
- registrar movimientos;
- consultar movimientos;
- autenticación/autorización según el alcance acordado.

Define respuestas JSON consistentes y códigos HTTP apropiados.

### 5. Reglas de negocio
Validar, como mínimo:
- campos obligatorios;
- precios y cantidades válidas;
- stock no negativo;
- stock mínimo coherente;
- categoría existente;
- movimiento de salida sin permitir stock insuficiente;
- actualización correcta del stock después de un movimiento.

Evita duplicar lógica entre vistas.

### 6. Calidad y seguridad
- Código PEP 8 y fácil de entender.
- Separar responsabilidades.
- Usar modelos, vistas, URLs y migraciones correctamente.
- Validar datos recibidos.
- No exponer credenciales.
- Manejar errores con respuestas claras.
- Preparar configuración para desarrollo sin comprometer secretos.

### 7. Integración
El backend será el intermediario:

**Frontend → API Django → MySQL**

Nunca permitir que el frontend se conecte directamente a MySQL.

Coordina con Grupo 1 los nombres y formatos definitivos de los endpoints y con Grupo 3 la estructura definitiva de las tablas/datos.

### 8. Pruebas
Probar como mínimo:
- creación de producto;
- consulta;
- actualización;
- eliminación;
- entrada de inventario;
- salida de inventario;
- validación de stock;
- conexión con MySQL.

### 9. Git
Trabaja en:
`feature/backend`

Commits sugeridos:
- `feat(backend): initialize django project`
- `feat(backend): add inventory models`
- `feat(backend): create product api`
- `feat(backend): implement inventory movements`

Al terminar:
**commit → push → Pull Request hacia `main` → esperar revisión del líder.**

## Resultado esperado
Un backend Django funcional, documentado y preparado para recibir peticiones del frontend y almacenar información en MySQL.
