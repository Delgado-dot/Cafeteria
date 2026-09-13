/**
 * Tests del frontend
 * Ejecutar con una herramienta como Playwright o Cypress.
 * Este archivo documenta los casos de prueba manuales/automatizados.
 */

/* ============================================================
   Página de Login
   ============================================================ */

// Caso de prueba: Login exitoso con credenciales demo
// 1. Abrir index.html
// 2. Ingresar usuario@intesud.edu.ec / estudiante123
// 3. Click en "Iniciar sesión"
// 4. Esperar redirección a la página de inicio del usuario

// Caso de prueba: Login con credenciales incorrectas
// 1. Abrir index.html
// 2. Ingresar un email inválido y una contraseña incorrecta
// 3. Click en "Iniciar sesión"
// 4. Verificar que aparezca el error en el campo correspondiente

/* ============================================================
   Menú y carrito
   ============================================================ */

// Caso de prueba: Agregar producto al carrito
// 1. Iniciar sesión como usuario
// 2. Navegar al menú
// 3. Click en "+ Agregar" de un producto
// 4. Verificar que el badge del carrito se actualice

// Caso de prueba: Agregar varios productos y ver total
// 1. Iniciar sesión
// 2. Agregar 2 o más productos con diferentes precios
// 3. Ir al carrito
// 4. Verificar que el total = suma de los precios

/* ============================================================
   Pedidos
   ============================================================ */

// Caso de prueba: Crear un pedido
// 1. Agregar productos al carrito
// 2. Ir al checkout
// 3. Seleccionar retiro en cafetería
// 4. Seleccionar método de pago
// 5. Confirmar pedido
// 6. Verificar que el pedido aparezca en "Mis pedidos"

// Caso de prueba: Cancelar un pedido en cola
// 1. Crear un pedido
// 2. Ir a "Mi pedidos"
// 3. Click en "Cancelar pedido"
// 4. Confirmar cancelación
// 5. Verificar que el pedido aparece como "Cancelado" en historial

/* ============================================================
   Panel de administración
   ============================================================ */

// Caso de prueba: Admin bar — cambiar estado de un pedido
// 1. Iniciar sesión como adminbar@intesud.edu.ec / adminbar123
// 2. Ir a "Pedidos"
// 3. Click en "Confirmar" de un pedido en cola
// 4. Verificar que el estado cambie a "Confirmado"

// Caso de prueba: Admin bar — modificar stock
// 1. Iniciar sesión como adminbar
// 2. Ir a "Stock"
// 3. Click en "+ Aumentar" de un producto
// 4. Verificar que el stock aumente en 1 y el historial se actualice

// Caso de prueba: Admin dev — crear un usuario
// 1. Iniciar sesión como developer@system.local / developer123
// 2. Ir a "Usuarios"
// 3. Click en "+ Nuevo usuario"
// 4. Llenar los campos
// 5. Click en "Crear usuario"
// 6. Verificar que aparezca en la lista

/* ============================================================
   Sesiones por pestaña (OBS-001)
   ============================================================ */

// Caso de prueba: sesiones independientes entre pestañas (roles distintos)
// 1. Abrir la pestaña A e iniciar sesión como usuario institucional
// 2. Abrir la pestaña B e iniciar sesión como administradora bar
// 3. Verificar que A sigue mostrando la interfaz de usuario y B la de adminbar

// Caso de prueba: logout aislado
// 1. Con sesión activa en A y B, cerrar sesión en A
// 2. Verificar que A vuelve al Landing y B conserva su sesión

// Caso de prueba: recarga conserva la sesión de la pestaña
// 1. Iniciar sesión en una pestaña
// 2. Recargar la pestaña
// 3. Verificar que la sesión se mantiene (sessionStorage sobrevive a la recarga)

// Caso de prueba: las claves de sesión no se comparten
// 1. Iniciar sesión en una pestaña
// 2. Verificar en DevTools que int_session, access_token y refresh_token
//    están en sessionStorage y NO en localStorage

/* ============================================================
   Responsividad
   ============================================================ */
// Caso de prueba: Menú móvil
// 1. Reducir la ventana a 390px de ancho
// 2. Verificar que aparezca la navegación inferior
// 3. Navegar entre Inicio, Menú, Carrito y Pedidos

// Caso de prueba: Admin en móvil
// 1. Iniciar sesión como adminbar
// 2. Reducir la ventana a 390px
// 3. Verificar que la sidebar se oculte y se abra con hamburguesa
