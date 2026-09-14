# Reporte de correcciones — Cafetería INTESUD

Fecha: 12 de septiembre de 2026.

**Se corrigieron los siete errores del reporte inicial.** Durante la verificación integrada también se corrigieron problemas de navegación, del botón Continuar y del permiso para consultar delivery.

Los cambios y este reporte se entregan en la rama `Correcciones`. Publicar el código en GitHub no equivale a desplegar la página.

## Cambios realizados

| Hallazgo | Corrección aplicada | Resultado comprobado |
|---|---|---|
| QA-01: adicionales con cantidad incorrecta | Cada adicional se envía con la cantidad de unidades de su línea. Se normalizaron los precios numéricos al agregar productos. | Dos cafés de $2,00 con leche de $0,50 totalizan **$5,00**, tanto en el carrito como en el pedido guardado. |
| QA-02: personalizaciones sobrescritas | Cada línea se identifica por producto, adicionales y nota. Solo se combinan selecciones equivalentes. Cambiar cantidad o eliminar actúa sobre esa línea; el stock se comprueba entre todas las variantes. | Un café con leche y otro sin leche conservan sus selecciones y suman **$4,50**. |
| QA-03: DEUNA exige archivo sin permitir subirlo | Se añadió un control reutilizable para todos los métodos que requieren comprobante, incluidos los personalizados. Se valida formato y máximo de 2 MB. | DEUNA permite adjuntar un PDF y el servidor guarda el comprobante junto al pedido. |
| QA-04: métodos predeterminados inexistentes | Se eliminaron las opciones inventadas y el identificador de pago 1 usado como reemplazo. Sin métodos disponibles o con error de consulta, la confirmación queda bloqueada con un mensaje. | Lista vacía y fallo de red no generan pedidos ni ofrecen medios ficticios. |
| QA-05: historial y ventas limitados a la primera página | Se añadió una carga completa de listas paginadas y se aplicó a historiales y listas administrativas utilizadas en los cálculos. Se retiró el corte de 30 registros del historial del cliente. | **41 pedidos** accesibles en la prueba automatizada y ventas de **$205,00**. Con datos reales de prueba: **21 ventas = $105,00**. |
| QA-06: excepción al validar contraseña | Se unificó la referencia al campo de contraseña y su mensaje de error. | Contraseña vacía muestra el aviso; escribir lo elimina sin excepciones. |
| QA-07: cantidad falla con producto ausente | Se verifica la existencia y disponibilidad antes de consultar stock. Se permite eliminar la línea aunque el producto ya no esté en el catálogo cargado. | El carrito informa la indisponibilidad y no se rompe al intentar cambiar cantidad. |

## Correcciones adicionales durante la verificación

- **Delivery:** el cliente con permiso para crear pedidos puede consultar la disponibilidad. Sigue sin poder editar la configuración ni listar solicitudes de otros usuarios. La administradora conserva sus permisos de edición.
- **Navegación:** un cambio de ruta ya no dispara dos renders. Las vistas del cliente afectadas descartan respuestas tardías cuando su contenedor fue cerrado; el panel del bar comprueba que la ruta y sesión sigan vigentes antes de reemplazar la pantalla.
- **Botón Continuar:** su acción se conecta antes de esperar la actualización del indicador de capacidad, para que responda desde que se muestra.
- **Comprobantes:** cambiar de método o volver al checkout borra el archivo de la selección anterior. Un pedido exitoso limpia el archivo y la ubicación temporal.
- **QR:** se eliminó el patrón decorativo presentado como código de pago. Si falta el código configurado, se muestra un aviso.
- **Pruebas:** las suites ya fallan si falta `jsdom`, en lugar de terminar con un resultado exitoso sin probar. Se añadió la dependencia explícita que utiliza ESLint y se sincronizó el archivo de versiones.

## Validación final

| Verificación | Resultado |
|---|---|
| Cuatro suites del frontend | **115 comprobaciones aprobadas**, incluidas 29 de regresión nuevas. |
| Pruebas del backend Django | **133 pruebas y 3 subpruebas aprobadas**, incluidas cinco sobre permisos de delivery. |
| ESLint | Sin errores ni advertencias. |
| Recorrido en Edge contra Django | Acceso, compra con adicionales y comprobante, delivery al aula 1A1, historial y ventas aprobados. |
| Persistencia del pedido | Total **$5,00**, dos adicionales y comprobante guardados en la base de prueba. |
| Errores JavaScript del recorrido final | **0**. |
| Historial móvil a 390 píxeles | Sin desbordamiento horizontal en la vista comprobada. |

Se verificó también que un pedido rechazado conserva el carrito, que el doble envío se bloquea y que la paginación interrumpida no se presenta como una lista completa obtenida correctamente.

## Archivos principales modificados

- `frontend/js/cart.js`: variantes, stock, cantidades, comprobantes, métodos de pago y botón Continuar.
- `frontend/js/auth.js`: validación del acceso.
- `frontend/js/api-config.js`: consulta completa de listas paginadas, con detección de ciclos y enlaces a otro servidor.
- `frontend/js/orders.js`, `admin.js` y `devadmin.js`: historiales y listas administrativas completas.
- `frontend/js/app.js`: navegación y protección de vistas cerradas.
- `backend/apps/delivery/views.py`: permiso de lectura para checkout, sin ampliar permisos administrativos.
- `tests/frontend/qa-regressions.test.js` y `tests/backend/test_delivery_permissions.py`: regresiones nuevas.
- Suites existentes del frontend: fallo explícito ante dependencia ausente y preparación correcta del carrito en las pruebas de checkout.
- `frontend/package.json` y `package-lock.json`: ejecución de la suite nueva y dependencia explícita de ESLint.

No se cambió el esquema de la base de datos ni se necesitan migraciones nuevas por estas correcciones.

## Evidencias entregadas

- `frontend-correcciones.txt`, `backend-correcciones.txt` y `lint-correcciones.txt`: resultados de las verificaciones finales.
- `flujo-real-correcciones.txt` y `verificacion-real.json`: recorrido integrado y comprobación de persistencia.
- `corregido-checkout.png`, `corregido-confirmacion.png`, `corregido-historial-movil.png` y `corregido-ventas.png`: capturas del recorrido.
- Las pruebas permanentes se ejecutan desde `frontend` con `npm ci` y `npm test`; las del servidor, desde `backend` con `pytest` y sus dependencias instaladas. Los ejecutores de Edge dependientes del equipo local no se incluyen en esta entrega.

Los archivos de evidencia indicados se incluyen junto a este reporte. Las bases temporales, dependencias descargadas y credenciales de prueba no forman parte del commit.

## Pendientes y límites

- **Recuperación automática de contraseña:** sigue pendiente como funcionalidad nueva. El enlace actual informa que se debe contactar al administrador; no se implementó un servicio de correo.
- La validación se realizó con datos de prueba y SQLite, sin modificar datos de producción ni realizar pagos bancarios. Edge utilizó el transporte de pruebas de Playwright para comunicarse con Django debido a las restricciones de conexión local del navegador; esto no certifica CORS ni la configuración de red del despliegue.
- Falta validar la versión publicada, sus credenciales reales, PostgreSQL y concurrencia, así como la apariencia con todos sus recursos externos. Las fuentes e iconos externos se bloquearon durante el recorrido local.
- Los historiales y reportes ahora recuperan todas las páginas. Para volúmenes grandes conviene pasar los agregados de ventas al servidor y paginar la presentación del historial.

**Estado de entrega:** correcciones integradas en `Correcciones` y verificadas localmente; pendiente desplegar y validar en el entorno que utilice el equipo.
