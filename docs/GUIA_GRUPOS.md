# 📘 Guía de trabajo por grupos

## 🟦 GRUPO 1 — FRONTEND

### Carpeta
`frontend/`

### Objetivo
Construir la interfaz que utilizará el usuario.

### Responsabilidades
- HTML.
- CSS.
- JavaScript.
- Formularios.
- Tablas de productos.
- Pantallas de consulta y registro.
- Validaciones visuales.
- Consumo de la API de Django.

### Rama
`feature/frontend`

---

## 🟩 GRUPO 2 — BACKEND

### Carpeta
`backend/`

### Objetivo
Construir el servidor y la lógica del sistema utilizando **Django**.

### Responsabilidades
- Configurar el proyecto Django.
- Crear aplicaciones.
- Crear modelos.
- Crear URLs.
- Crear vistas.
- Crear API/endpoints.
- Validar información.
- Conectar Django con MySQL.
- Integrar Frontend y Base de Datos.

### Rama
`feature/backend`

### Estructura esperada

```text
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

---

## 🟨 GRUPO 3 — BASE DE DATOS

### Carpeta
`database/`

### Objetivo
Diseñar y administrar la estructura de datos del sistema.

### Responsabilidades
- Tablas.
- Relaciones.
- Claves primarias.
- Claves foráneas.
- Restricciones.
- Consultas.
- Script `database.sql`.
- Documentación del modelo de datos.

### Rama
`feature/database`

---

# 🔀 PROCEDIMIENTO PARA TODOS

## 1. Fork

Cada grupo crea un Fork del repositorio principal.

Esto crea una copia del proyecto en la cuenta del integrante que lo realiza.

## 2. Crear una rama

No trabajar directamente en `main`.

Ramas:

```text
feature/frontend
feature/backend
feature/database
```

## 3. Trabajar

Cada grupo trabaja principalmente dentro de su carpeta.

## 4. Commit

Los commits deben explicar el cambio.

Ejemplos:

```text
feat(frontend): crear formulario de productos
feat(backend): crear modelo producto
feat(database): crear tabla productos
fix(frontend): corregir estilos del formulario
```

## 5. Push

Subir la rama al Fork.

## 6. Pull Request

Crear un Pull Request desde la rama del Fork hacia:

```text
Repositorio principal → main
```

## 7. Revisión

El líder revisará:
- Que el código funcione.
- Que no afecte otras áreas.
- Que respete la estructura.
- Que esté correctamente documentado.

## 8. Merge

Si todo está correcto, el líder integra el Pull Request a `main`.

---

# 🔗 ¿Cómo se conectan los grupos?

La arquitectura general es:

```text
USUARIO
   ↓
FRONTEND
HTML + CSS + JavaScript
   ↓
API / SOLICITUD HTTP
   ↓
DJANGO
Python + lógica + modelos + vistas
   ↓
MYSQL
Base de datos
```

El Frontend no debe conectarse directamente a MySQL.

Django será el intermediario.

---

# 🧭 ORDEN RECOMENDADO

### Fase 1
Grupo 3 diseña el modelo de datos.

### Fase 2
Grupo 2 configura Django y la conexión con MySQL.

### Fase 3
Grupo 2 crea los endpoints/API.

### Fase 4
Grupo 1 construye las interfaces.

### Fase 5
Grupo 1 conecta JavaScript con la API.

### Fase 6
Todos realizan pruebas.

### Fase 7
Corrección de errores y documentación final.

Los grupos pueden avanzar en paralelo siempre que respeten los acuerdos de integración.

---

# ⚠️ IMPORTANTE

Si un cambio necesita modificar archivos de otro grupo, primero deben coordinarlo.

La rama `main` representa la versión integrada del proyecto.
