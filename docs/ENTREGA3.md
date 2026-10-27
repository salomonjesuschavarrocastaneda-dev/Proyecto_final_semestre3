# Entrega 3 — Refinamiento, persistencia y manejo de errores

**Proyecto:** Sistema de Gestión de Inventario MAGNUSSIG SIG  
**Institución:** Fundación Escuela Tecnológica de Neiva — Jesús Oviedo Pérez (FET)  
**Programa:** Ingeniería de Software  
**Asignaturas:** Lenguaje de Programación 1 e Introducción a las Bases de Datos  
**Líder del proyecto:** Salomón Jesús Chavarro Castañeda  
**Ciudad y año:** Neiva, Huila, Colombia — 2026  
**Repositorio:** https://github.com/salomonjesuschavarrocastaneda-dev/Proyecto_final_semestre3

## 1. Propósito

La Entrega 3 fortalece el MVP mediante validaciones, manejo controlado de errores, conservación de los registros en una base de datos y pruebas. La meta es impedir que los datos inválidos creen registros incoherentes o que fallen las operaciones críticas del inventario.

## 2. Arquitectura de persistencia

La solución utiliza tres capas:

1. **Frontend:** HTML, CSS y JavaScript en `frontend/`. Presenta los formularios, muestra validaciones de campos y consume la API.
2. **Backend:** Python, Django y Django REST Framework en `backend/`. Controla autenticación, permisos, validaciones, reglas de negocio y operaciones transaccionales.
3. **Base de datos:** MySQL, configurado mediante las variables privadas de `backend/.env`. Django ORM conserva productos, categorías, movimientos, ventas, usuarios y solicitudes de ayuda.

El navegador no se conecta directamente con MySQL. Las escrituras se realizan a través de la API, de modo que los permisos y validaciones se aplican en el servidor. Las migraciones registradas para inventario son `0001_initial`, `0002_producto_fecha_caducidad_producto_lote_and_more` y `0003_solicitudayuda_mensajeayuda_venta_detalleventa`; las tres aparecían aplicadas en la evidencia local.

### Evidencia de persistencia registrada

En la verificación local se confirmó que Django conectaba a MySQL y se consultaron los siguientes conteos:

| Entidad | Registros que mostró la consulta |
|---|---:|
| Productos | 9 |
| Categorías | 6 |
| Movimientos | 10 |

Las capturas incluidas en el PDF de evidencia muestran productos recuperados en el módulo de inventario después de cerrar sesión y volver a ingresar. Para una comprobación adicional de reinicio del servicio, detener Django con `Ctrl+C`, iniciarlo otra vez contra la misma base y consultar de nuevo el registro de prueba.

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

### Observación de CP-01

La captura inicial del campo numérico mostraba que el navegador impedía escribir letras, pero el mensaje visible no era suficientemente específico. En la rama `entrega3-refinamiento` se añadió un manejador de validación de formularios para dar mensajes más claros. **La verificación visual final de este cambio debe repetirse en el navegador local después de actualizar la rama**; no se afirma que esta revisión visual se haya ejecutado en el entorno remoto.

## 4. Pruebas automatizadas

En la ejecución documentada desde el entorno local:

- `python manage.py check`: `System check identified no issues`.
- `python manage.py test inventario`: se encontraron 23 pruebas y el resultado fue `OK`.
- La suite cubre autenticación, endpoints protegidos, permisos de empleados y administradores, creación y edición de productos, movimientos, ventas con varios productos, insuficiencia de stock, categorías y centro de ayuda.
- Django creó una base de datos temporal para las pruebas y la eliminó al terminar. Esto no elimina los datos de la base de trabajo.

Estos resultados corresponden a la captura de ejecución. Repite las pruebas después de cualquier modificación local antes de presentar una nueva evidencia.

## 5. Matriz de pruebas funcionales (CP-01 a CP-10)

Los resultados abajo corresponden a las pruebas manuales documentadas en el archivo de evidencia entregado. CP-01 se registra con observación debido al mensaje poco específico observado antes del cambio de validación; debe volver a verificarse con la versión actualizada.

