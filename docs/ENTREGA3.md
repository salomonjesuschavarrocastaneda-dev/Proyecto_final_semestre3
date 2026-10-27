# Entrega 3 — Refinamiento, persistencia y manejo de errores

**Proyecto:** Sistema de Gestión de Inventario MAGNUSSIG SIG  
**Institución:** Fundación Escuela Tecnológica de Neiva — Jesús Oviedo Pérez (FET)  
**Programa:** Ingeniería de Software  
**Asignaturas:** Lenguaje de Programación 1 e Introducción a las Bases de Datos  
**Líder del proyecto:** Salomón Jesús Chavarro Castañeda

**Integrantes y códigos:** [Completar nombres y códigos de todo el equipo]

**Asignatura y grupo:** [Completar asignatura y grupo]

**Fecha de entrega:** [Completar fecha]

**Ciudad y año:** Neiva, Huila, Colombia — 2026
**Repositorio:** https://github.com/salomonjesuschavarrocastaneda-dev/Proyecto_final_semestre3

## 1. Propósito

La Entrega 3 fortalece el MVP mediante validaciones, manejo controlado de errores, conservación de los registros en una base de datos y pruebas. La meta es impedir que los datos inválidos creen registros incoherentes o que fallen las operaciones críticas del inventario.

## 2. Arquitectura de persistencia

La solución utiliza tres capas:

1. **Frontend:** HTML, CSS y JavaScript en `frontend/`. Presenta los formularios, muestra validaciones de campos y consume la API.
2. **Backend:** Python, Django y Django REST Framework en `backend/`. Controla autenticación, permisos, validaciones, reglas de negocio y operaciones transaccionales.
3. **Base de datos:** MySQL, configurado mediante las variables privadas de `backend/.env`. Django ORM conserva productos, categorías, movimientos, ventas, usuarios y solicitudes de ayuda.

El navegador no se conecta directamente con MySQL. Las escrituras se realizan a través de la API, de modo que los permisos y validaciones se aplican en el servidor. En la auditoría local se confirmó la conexión MySQL configurada en `backend/.env` y que las migraciones `0001_initial`, `0002_producto_fecha_caducidad_producto_lote_and_more`, `0003_solicitudayuda_mensajeayuda_venta_detalleventa` y `0004_product_deletion_history` están aplicadas.

### Evidencia de persistencia registrada

El registro anterior del proyecto contiene este conteo histórico, que no se volvió a consultar durante esta auditoría:

| Entidad | Registros que mostró la consulta |
|---|---:|
| Productos | 9 |
| Categorías | 6 |
| Movimientos | 10 |

No hay capturas de la aplicación o de la consola en el repositorio. Deben incorporarse al PDF de entrega después de realizar la verificación manual de reinicio y recarga; esta auditoría no afirma que dicha prueba manual se haya repetido.

## 3. Validaciones y manejo de errores

Las validaciones se distribuyen entre el navegador y la API. Las validaciones visuales ayudan a corregir la entrada; el backend vuelve a validar antes de escribir en la base de datos.

- **Campos obligatorios:** código, nombre, categoría y campos de operación necesarios.
- **Tipo y rango:** precio no negativo, stock y stock mínimo no negativos; cantidad de movimiento como entero positivo.
- **Duplicados:** los códigos de producto y nombres de categoría tienen restricciones únicas.
- **Stock:** una salida no puede superar la existencia disponible; la API devuelve un error de validación y conserva el stock.
- **Movimientos:** la operación guarda stock anterior, stock nuevo, fecha, producto y usuario cuando corresponde.
- **Ventas:** se comprueba el stock de todos los detalles; las operaciones relacionadas se guardan en una transacción para impedir cambios parciales.
- **Permisos:** productos y categorías solo los modifica un administrador; los ajustes de stock y la gestión de usuarios están restringidos por rol.
- **Fallos del formulario:** se añadió validación HTML personalizada para mostrar mensajes más claros de campos obligatorios, entradas numéricas, mínimos, máximos y formatos.

La validación del navegador mejora el mensaje mostrado al usuario, pero las comprobaciones del servidor son las que protegen la persistencia. La verificación visual de los formularios y la captura de consola quedan pendientes; no se presentan como pruebas automatizadas.

## 4. Pruebas automatizadas

Resultados de la auditoría actual:

- `python manage.py check`: `System check identified no issues`.
- `python manage.py test inventario`: `Found 29 test(s)`; `Ran 29 tests in 4230.844s`; `OK`.
- El test runner creó y destruyó una base temporal. La configuración activa apuntó a MySQL; la base de trabajo no se eliminó.
- La suite incluye pruebas de autenticación, endpoints protegidos, permisos de empleados y administradores, creación y edición de productos, movimientos, ventas con varios productos, insuficiencia de stock, categorías, centro de ayuda y eliminación física con conservación del historial.

Estos resultados corresponden a la captura de ejecución. Repite las pruebas después de cualquier modificación local antes de presentar una nueva evidencia.

## 5. Matriz de pruebas funcionales (CP-01 a CP-10)

La ejecución automatizada completa terminó con 29 pruebas aprobadas. La tabla registra los escenarios automatizados cubiertos; las pruebas visuales/manuales (incluidas las capturas para el PDF final) siguen pendientes y no se presentan como realizadas.

