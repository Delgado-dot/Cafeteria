"""
Catálogo central de permisos por código.
Única fuente de verdad para RolePermission.code.
No depende del frontend.
"""

PERMISSIONS_CATALOG = {
    # Usuario institucional
    "products.view": "Ver catálogo de productos",
    "orders.create": "Crear pedidos propios",
    "orders.view_own": "Ver pedidos propios",
    "orders.cancel_own": "Cancelar pedidos propios",
    "payments.create": "Crear pagos propios",
    "payments.view_own": "Ver pagos propios",
    "profile.view": "Ver perfil propio",
    "profile.edit": "Editar perfil propio",
    # Administradora bar
    "products.create": "Crear productos",
    "products.edit": "Editar productos",
    "products.delete": "Eliminar productos",
    "orders.view_all": "Ver todos los pedidos",
    "orders.change_status": "Cambiar estado de pedidos",
    "stock.view": "Ver stock",
    "stock.edit": "Editar stock",
    "payments.view_all": "Ver todos los pagos",
    "payments.review": "Revisar comprobantes de pago",
    "delivery.view": "Ver delivery",
    "delivery.edit": "Editar delivery",
    "suppliers.view": "Ver proveedores",
    "suppliers.create": "Crear proveedores",
    "suppliers.edit": "Editar proveedores",
    "suppliers.delete": "Eliminar proveedores",
    "reports.view": "Ver reportes de ventas",
    "config.view": "Ver configuración de cafetería",
    "config.edit": "Editar configuración de cafetería",
    # Admin desarrollador
    "users.view": "Ver usuarios",
    "users.create": "Crear usuarios",
    "users.edit": "Editar usuarios",
    "users.disable": "Desactivar/activar usuarios",
    "roles.view": "Ver roles y permisos",
    "roles.edit": "Editar roles y permisos",
    "audit.view": "Ver auditoría",
}

# Valid roles
VALID_ROLES = {"user", "adminbar", "admindev"}

# Permisos por rol por defecto (semilla)
DEFAULT_ROLE_PERMISSIONS = {
    "user": [
        "products.view",
        "orders.create",
        "orders.view_own",
        "orders.cancel_own",
        "payments.create",
        "payments.view_own",
        "profile.view",
        "profile.edit",
    ],
    "adminbar": [
        "products.view",
        "products.create",
        "products.edit",
        "products.delete",
        "orders.view_all",
        "orders.change_status",
        "stock.view",
        "stock.edit",
        "payments.view_all",
        "payments.review",
        "delivery.view",
        "delivery.edit",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.delete",
        "reports.view",
        "config.view",
        "config.edit",
        "profile.view",
        "profile.edit",
    ],
    "admindev": [
        "users.view",
        "users.create",
        "users.edit",
        "users.disable",
        "roles.view",
        "roles.edit",
        "audit.view",
        "config.view",
        "config.edit",
        "profile.view",
        "profile.edit",
        "products.view",
    ],
}
