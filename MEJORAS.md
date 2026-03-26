# Análisis de Mejoras — CRM/ERP DR Polarizados

> Empresa importadora y distribuidora de films de polarizado (automotriz, arquitectónico, PPF).
> Pipeline core: **Importación → Stock → Presupuesto → Venta → Cobro**

---

## 🔴 ALTA PRIORIDAD — Core de una Importadora

### 1. Gestión de Proveedores y Órdenes de Compra -- HECHO

**El gap más crítico.** No existe ningún modelo para proveedores ni compras.

Hoy el campo `cost` del producto es un número estático que nadie actualiza. Una importadora necesita:

- **Modelo `Supplier`**: nombre, país de origen, contacto, moneda de facturación, lead time (días)
- **Modelo `PurchaseOrder`**: proveedor, fecha, estado (`DRAFT` / `SENT` / `CONFIRMED` / `RECEIVED`), items con costo unitario en moneda de origen, tipo de cambio al momento, costo total ARS/USD
- **Modelo `PurchaseOrderItem`**: producto, cantidad, costo FOB, costo landed (con flete + aduana + impuestos)
- **Actualización automática de `cost`** en el producto cuando se recibe una OC

**Beneficio directo:** saber exactamente cuánto costó cada lote que entra al depósito y calcular márgenes reales.

---

### 2. Costo de Importación y Precio Landed

Actualmente no hay registro de los costos adicionales a la compra FOB:

| Concepto | Descripción |
|---|---|
| Flete internacional | Marítimo o aéreo hasta el país |
| Despacho de aduana | Honorarios del despachante |
| Aranceles e impuestos | IVA importación, tasas estadísticas, etc. |
| Flete local | Del puerto/aduana al depósito |

Sin esto, el campo `cost` del producto nunca refleja el costo real y **el margen de ganancia es incorrecto**.

Se necesita un modelo `ImportCost` asociado a una `PurchaseOrder`, con campos por tipo de gasto y distribución prorrateada entre los productos del embarque.

---

### 3. Movimientos de Stock (Trazabilidad)

Hoy el stock es un número que sube y baja sin historia. Problemas:
- No se puede saber por qué bajó el stock
- No hay auditoría posible
- No se pueden detectar pérdidas o errores de carga

**Modelo `StockMovement` sugerido:**

```
tipo:         ENTRADA | SALIDA | AJUSTE | DEVOLUCION
productoId
cantidad
stockAntes
stockDespues
referenciaId  (saleId / purchaseOrderId / adjustmentId)
motivo
userId
createdAt
```

Esto también habilita **FIFO** para valorización de inventario.

---

### 4. Tipo de Cambio en Transacciones

La cotización del dólar se consulta en tiempo real pero **no se guarda en ninguna transacción**. En 6 meses no se sabrá a qué dólar se vendió o compró cada operación.

- Guardar `exchangeRate` en `Sale`, `Quote` y `PurchaseOrder`
- Guardar `currency` (`ARS` / `USD`) en cada transacción
- Dashboard histórico: ventas en dólares constantes vs nominales

---

### 5. Margen de Ganancia por Producto y Venta

Con el `cost` y los precios de venta ya existe la data, pero no hay ninguna pantalla que calcule rentabilidad. Para una importadora esto es información clave:

- **Margen por producto:** `(precio - costo_landed) / precio * 100`
- **Margen por venta:** considerando descuentos aplicados
- **Rentabilidad por cliente:** qué clientes son más rentables
- **Rentabilidad por categoría:** AUTOMOTIVE vs PPF vs ARCHITECTURAL

---

## 🟡 MEDIA PRIORIDAD — Operativa diaria

### 6. Gestión de Lotes de Importación

Cada embarque llega en un contenedor con su propio costo. Hoy no hay forma de saber si un rollo de film corresponde a la importación de enero o de marzo (con distintos costos).

- **Modelo `ImportBatch`**: número de contenedor, fecha de arribo, proveedor, estado
- Asociar cada ingreso de stock a un lote específico
- Habilita FIFO real y trazabilidad ante reclamos o garantías

---

### 7. Devoluciones y Garantías

