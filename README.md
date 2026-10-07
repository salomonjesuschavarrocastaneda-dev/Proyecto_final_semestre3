# Proyecto Final Semestre 3

# Sistema de Gestión de Inventario

Este repositorio contiene el proyecto académico de un **Sistema de Gestión de Inventario**.

El proyecto está dividido en **3 grupos de trabajo**:

| Grupo | Área | Tecnologías | Carpeta |
|---|---|---|---|
| 🟦 **Grupo 1** | Frontend | HTML, CSS, JavaScript | `frontend/` |
| 🟩 **Grupo 2** | Backend | Python, Django | `backend/` |
| 🟨 **Grupo 3** | Base de datos | MySQL, MySQL Workbench | `database/` |

---

## 🎯 Objetivo

Desarrollar un sistema que permita gestionar productos e inventario mediante una interfaz web conectada a un backend desarrollado con Django y una base de datos MySQL.

## 🧩 ¿Qué hace cada grupo?

### 🟦 Grupo 1 — Frontend

Se encarga de todo lo que el usuario **ve y utiliza**.

Trabaja principalmente en:

`frontend/`

Responsabilidades:
- Crear las páginas.
- Diseñar la interfaz.
- Formularios de productos.
- Tablas y listados.
- CSS.
- JavaScript.
- Comunicación con el backend.

**Rama:** `feature/frontend`

---

### 🟩 Grupo 2 — Backend

Se encarga de la **lógica y funcionamiento interno** del sistema.

Trabaja principalmente en:

`backend/`

Tecnología principal: **Django + Python**

Responsabilidades:
- Configurar Django.
- Crear aplicaciones.
- Crear modelos.
- Crear URLs.
- Crear vistas.
- Crear API/endpoints.
- Validar información.
- Conectar Django con MySQL.
- Procesar las solicitudes del frontend.

**Rama:** `feature/backend`

---

### 🟨 Grupo 3 — Base de datos

Se encarga de dónde y cómo se **almacena la información**.

Trabaja principalmente en:

`database/`

Tecnología: **MySQL**

Responsabilidades:
- Diseñar tablas.
- Definir claves primarias.
- Definir claves foráneas.
- Crear relaciones.
- Crear consultas.
- Crear el script `database.sql`.
- Coordinar la estructura con Backend.

**Rama:** `feature/database`

---

# 🔄 Flujo de trabajo

El proyecto utiliza:

**Fork → Branch → Commit → Push → Pull Request → Revisión → Merge**

La rama `main` es la rama principal y estable.

### 🚫 Regla principal

**Ningún grupo debe trabajar directamente sobre `main` del repositorio principal.**

Cada grupo trabaja desde su propio Fork y rama.

## 📌 Ejemplo

```text
Repositorio principal
        │
        ├── Fork Grupo 1
        │       └── feature/frontend
        │
        ├── Fork Grupo 2
        │       └── feature/backend
        │
        └── Fork Grupo 3
                └── feature/database
                         │
                         ↓
                    Pull Request
                         │
                         ↓
                    main principal
```

---

# 📁 Estructura

```text
Proyecto_final_semestre3/
│
├── frontend/          # 🟦 Grupo 1
├── backend/           # 🟩 Grupo 2
├── database/          # 🟨 Grupo 3
├── docs/              # Documentación
├── tests/             # Pruebas
├── .gitignore
└── README.md
```

Para conocer el procedimiento completo, leer:

`docs/GUIA_GRUPOS.md`

---

# ⚠️ Reglas del repositorio

1. No trabajar directamente sobre `main`.
2. No borrar archivos de otro grupo.
3. No subir contraseñas ni archivos `.env`.
4. Probar los cambios antes del Pull Request.
5. Utilizar commits descriptivos.
6. Explicar los cambios en el Pull Request.
7. Respetar la estructura de carpetas.
8. Si un cambio afecta a otro grupo, coordinarlo antes.

---

# 🛠️ Tecnologías

- HTML
- CSS
- JavaScript
- Python
- Django
- MySQL
- MySQL Workbench
- Git
- GitHub

**Estado:** 🚧 En desarrollo.