| Código | Caso de prueba | Datos de entrada / escenario | Resultado esperado | Resultado obtenido | Bug / corrección | Responsable |
|---|---|---|---|---|---|---|
| CP-01 | Texto en campo numérico | Intentar introducir `abc` en stock/cantidad | Rechazo del dato y mensaje claro | El navegador impedía las letras; el mensaje inicial no era específico | Se añadió validación HTML con mensajes propios (commit `5e66307`). Pendiente revalidación visual local tras actualizar | Salomón Jesús Chavarro Castañeda |
| CP-02 | Precio negativo | Precio `-100` | Rechazar precio menor que cero | La validación del campo impidió el valor negativo | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-03 | Campo obligatorio | Nombre vacío | Solicitar completar el nombre y no guardar | El formulario indicó que el campo era obligatorio | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-04 | Código duplicado | Reutilizar el código de un producto existente | Rechazar el registro duplicado | Se mostró el mensaje de código existente | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-05 | Cantidad negativa | Cantidad `-5` | Rechazar cantidad no positiva | El navegador rechazó la cantidad inválida | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-06 | Stock insuficiente | Salida de 10 cuando hay 5 unidades | Rechazar salida y conservar existencias | La API mostró “Stock insuficiente. Disponible: 5.” | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-07 | Persistencia | Registrar `PERSIST001`, cerrar sesión e ingresar otra vez | El registro debe seguir disponible | El producto volvió a aparecer después de iniciar sesión nuevamente | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-08 | Consulta de registros | Abrir Productos y buscar un registro guardado | Recuperar los datos guardados | El producto y sus campos aparecieron en el listado/formulario | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |
| CP-09 | Formato / campo inválido | Dejar un campo obligatorio sin valor | Mostrar validación y permitir corrección | El formulario indicó que el campo debía completarse | Se añadió validación HTML personalizada como mejora de claridad; revalidar con el código actualizado | Salomón Jesús Chavarro Castañeda |
| CP-10 | Eliminación | Crear registro exclusivo de prueba y eliminarlo si está permitido | Quitar el registro; conservar restricciones históricas | La interfaz solicitó confirmación y mostró mensaje de eliminación | No se reportó otra corrección | Salomón Jesús Chavarro Castañeda |

## 6. Control de versiones

Repositorio oficial: https://github.com/salomonjesuschavarrocastaneda-dev/Proyecto_final_semestre3

Para esta etapa se creó la rama `entrega3-refinamiento` a partir de `main`. Los cambios de esta rama incluyen commits separados para la validación de formularios y la documentación. El flujo recomendado del repositorio es rama de trabajo → commits descriptivos → Pull Request → revisión → merge.

Extracto de trazabilidad:
- `8f37208` — `fix: complete inventory editing and sales flow` (commit previo existente en main).
- `5e66307` — `fix: mostrar mensajes claros en validaciones de formularios`.
- Los commits de documentación agregan las instrucciones de ejecución, persistencia, pruebas y esta memoria técnica.

El archivo `.gitignore` excluye `.env`, entornos virtuales, cachés, logs y la base SQLite local. Las credenciales reales no se incluyen en Git.

## 7. Cómo ejecutar la verificación

Desde `backend/`, con el entorno virtual activo y `.env` configurado:

```powershell
python manage.py check
python manage.py test inventario
```

Para comprobar persistencia en la base de trabajo, cree un producto de prueba, compruebe que aparece en la lista, detenga el servidor con `Ctrl+C`, vuelva a iniciarlo contra la misma base de datos y consulte el producto. No ejecute este procedimiento contra una base de datos de producción ni borre registros existentes.

## 8. Conclusiones

MAGNUSSIG SIG utiliza una arquitectura de tres capas con persistencia relacional mediante Django ORM y MySQL. La evidencia local documenta conexión a MySQL, migraciones aplicadas y 23 pruebas automatizadas aprobadas. Las pruebas funcionales cubren validaciones de campos, códigos duplicados, stock insuficiente, consulta, persistencia de sesión y eliminación permitida. Se detectó una oportunidad de mejora en la claridad del mensaje al intentar escribir texto en un campo numérico y se añadió una validación HTML personalizada en la rama de entrega; la comprobación visual final debe realizarse en el navegador después de sincronizar el cambio.

La entrega debe acompañarse de las capturas de consola y de la interfaz, la matriz de pruebas y la evidencia del historial de commits en GitHub.
