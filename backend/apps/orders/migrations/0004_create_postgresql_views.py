from django.db import migrations


# SQL de las 8 vistas PostgreSQL
CREATE_VIEWS_SQL = [
    """
    CREATE OR REPLACE VIEW vw_productos_disponibles AS
    SELECT
        p.id,
        p.name AS producto,
        c.name AS categoria,
        p.description AS descripcion,
        p.price AS precio,
        p.stock,
        p.min_stock AS stock_minimo,
        p.prep_time AS tiempo_preparacion,
        p.image AS imagen
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.category_id
    WHERE p.available = TRUE;
    """,
    """
    CREATE OR REPLACE VIEW vw_stock_bajo AS
    SELECT
        p.id,
        p.name AS producto,
        c.name AS categoria,
        p.stock,
        p.min_stock AS stock_minimo,
        p.min_stock - p.stock AS faltante,
        p.available AS disponible
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.category_id
    WHERE p.stock <= p.min_stock;
    """,
    """
    CREATE OR REPLACE VIEW vw_pedidos_activos AS
    SELECT
        pe.id,
        pe.order_number AS numero_pedido,
        pe.status AS estado,
        pe.priority AS prioridad,
        pe.delivery_method AS tipo_entrega,
        pe.total,
        pe.estimated_time AS tiempo_estimado,
        pe.created_at AS fecha_pedido,
        u.id AS usuario_id,
        TRIM(BOTH FROM CONCAT_WS(
            ' ',
            NULLIF(u.first_name, ''),
            NULLIF(u.last_name, '')
        )) AS cliente,
        u.username
    FROM pedidos pe
    LEFT JOIN usuarios u ON u.id = pe.user_id
    WHERE pe.status IN ('confirmed', 'queue', 'prep', 'ready');
    """,
    """
    CREATE OR REPLACE VIEW vw_ventas_diarias AS
    SELECT
        DATE(created_at AT TIME ZONE 'America/Guayaquil') AS fecha,
        COUNT(*) AS pedidos_entregados,
        SUM(total) AS total_vendido,
        ROUND(AVG(total), 2) AS promedio_por_pedido
    FROM pedidos pe
    WHERE status = 'delivered'
    GROUP BY DATE(created_at AT TIME ZONE 'America/Guayaquil')
    ORDER BY DATE(created_at AT TIME ZONE 'America/Guayaquil') DESC;
    """,
    """
    CREATE OR REPLACE VIEW vw_resumen_pagos AS
    SELECT
        pa.id AS pago_id,
        pe.order_number AS numero_pedido,
        pa.status AS estado_pago,
        pa.amount AS monto,
        mp.name AS metodo_pago,
        mp.code AS codigo_metodo,
        pa.transaction_id AS transaccion,
        pa.voucher AS comprobante,
        pa.created_at AS fecha_pago,
        pa.reviewed_at AS fecha_revision,
        u.id AS usuario_id,
        TRIM(BOTH FROM CONCAT_WS(
            ' ',
            NULLIF(u.first_name, ''),
            NULLIF(u.last_name, '')
        )) AS cliente
    FROM pagos pa
    LEFT JOIN pedidos pe ON pe.id = pa.order_id
    LEFT JOIN metodos_pago mp ON mp.id = pa.payment_method_id
    LEFT JOIN usuarios u ON u.id = pa.user_id;
    """,
    """
    CREATE OR REPLACE VIEW vw_detalle_pedidos AS
    SELECT
        dp.id AS detalle_id,
        pe.id AS pedido_id,
        pe.order_number AS numero_pedido,
        pe.status AS estado_pedido,
        dp.product_id AS producto_id,
        dp.product_name AS producto,
        dp.quantity AS cantidad,
        dp.unit_price AS precio_unitario,
        dp.quantity * dp.unit_price AS subtotal,
        dp.note AS observacion,
        pe.created_at AS fecha_pedido
    FROM detalle_pedidos dp
    JOIN pedidos pe ON pe.id = dp.order_id;
    """,
    """
    CREATE OR REPLACE VIEW vw_movimientos_inventario AS
    SELECT
        mi.id AS movimiento_id,
        mi.product_id AS producto_id,
        p.name AS producto,
        mi.movement_type AS tipo_movimiento,
        mi.quantity AS cantidad,
        mi.previous_stock AS stock_anterior,
        mi.new_stock AS stock_nuevo,
        mi.new_stock - mi.previous_stock AS variacion,
        mi.reason AS motivo,
        mi.reference AS referencia,
        mi.created_at AS fecha_movimiento,
        mi.user_id AS usuario_id,
        TRIM(BOTH FROM CONCAT_WS(
            ' ',
            NULLIF(u.first_name, ''),
            NULLIF(u.last_name, '')
        )) AS responsable,
        u.username
    FROM movimientos_inventario mi
    JOIN productos p ON p.id = mi.product_id
    LEFT JOIN usuarios u ON u.id = mi.user_id;
    """,
    """
    CREATE OR REPLACE VIEW vw_productos_proveedores AS
    SELECT
        pp.id AS relacion_id,
        p.id AS producto_id,
        p.name AS producto,
        pr.id AS proveedor_id,
        pr.name AS proveedor,
        pr.contact_name AS contacto,
        pr.phone AS telefono,
        pr.email,
        pp.supplier_code AS codigo_proveedor,
        pp.cost_price AS costo,
        p.price AS precio_venta,
        p.price - pp.cost_price AS margen_estimado,
        pp.is_primary AS proveedor_principal,
        pp.active AS relacion_activa,
        pr.active AS proveedor_activo,
        pp.created_at AS fecha_registro,
        pp.updated_at AS fecha_actualizacion
    FROM productos_proveedores pp
    JOIN productos p ON p.id = pp.product_id
    JOIN proveedores pr ON pr.id = pp.supplier_id;
    """,
    """
    CREATE OR REPLACE VIEW vw_delivery_pedidos AS
    SELECT
        sd.id AS solicitud_delivery_id,
        pe.id AS pedido_id,
        pe.order_number AS numero_pedido,
        pe.status AS estado,
        pe.delivery_method AS metodo_entrega,
        pe.total,
        sd.piso,
        sd.aula,
        pe.estimated_time AS tiempo_estimado,
        pe.user_id AS usuario_id,
        TRIM(BOTH FROM CONCAT_WS(
            ' ',
            NULLIF(u.first_name, ''),
            NULLIF(u.last_name, '')
        )) AS cliente,
        u.username,
        sd.created_at AS fecha_solicitud,
        pe.created_at AS fecha_pedido
    FROM solicitudes_delivery sd
    JOIN pedidos pe ON pe.id = sd.order_id
    LEFT JOIN usuarios u ON u.id = pe.user_id;
    """,
    """
    CREATE OR REPLACE VIEW vw_historial_estados_pedidos AS
    SELECT
        he.id AS historial_id,
        pe.id AS pedido_id,
        pe.order_number AS numero_pedido,
        he.status AS estado_registrado,
        pe.status AS estado_actual,
        he.changed_at AS fecha_cambio,
        he.note AS observacion,
        he.changed_by_id AS cambiado_por_id,
        TRIM(BOTH FROM CONCAT_WS(
            ' ',
            NULLIF(u.first_name, ''),
            NULLIF(u.last_name, '')
        )) AS cambiado_por,
        u.username AS usuario_responsable
    FROM historial_estado_pedidos he
    JOIN pedidos pe ON pe.id = he.order_id
    LEFT JOIN usuarios u ON u.id = he.changed_by_id;
    """,
]

