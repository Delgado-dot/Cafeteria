> Alcance de la entrega: este informe corresponde a la copia local Cafeteria-Patricio-Simba-a revisada el 8 de septiembre de 2026. Se publica en la rama iker como documentación del trabajo realizado. El código de esta rama difiere de la copia analizada; los hallazgos y referencias de líneas no constituyen una auditoría del estado actual de iker.

# Compañero 4 — Frontend ↔ Backend (@Iker)

Fecha: 8 de septiembre de 2026.

Revisión estática del código de frontend y de las rutas, vistas y serializadores Django. No se inició el servidor ni se probó una conexión real con PostgreSQL. «API implementada» significa que existen llamadas y código servidor; no certifica que el flujo funcione de extremo a extremo.

El proyecto ya tiene una integración parcial con Django REST y JWT. No corresponde clasificar login, productos o pedidos como datos mock. La FASE 4 debe completar y verificar esa integración.

## Tabla de funcionalidades

| Funcionalidad | Actualmente | Futuro / trabajo para FASE 4 |
| --- | --- | --- |
| Login | POST a Django y GET del usuario; tokens JWT y copia de sesión en localStorage. | Mantener Django como autoridad y verificar sesión, expiración y errores. |
| Registro | Alta desde administrador desarrollador mediante API. Existe registro público en Django; no se encontró formulario público de registro en frontend. | Conectar formulario público si se requiere; mantener creación y validación en Django. |
| Menú | Productos desde API; filtros en frontend; categorías fijas en CATEGORIES. | Obtener categorías desde API y resolver paginación/búsqueda. |
| Productos y adicionales | Listado y detalle desde API; Store conserva una copia en memoria. | Mantener Django como fuente de precios, disponibilidad y adicionales. |
| Carrito | localStorage, clave int_cart; cantidades, notas y total calculados en JavaScript. | Puede permanecer en frontend; Django revalida al crear el pedido. Definir limpieza o separación por usuario. |
| Checkout | Prepara POST /api/orders/ y comprobante multipart. Una llamada a capacityInfo(), sin definición encontrada, bloquea la confirmación antes del POST. | Corregir bloqueo y validar contrato completo de solicitud/respuesta. |
| Pedidos | Consulta de pedidos propios y cancelación por API; caché en memoria. | Mantener persistencia y estados en Django; verificar creación, cancelación y seguimiento. |
| Historial | Mismos pedidos de API, filtrados por estado en frontend; muestra hasta 30 de los recibidos. | Paginación para consultar todo el historial, no solo la primera respuesta. |
| Perfil del cliente | Datos iniciales de sesión; edición local sin PATCH. Guarda nombre en sesión; cargo/aula pueden perderse inmediatamente al reconstruir la vista. | GET/PATCH /api/auth/me/; mapear first_name, last_name, cargo, aula, avatar y date_joined. |
| Perfil administrador | Nombre mediante PATCH a Django y copia local; foto guardada como base64 en localStorage. | Persistir avatar en Django y refrescar datos desde /me/. |
| Cambio de contraseña | POST real a /api/auth/password/. | Verificar validación y actualizar texto de ayuda: anuncia 6 caracteres, pero se exigen 8. |
| Recuperación de contraseña | Pantalla «en desarrollo» que indica contactar al administrador. | Implementar recuperación con token/correo si está dentro del alcance. |
| Stock | Lectura/ajuste por API y controles visuales locales. Django valida y descuenta stock transaccionalmente al crear pedidos. | Mantener Django + PostgreSQL como autoridad; probar concurrencia y reposición por cancelación. |
| Pagos | Registro y revisión en Django; métodos por API con alternativas fijas de respaldo. No se encontró integración con pasarela bancaria. | Completar revisión de comprobantes; integrar proveedor solo si se requiere cobro automático. |
| Vista de comprobantes | Se puede subir archivo real en checkout, pero modal y detalle de administración muestran comprobante simulado. | Mostrar el archivo real devuelto por API. |
| Capacidad y horarios | Consulta configuración por API; capacidad usa respaldo local «disponible, 0/10» ante fallo. | Mostrar fallo de consulta y validar reglas de negocio en servidor. |
| Delivery | Configuración por API; selección piso/aula temporal en window._deliveryInfo; Django crea solicitud con el pedido. | Verificar configuración, ubicación y confirmación coherentes. |
| Administración de productos, pedidos y pagos | Lecturas y escrituras por API. | Verificar permisos, errores y resultados persistidos. |
| Usuarios administrativos | Listar, crear y editar por API. | Validar restricciones por rol y errores del alta/cambio de rol. |
| Roles y permisos | Matriz fija e informativa PERMISSION_MATRIX; conteos de usuarios desde API. | Conectar endpoints de permisos y alinear matriz con autorización real del servidor. |
| Proveedores | CRUD mediante API. | Verificar persistencia y permisos. |
| Ventas/reportes | Agregaciones JavaScript sobre respuestas de API. | Completar paginación o agregar estadísticas en Django para evitar totales parciales. |
| Auditoría | Panel consulta API; helper logAudit del frontend solo escribe en consola. | Verificar cobertura de eventos persistidos en backend. |

