# 🟨 Prompt maestro — Grupo 3: Base de Datos

## Objetivo
Diseñar y preparar la base de datos **MySQL** del Sistema de Gestión de Inventario, garantizando estructura lógica, integridad y compatibilidad con Django.

## Prompt para el equipo

Actúa como especialista en **bases de datos relacionales y MySQL**. Diseña la base de datos del Sistema de Gestión de Inventario de forma normalizada, clara y sencilla de integrar con Django.

### 1. Herramienta
Utiliza:
- MySQL.
- MySQL Workbench.

El script SQL debe quedar versionado en:
`database/database.sql`

### 2. Modelo mínimo
Diseña como mínimo las entidades:
- categorías;
- productos;
- movimientos de inventario;
- usuarios/roles, únicamente si el alcance final requiere administrarlos desde la base de datos.

Define correctamente:
- claves primarias;
- claves foráneas;
- tipos de datos;
- restricciones;
- índices cuando sean necesarios.

### 3. Relaciones
La estructura debe permitir, como mínimo:
- una categoría con muchos productos;
- un producto con muchos movimientos;
- cada movimiento relacionado con un producto;
- registrar tipo de movimiento, cantidad, fecha y observaciones cuando corresponda.

Evita almacenar información que pueda derivarse innecesariamente de otras tablas.

### 4. Integridad
Aplicar reglas como:
- claves primarias únicas;
- claves foráneas válidas;
- cantidades no negativas;
- campos obligatorios;
- nombres y códigos de producto apropiadamente controlados;
- restricciones de unicidad cuando sean necesarias.

La lógica de negocio que dependa del comportamiento de la aplicación debe validarse principalmente en Django, no únicamente en MySQL.

### 5. Script SQL
El archivo `database/database.sql` debe incluir, en orden:
1. creación/selección de la base de datos;
2. tablas;
3. restricciones y relaciones;
4. índices necesarios;
5. datos iniciales de prueba, si son necesarios;
6. consultas de comprobación útiles.

Debe poder ejecutarse desde MySQL Workbench sin depender de archivos externos.

### 6. Compatibilidad con Django
Diseña nombres y relaciones de forma clara para que Grupo 2 pueda representarlos mediante modelos Django.

No cambies arbitrariamente nombres de tablas o campos después de que backend y frontend comiencen la integración. Cualquier cambio estructural debe comunicarse al líder.

### 7. Documentación
En `database/README.md` explica:
- nombre de la base de datos;
- tablas;
- propósito de cada tabla;
- relaciones;
- cómo ejecutar `database.sql`;
- datos de prueba disponibles.

Si realizan un diagrama ER, guardarlo dentro de `database/` con un nombre claro.

### 8. Pruebas
Comprobar:
- creación correcta de tablas;
- inserción;
- actualización;
- eliminación cuando corresponda;
- consultas con relaciones;
- integridad referencial;
- casos de stock y movimientos.

### 9. Seguridad
Nunca subir contraseñas reales, credenciales de producción ni datos sensibles.

### 10. Git
Trabaja en:
`feature/database`

Commits sugeridos:
- `feat(database): design inventory schema`
- `feat(database): create sql script`
- `docs(database): document schema`

Al terminar:
**commit → push → Pull Request hacia `main` → esperar revisión del líder.**

## Resultado esperado
Una base de datos MySQL organizada, normalizada, documentada y lista para ser utilizada por Django.