DROP_VIEWS_SQL = [
    "DROP VIEW IF EXISTS vw_productos_disponibles;",
    "DROP VIEW IF EXISTS vw_stock_bajo;",
    "DROP VIEW IF EXISTS vw_pedidos_activos;",
    "DROP VIEW IF EXISTS vw_ventas_diarias;",
    "DROP VIEW IF EXISTS vw_resumen_pagos;",
    "DROP VIEW IF EXISTS vw_detalle_pedidos;",
    "DROP VIEW IF EXISTS vw_movimientos_inventario;",
    "DROP VIEW IF EXISTS vw_productos_proveedores;",
    "DROP VIEW IF EXISTS vw_delivery_pedidos;",
    "DROP VIEW IF EXISTS vw_historial_estados_pedidos;",
]


def create_views(apps, schema_editor):
    """Crea las vistas solo en PostgreSQL."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for sql in CREATE_VIEWS_SQL:
        schema_editor.execute(sql)


def drop_views(apps, schema_editor):
    """Elimina las vistas solo en PostgreSQL."""
    if schema_editor.connection.vendor != "postgresql":
        return
    for sql in DROP_VIEWS_SQL:
        schema_editor.execute(sql)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_admindev_full_access"),
        ("products", "0002_alter_addon_table_alter_category_table_and_more"),
        ("orders", "0003_alter_order_status"),
        ("payments", "0002_alter_payment_table"),
        ("config", "0006_cafeconfig_home_card_images"),
        ("stock", "0002_alter_stockmovement_table"),
        ("suppliers", "0002_alter_productsupplier_table_alter_supplier_table"),
        ("delivery", "0002_alter_deliveryconfig_table_and_more"),
    ]

    operations = [
        migrations.RunPython(create_views, reverse_code=drop_views),
    ]