No existe ningún modelo de devolución. Cuando un instalador devuelve film defectuoso:
- No hay cómo registrarlo
- El stock no se repone automáticamente
- No hay historial del problema ni de la solución

**Modelo `Return` sugerido:** referencia a venta, items devueltos, motivo (`DEFECTO` / `ERROR_PEDIDO` / `CAMBIO`), estado, reposición automática de stock, generación de nota de crédito.

---

### 8. Lista de Precios por Tipo de Cliente

Para una distribuidora con múltiples canales de venta:

| Tipo | Descripción |
|---|---|
| Precio público | Usuario final / minorista |
| Precio instalador | Descuento para instaladores |
| Precio distribuidor | Mayor descuento, mayor volumen |
| Precio exportación | Para clientes en el exterior |

Hoy existen los `PriceTier` por volumen pero no por categoría de cliente. Se necesita asociar un `priceListId` al `Contact` para que los precios se apliquen automáticamente al crear presupuestos.

---

### 9. Ventas en Consignación Completas

El `SaleType.CONSIGNMENT` existe en el schema pero está incompleto. Una venta en consignación necesita:

- Fecha de vencimiento del período de consignación
- Proceso de liquidación (qué vendió el consignatario)
- Devolución del remanente
- **No debería decrementar stock hasta la liquidación** (bug actual)

---

### 10. Reportes y Exportación

Los datos están pero no hay forma de exportarlos ni visualizarlos en detalle:

- **Export a Excel/CSV:** ventas, stock actual, deudas por cobrar
- **Reporte de ventas por período** con comparativa al mes anterior
- **Reporte de rotación de inventario:** qué productos se mueven más/menos
- **Reporte de cobranzas:** estado de cuenta detallado por cliente
- **Reporte de rentabilidad:** ganancia bruta y neta por período

---

## 🟢 VALOR AGREGADO — Diferenciación

### 11. Características Técnicas del Film

El film polarizado tiene atributos clave que el sistema no modela:

| Campo | Descripción |
|---|---|
| VLT % | Visible Light Transmission (luminosidad que pasa) |
| IRR % | Infrared Rejection (rechazo de calor) |
| TSER % | Total Solar Energy Rejected |
| Presentación | Rollo de X metros lineales |

Actualmente `width` y `length` existen como campos pero no hay lógica de venta por metro lineal. El film se compra y vende por metro, no por unidad.

---

### 12. Gestión de Instalaciones

Si DR Polarizados también coordina o hace instalaciones:

- **Modelo `Installation`:** cliente, producto usado, metros instalados, instalador, vehículo/propiedad, fecha, número de garantía
- Vinculado a la venta
- Historial por vehículo o domicilio
- Control de garantías vigentes

---

### 13. Portal B2B para Distribuidores e Instaladores

Los instaladores/distribuidores podrían acceder a:
- Su cuenta corriente y estado de deuda
- Descarga de presupuestos y facturas propias
- Disponibilidad de stock en tiempo real
- Hacer pedidos directamente sin intermediario

---

### 14. Alertas Automáticas Inteligentes

- **Stock mínimo alcanzado** → generar automáticamente una orden de compra sugerida al proveedor
- **Deuda > N días sin pago** → notificar al vendedor asignado
- **Presupuesto próximo a vencer** → recordatorio automático al cliente
- **Costo de importación subió > 10%** → alerta para revisar precios de venta

---

## Resumen y hoja de ruta sugerida

```
Fase 1 — Fundamentos (core importadora)
  ├── Proveedores + Órdenes de Compra
  ├── Costos de importación (precio landed)
  └── Movimientos de stock (trazabilidad)

Fase 2 — Finanzas y operativa
  ├── Tipo de cambio en transacciones
  ├── Márgenes y rentabilidad
  ├── Lotes de importación
  └── Devoluciones

Fase 3 — Comercial
  ├── Lista de precios por tipo de cliente
  ├── Consignación completa
  ├── Reportes y exportación
  └── Características técnicas del film (VLT, IRR)

Fase 4 — Diferenciación
  ├── Gestión de instalaciones
  ├── Portal B2B para distribuidores
  └── Alertas automáticas inteligentes
```

---

*Generado el 2026-03-26 — basado en análisis del código fuente del proyecto.*
