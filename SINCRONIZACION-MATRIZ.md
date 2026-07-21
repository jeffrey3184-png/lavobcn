# 📊 Matriz de Sincronización — LavoBCN

**Fecha:** 13 julio 2026
**Propósito:** diagnóstico completo del estado de sincronización de cada módulo, antes de corregir módulo por módulo. **Sin cambios de código en este documento.**

**Leyenda de tiempo real:** ✅ Sí (listener onValue) · 🟡 Parcial (Firebase autoritativo pero sin listener en vivo) · ❌ No (polling o refresco manual).

---

## Tabla resumen

| Módulo | Escribe en Firebase | Lee de Firebase | localStorage (datos negocio) | onValue / fetch | Tiempo real iPhone·Android·PC | Prioridad |
|--------|--------------------|-----------------|------------------------------|-----------------|-------------------------------|-----------|
| **Cliente** (cliente.html) | pedidos, perfiles, clientes_docs, soporte_chat, tokens | su pedido (estado), soporte_chat, clientes_docs | `lavobcn_as_cliente` (estado de navegación) | ❌ fetch + 6 polling | ❌ No (polling ~5 s) | **Media** |
| **Personal de Lavandería** (admin-clientes.html) | clientes_corporativos | clientes_corporativos | — (ninguno) | ✅ onValue (1) | ✅ **Sí** | **Baja** (ya hecho) |
| **Despacho** (despacho.html) | despachos, autosave, clientes_corporativos | despachos, autosave, clientes_corporativos | `lavobcn_as_despacho` (viajes/rutas) | ❌ fetch (sin listener) | 🟡 Parcial (CAMBIO 6) | **Alta** |
| **Rider** (rider.html) | pedidos, despachos, viajes, riders_estado, rider_eventos, riders_docs, autosave, tokens | pedidos, despachos, viajes | `lavobcn_as_rider` (estado trabajo) | ❌ fetch + 10 polling | ❌ No (polling 2 s + push FCM) | **Alta** |
| **Administración** (admin.html) | kpi_params, (asigna a despachos) | despachos, pedidos, riders_estado, rider_eventos, viajes, soporte_chat, kpi_params | — (solo sesión/preferencias) | ❌ fetch (refresco **manual**) | ❌ No (hay que recargar) | **Alta** |
| **Worker** (Cloudflare lavo-notificador) | — (no escribe en Firebase) | tokens (para push); **teléfono WhatsApp fijo en código** | — | N/A (emisor HTTP) | N/A | **Alta** (Fase 3, tras sync) |

---

## Detalle por módulo

### 1. Cliente (cliente.html) — Prioridad Media
- **Escribe:** el pedido en `/pedidos` (lavandería, moto, mensajería), su perfil, documentos, mensajes de soporte, token push.
- **Lee:** el estado de su propio pedido (por polling ~5 s), soporte, documentos.
- **localStorage:** `lavobcn_as_cliente` guarda el estado de navegación (qué pantalla, selecciones) — **no** son pedidos confirmados (esos van a Firebase). Aceptable, pero conviene que el seguimiento del pedido sea en vivo.
- **Problema:** el cliente ve el avance de su pedido (Recogida → ... → Entregado) con retraso de segundos.
- **Corrección propuesta:** listener `onValue` sobre **su** pedido (`pedidos/{ref}`) — muy ligero.

### 2. Personal de Lavandería (admin-clientes.html) — Prioridad Baja (YA HECHO)
- **Escribe/Lee:** `clientes_corporativos` con listener `onValue`.
- **localStorage:** ninguno.
- **Estado:** ✅ ya sincroniza en tiempo real en iPhone/Android/PC. **Es el modelo a replicar.**
- **Acción:** solo verificar en pruebas (no requiere cambios).

### 3. Despacho (despacho.html) — Prioridad Alta
- **Escribe:** rutas en `/despachos`, autosave, clientes permanentes.
- **Lee:** despachos, autosave, clientes.
- **localStorage:** `lavobcn_as_despacho` (viajes/rutas). Tras CAMBIO 6, Firebase es autoritativo, pero **no hay listener en vivo**: los cambios de otro dispositivo solo se ven al recargar.
- **Corrección propuesta:** listener `onValue` sobre `/despachos` (y el autosave) para tablero en vivo; después, quitar localStorage como fuente (dejarlo solo caché).