## Resultado de las búsquedas solicitadas

- **fetch():** centralizado en `frontend/js/api-config.js:164` y `:179`, incluyendo renovación JWT.
- **axios:** no se encontraron usos en el frontend revisado.
- **localStorage:** `access_token`, `refresh_token`, `int_session`, `int_remember`, `int_cart`, `int_admin_name_<id>` e `int_admin_photo_<id>`.
- **Store:** `frontend/js/data.js:40`. Sus métodos save/load usan localStorage, pero products, orders, users, config, audit, stockHistory y suppliers usan `_cache` en memoria. Usar Store no significa automáticamente datos falsos ni persistencia local.
- **Datos mock/simulados:** matriz de permisos (`devadmin.js:298`), vistas de comprobante (`admin.js:2004`, `:2068`) y respaldos fijos de pago/capacidad (`cart.js:91`, `:242`). El comentario «demo» en landing no demuestra datos falsos: renderLanding consulta productos por API.
- **JSON:** se usa para serializar localStorage, cuerpos HTTP y campos anidados multipart. No se encontró un archivo JSON de catálogo mock entre los archivos listados del proyecto.
- **Variables globales:** API_BASE_URL, API_ENDPOINTS, ApiClient; Store/Auth/Cart como estado compartido; window.currentUser, window._payMethod, window._payMethodDbId, window._payMethodRequiresVoucher, window._voucher y window._deliveryInfo. Las últimas conservan selección temporal del checkout, no persistencia en Django.
- **sessionStorage:** int_search e int_cat, para trasladar búsqueda y categoría entre pantallas.

## Pendientes prioritarios y evidencia

1. **Desbloquear confirmación:** `cart.js:480` llama a capacityInfo(), sin definición encontrada en frontend; existe fetchCapacityInfo() asíncrona en `cart.js:70`. La llamada ocurre antes del try y del POST.
2. **Alinear confirmación con respuesta Django:** `cart.js:536` pasa la respuesta sin transformar a renderConfirmation (`:548`), que espera prepMin, delivery, deliveryInfo y payment. OrderSerializer devuelve estimated_time, delivery_method, delivery_info y payment_status; no expone ahí el método de pago. Usar order_number para el número visible y acordar el campo de método de pago.
3. **Alinear cantidades de adicionales:** Cart.total incluye adicional por cada unidad del producto, pero `cart.js:497` envía quantity: 1 por adicional. Django cobra según esa cantidad. Con varios productos, el total local puede diferir del total persistido.
4. **Conectar edición del perfil:** `orders.js:290–298` modifica objetos locales y Auth.set, sin petición HTTP. El backend ya permite PATCH /api/auth/me/ con SelfUserUpdateSerializer.
5. **Eliminar selecciones de pago inventadas:** `cart.js:242` mantiene métodos fijos cuando la API falla o devuelve lista vacía; `:493` usa el ID 1 cuando falta dbId. Bloquear confirmación sin un método activo obtenido del servidor.
6. **Completar comprobantes:** `admin.js:1987` y el detalle posterior consultan datos reales pero dibujan un recibo simulado. Conectar el archivo real y su acceso.
7. **Resolver paginación:** Django configura páginas de 20 elementos (`backend/core/cafeteria/settings.py:208`). apiList extrae results, pero no recorre next. Menú, historial y reportes pueden quedar parciales.
8. **Configurar despliegue:** api-config.js fija localhost:8000 para localhost/127.0.0.1 y un dominio HTTPS para cualquier otro host. Ajustar entorno y CORS; revisar servicio de archivos multimedia. PostgreSQL está configurado por defecto en settings.py, pero no se verificó una base activa.
9. **Conectar categorías y permisos:** categorías fijas en data.js:6 y matriz fija en :25. Django ya ofrece /api/products/categories/ y /api/auth/permissions/; comprobar además que las reglas del servidor coincidan con lo presentado.

## Contratos que necesita frontend

| Área | Contrato existente a utilizar |
| --- | --- |
| Autenticación | POST /api/auth/login/ → access/refresh; GET/PATCH /api/auth/me/; POST /api/auth/refresh/. |
| Registro | POST /api/auth/register/ con username, email, password y datos personales → user/access/refresh. |
| Catálogo | GET /api/products/, /api/products/{id}/ y /api/products/categories/; convertir decimales a número y mapear description/prep_time/min_stock. |
| Compra | POST /api/orders/ con items[{product_id, quantity, addons, note}], delivery_method, payment_method y delivery_info cuando corresponda; FormData si hay voucher. |
| Seguimiento | GET /api/orders/mine/, GET/PATCH /api/orders/{id}/; conservar id técnico separado de order_number. |
| Administración | /api/orders/all/, /api/payments/all/, PATCH /api/payments/{id}/review/, /api/stock/movements/, /api/suppliers/ y /api/auth/users/. |

La aceptación de FASE 4 debería comprobar que un pedido se guarda, descuenta stock y aparece en otra sesión; que los cambios de perfil sobreviven a un nuevo login; que los errores no se presentan como datos vacíos o simulados; y que totales, permisos y comprobantes coinciden con Django. Esta entrega documenta los hallazgos; no modifica la aplicación.

