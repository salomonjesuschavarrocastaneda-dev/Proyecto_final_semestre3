# Base de datos MAGNUSSIG SIG

El script `database.sql` documenta un modelo relacional de referencia para categorías, productos y movimientos, con claves foráneas, restricciones e índices.

**Decisión de integración:** el backend incluido usa Django ORM. Para el modo más sencillo, Django comienza con SQLite. Para una entrega MySQL, crea la base `magnussig_inventario`, configura `DB_ENGINE=mysql` y las credenciales privadas en `backend/.env`, y ejecuta `python manage.py migrate`. No mezcles las tablas `_ref` del script con las tablas que cree Django; son una referencia de esquema alternativa, no dos esquemas que deban convivir.

El frontend nunca se conecta directamente a MySQL; todas las operaciones persistentes pasan por la API de Django.