| Código | Caso de prueba | Datos de entrada | Resultado esperado | Resultado obtenido | Corrección aplicada | Responsable |
|---|---|---|---|---|---|---|
| CP-01 | Registro válido de producto | Código nuevo, nombre, categoría activa y precio válido | HTTP 201; producto y movimiento inicial persistidos | Automatizada: aprobada en la ejecución de 29 pruebas | `test_admin_creates_product_with_inventory_details` | Salomón Jesús Chavarro Castañeda |
| CP-02 | Precio negativo | Crear producto con precio `-1.00` | HTTP 400; no crear producto | Automatizada: aprobada en la ejecución de 29 pruebas | `test_admin_rejects_invalid_product_price_and_stock` | Salomón Jesús Chavarro Castañeda |
| CP-03 | Cantidad/stock inválido | Stock `-1`; movimiento con `0`, `-1` o texto | HTTP 400; stock sin cambios | Automatizada: aprobada en la ejecución de 29 pruebas | Pruebas de rechazo de stock y `test_invalid_movement_quantity_and_date_return_controlled_errors` | Salomón Jesús Chavarro Castañeda |
| CP-04 | Campos obligatorios vacíos | Código, nombre o categoría faltantes/vacíos | HTTP 400; no crear producto | Automatizada: aprobada en la ejecución de 29 pruebas | `test_admin_rejects_empty_required_product_fields` | Salomón Jesús Chavarro Castañeda |
| CP-05 | Código duplicado | Reutilizar un código existente | HTTP 400; conservar único el registro original | Automatizada: aprobada en la ejecución de 29 pruebas | `test_admin_rejects_duplicate_product_code` | Salomón Jesús Chavarro Castañeda |
| CP-06 | Salida con stock insuficiente | Solicitar salida superior al stock | HTTP 400; stock intacto y movimiento no creado | Automatizada: aprobada en la ejecución de 29 pruebas | `test_exit_movement_cannot_overdraw` | Salomón Jesús Chavarro Castañeda |
| CP-07 | Persistencia de producto | Crear y consultar el producto por la API | El producto guardado aparece en la consulta | Automatizada: aprobada en la ejecución de 29 pruebas | Lectura posterior comprobada en `test_admin_creates_product_with_inventory_details` | Salomón Jesús Chavarro Castañeda |
| CP-08 | Autenticación | Consultar endpoints protegidos sin token | HTTP 401 | Automatizada: aprobada en la ejecución de 29 pruebas | `test_protected_endpoints_reject_anonymous_requests` | Salomón Jesús Chavarro Castañeda |
| CP-09 | Permisos por rol | Empleado intenta modificar catálogo o ajustar stock | HTTP 403; sin cambios | Automatizada: aprobada en la ejecución de 29 pruebas | `test_employee_cannot_manage_catalog_or_users` | Salomón Jesús Chavarro Castañeda |
| CP-10 | Error controlado y borrado | Fecha/cantidad inválida; borrado físico con historial | HTTP 400 en entrada inválida; al borrar, el producto desaparece y ventas/movimientos se conservan | Automatizada: aprobada en la ejecución de 29 pruebas | `test_invalid_movement_quantity_and_date_return_controlled_errors` y `test_admin_deletes_product_and_preserves_inventory_and_sales_history` | Salomón Jesús Chavarro Castañeda |

## 6. Control de versiones

Repositorio oficial: https://github.com/salomonjesuschavarrocastaneda-dev/Proyecto_final_semestre3

En la auditoría, la rama local es `main`, coincide con `origin/main` y no había cambios locales antes de comenzar la revisión. El flujo recomendado del repositorio es rama de trabajo → commits descriptivos → Pull Request → revisión → merge.

Último commit remoto observado al iniciar la auditoría: `2bc51b0` — `fix: completar validaciones y mejoras del inventario`. La evidencia gráfica del historial de commits aún debe capturarse en GitHub para el PDF.

El archivo `.gitignore` excluye `.env`, entornos virtuales, cachés, logs y la base SQLite local. Las credenciales reales no se incluyen en Git.

## 7. Cómo ejecutar la verificación

Desde `backend/`, con el entorno virtual activo y `.env` configurado:

```powershell
python manage.py check
python manage.py test inventario
```

Para comprobar persistencia en la base de trabajo, cree un producto de prueba, compruebe que aparece en la lista, detenga el servidor con `Ctrl+C`, vuelva a iniciarlo contra la misma base de datos y consulte el producto. No ejecute este procedimiento contra una base de datos de producción ni borre registros existentes.

## 8. Conclusiones

MAGNUSSIG SIG utiliza una arquitectura de tres capas con persistencia relacional mediante Django ORM y MySQL. En esta auditoría se confirmó la conexión a MySQL, el estado de las migraciones y la coherencia de modelos. La auditoría de código, la conexión MySQL y las 29 pruebas automatizadas se verificaron localmente. La validación visual/manual y las capturas para el PDF final continúan pendientes.

La entrega debe acompañarse de las capturas de consola y de la interfaz, la matriz de pruebas y la evidencia del historial de commits en GitHub.