### 4. Rider (rider.html) — Prioridad Alta
- **Escribe:** estados de pedido, aceptación de viajes, su estado, eventos, documentos, token.
- **Lee:** `/pedidos` y `/despachos` por **polling cada 2 s** (pedidos nuevos), viajes asignados cada 15 s.
- **localStorage:** `lavobcn_as_rider` (estado de trabajo; Firebase también lo tiene), caché de ganancias.
- **Problema:** polling de 2 s = ~30 lecturas/min por rider (coste + hasta 2 s de latencia). El push FCM cubre la app cerrada, pero la lista en vivo depende del polling.
- **Corrección propuesta:** listener `onValue` **acotado** (`pedidos` con `estado='pendiente'`, índice ya existe) para pedidos nuevos y estados; mantener push FCM y sonido/vibración.

### 5. Administración (admin.html) — Prioridad Alta
- **Escribe:** parámetros KPI; puede asignar viajes.
- **Lee:** despachos, pedidos, estados de riders, eventos, soporte — **con refresco manual** (hay que recargar).
- **localStorage:** solo sesión y preferencias ✅.
- **Problema:** el panel **no se actualiza solo**; el admin no ve pedidos ni estados en vivo.
- **Corrección propuesta:** listeners `onValue` sobre pedidos/despachos/riders_estado, reutilizando las funciones de pintado actuales (acotados con `limitToLast`).

### 6. Worker de Cloudflare (lavo-notificador) — Prioridad Alta (Fase 3)
- **Función actual:** `/enviar` (push FCM leyendo `/tokens`) y `/whatsapp` (WhatsApp con **número fijo en el código**).
- **No escribe en Firebase**; es un emisor disparado por HTTP desde las apps.
- **Problema clave:** el teléfono está fijo → no escala al crecer el equipo.
- **Corrección propuesta (Fase 3, después de la sync):** que el Worker lea los riders desde Firebase (`nombre, teléfono, token FCM, Telegram ID, activo`) y envíe: si el pedido no tiene rider asignado → a todos los activos; si lo tiene → solo a ese. Así se convierte en el centro de comunicaciones (push + WhatsApp + Telegram + email preparado).
- **Nota:** necesito el código actual del Worker para auditarlo; con él, propongo la nueva versión.

---

## Orden de corrección (acordado)

1. ✅ **Auditoría completa de sincronización** ← este documento
2. ⬜ **Despacho** — listener onValue en `/despachos`
3. ⬜ **Rider** — listener onValue acotado en `/pedidos` (pedidos nuevos + estados)
4. ⬜ **Administración** — listeners onValue (panel en vivo)
5. ⬜ **Cliente** — listener onValue sobre su pedido
6. ⬜ **Personal de Lavandería** — verificar (ya hecho)
7. ⬜ **Worker** — leer riders de Firebase (requiere su código)
8. ⬜ **WhatsApp** — números dinámicos + a rider asignado / a todos
9. ⬜ **Telegram** — como canal más, sobre el mismo motor

Cada módulo se corregirá con **su propia checklist de pruebas** (iPhone, Android, PC) y se validará antes de pasar al siguiente.

---

## Objetivo de la meta intermedia (antes de Telegram)

```
Pedido entra → se guarda en Firebase → todos los dispositivos lo ven (onValue)
            → el Worker envía Push → el Worker envía WhatsApp
```

Cuando esto funcione al 100 %, Telegram se añade como **un canal más** sobre el mismo motor de notificaciones (no un sistema nuevo).

---

## Resumen del diagnóstico

- **1 de 6 módulos** sincroniza en tiempo real (Personal de Lavandería). Es el modelo.
- **Despacho:** parcial (Firebase autoritativo, falta listener en vivo).
- **Rider y Administración:** los más urgentes — polling costoso (rider) y refresco manual (admin) sobre pedidos y estados.
- **Cliente:** funciona, pero el seguimiento del pedido va con retraso.
- **Worker:** clave para la Fase 3; número de WhatsApp fijo es el cuello de botella para crecer.
- **localStorage:** ya **no es fuente de verdad** de pedidos/clientes; los restos (autosave de despacho/rider) quedarán como caché al poner los listeners.
```
