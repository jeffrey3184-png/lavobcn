# 🏛️ ARQUITECTURA DEFINITIVA — LavoBCN

**Fecha:** 13 julio 2026
**Propósito:** definir la arquitectura única y definitiva del proyecto: un motor de pedidos, un sistema de estados, un sistema de notificaciones y un modelo de datos, para TODOS los servicios.
**Regla:** este documento es diseño. No añade funciones nuevas; describe cómo unificar lo que ya existe.

---

## 1. Principio central

> **Todo pedido, de cualquier servicio, es un registro en `/pedidos` con un campo `tipo`.**
> Un solo nodo. Un solo motor. Un solo flujo de estados. Un solo sistema de avisos.

```
Cliente / Hotel / Empresa / WhatsApp / Telegram
                    │
                    ▼
        MOTOR ÚNICO crearPedido(tipo, datos)
                    │
                    ▼
              Firebase /pedidos
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      Rider      Despacho     Admin
        │
        ▼
   Notificaciones (App · WhatsApp · Telegram · Email)
```

---

## 2. Modelo de datos único (nodo `/pedidos/{ref}`)

**Campos comunes (todos los servicios):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ref` | texto | Identificador único del pedido |
| `tipo` | texto | lavanderia · moto · mensajeria · comida · farmacia · amazon · flores · supermercado |
| `estado` | texto | Estado actual (ver sección 3) |
| `local` | texto | Origen/comercio (lo que lee el rider) |
| `dir` | texto | Dirección de entrega |
| `tel` | texto | Teléfono del cliente |
| `total` | texto/número | Importe |
| `codigo` | texto | Código de entrega (2 dígitos) |
| `nota` | texto | Observaciones |
| `ts` | número | Fecha/hora de creación |
| `origen_canal` | texto | app · whatsapp · telegram · despacho (de dónde vino) |
| `riderKey` | texto | Rider asignado (vacío = sin asignar) |

**Campos específicos por tipo (opcionales, solo si aplican):**

| Servicio | Campos extra |
|----------|--------------|
| Lavandería | `lavanderia`, `servicio`, `prendas` |
| Moto Taxi | `origen`, `destino` |
| Mensajería | `origen`, `destino`, `receptor` |
| Comida / Compras | `items` (lista de productos), `comercio` |
| Hoteles/Empresas | `accion` (Recoger/Llevar), `dest`, `refRuta` |

**Regla de oro:** los campos comunes SIEMPRE presentes; los específicos se añaden según el tipo. El rider y el admin leen los comunes; cada vista muestra los extra que necesite.

---

## 3. Sistema de estados único

**Estados generales (todos los servicios):**

```
pendiente → aceptado → en_camino → entregado
     │
     ├→ rechazado
     └→ cancelado
```

**Sub-estados de lavandería** (entre `aceptado` y `en_camino`, solo tipo=lavanderia):

```
recogida → lavando → secando → planchando → listo
```

| Estado | Significado | Aplica a |
|--------|-------------|----------|
| pendiente | Creado, esperando rider | Todos |
| aceptado | Rider lo tomó | Todos |
| recogida→listo | Proceso en lavandería | Solo lavandería |
| en_camino | Rider lleva al cliente | Todos |
| entregado | Completado | Todos |
| rechazado | Rider lo rechazó (vuelve a la cola) | Todos |
| cancelado | Anulado | Todos |

**Diseño:** un único campo `estado`. Los servicios que no usan los sub-estados de lavandería pasan directo de `aceptado` a `en_camino`.

---

## 4. Motor de pedidos único

**Concepto:** una sola función lógica de creación, `crearPedido(tipo, datos)`, que:
1. Genera `ref` y `codigo`.
2. Construye el objeto con los campos comunes + los específicos del `tipo`.
3. Escribe en `/pedidos/{ref}` con `estado:'pendiente'`.
4. Dispara las notificaciones (sección 5).

**Estado actual:** hoy cada servicio tiene su propia función (`confirmarPedidoLavanderia`, `confirmarMoto`, `confirmarMensajeria`) que hace lo mismo por separado. La arquitectura definitiva las unifica en una sola.

**Dónde debería vivir:** en un módulo compartido `/core/pedidos.js`, cargado por cliente.html y despacho.html, para que ambos llamen a la MISMA función (fin de la duplicación).

---

## 5. Sistema de notificaciones único (el Worker como centro)

**Concepto:** el Worker de Cloudflare es el único emisor. Recibe un evento y decide los canales.

```
crearPedido() → POST al Worker /notificar
                      │
      ┌───────────────┼───────────────┬──────────────┐
      ▼               ▼               ▼              ▼
   App (Push FCM)  WhatsApp        Telegram        Email
   ✅ existe       ✅ existe (nº    🟡 bot existe   ❌ estructura
                   fijo→dinámico)  falta conectar  pendiente
```

**Regla de destino (Fase WhatsApp):**
- Si el pedido NO tiene `riderKey` → avisar a **todos los riders activos**.
- Si tiene `riderKey` → avisar **solo a ese rider**.
- Los teléfonos/tokens/Telegram ID se leen de Firebase (`/riders`), no fijos en código.

---

## 6. Estado de madurez de cada módulo

### ✅ COMPLETOS (no tocar)
| Módulo | Por qué está completo |
|--------|----------------------|
| Lavandería | Escribe /pedidos, push, WhatsApp, flujo completo |
| Moto Taxi | `confirmarMoto` → /pedidos, push, WhatsApp |
| Mensajería | `confirmarMensajeria` → /pedidos, push, WhatsApp |
| Hoteles/Empresas | Motor único (v1.0.1) → /pedidos |
| Personal de Lavandería | CRUD + tiempo real (onValue) |
| Despacho | Tiempo real + anti-ciclo |

### 🟡 SOLO NECESITAN CONECTARSE (código existe)
| Módulo | Qué falta conectar |
|--------|--------------------|
| Rider (tipos) | Leer `pedido.tipo` y mostrar el servicio real (hoy muestra todo como "Lavandería") |
| Pagos Stripe | Código existe en versión antigua; integrarlo como pago opcional |
| Telegram | Bot existe en el Worker; conectarlo al motor de notificaciones |
| Admin/Despacho/Cliente tiempo real | Migrar a onValue (plan de sincronización) |

### ❌ FALTAN POR DESARROLLAR (solo interfaz hoy)
| Módulo | Qué falta |
|--------|-----------|
| Comida | Función de pedido (replicar patrón de Moto) |
| Farmacia | Función de pedido |
| Flores | Función de pedido |
| Supermercado | Función de pedido |
| Licores | Función de pedido |
| Amazon | Completar confirmación (parcial) |
| Email (notif) | Estructura en el Worker |

---

## 7. Plan de implementación por fases

> Regla: cada fase se valida (checklist QA en iPhone/Android/PC) antes de la siguiente. Cada fase = un ZIP versionado.

### FASE 1 — Sincronización en tiempo real (en curso)
- ✅ Personal de Lavandería (v1.0.0)
- ✅ Despacho (v1.0.0)
- ⬜ Rider, Admin, Cliente → onValue
- **Objetivo:** todos los datos de negocio en vivo.

### FASE 2 — Motor único de pedidos
- ✅ Hoteles/Empresas unificados (v1.0.1)
- ⬜ Extraer `/core/pedidos.js` (función `crearPedido` compartida)
- ⬜ Que cliente.html y despacho.html la usen
- **Objetivo:** una sola función de creación, cero duplicación.

### FASE 3 — Rider por tipo
- ⬜ El rider lee `pedido.tipo` y muestra el servicio real
- **Objetivo:** Moto y Mensajería se ven como tales (no "Lavandería").

### FASE 4 — Worker como centro de comunicaciones
- ⬜ Números dinámicos desde Firebase `/riders`
- ⬜ Regla asignado/todos
- ⬜ Endpoint único `/notificar` (push + WhatsApp)
- **Objetivo:** no tocar código al cambiar de equipo.

### FASE 5 — Telegram
- ⬜ Conectar el bot al motor de notificaciones
- **Objetivo:** Telegram como canal más.

### FASE 6 — Servicios nuevos
- ⬜ Comida, Farmacia, Flores, Supermercado con el patrón de Moto
- **Objetivo:** activar los "próximamente".

### FASE 7 — Pagos
- ⬜ Recuperar Stripe como pago opcional
- **Objetivo:** cobro integrado (además de efectivo/Bizum).

### FASE 8 — Email e Instagram
- ⬜ Email en el Worker; imagen con QR (futuro)

---

## 8. Mapa definitivo

```
                    ORÍGENES
   Cliente · Hotel · Empresa · WhatsApp · Telegram
                       │
                       ▼
        ┌──────────────────────────────┐
        │   MOTOR ÚNICO crearPedido()   │  ← /core/pedidos.js (Fase 2)
        └──────────────┬───────────────┘
                       ▼
              Firebase /pedidos
        (modelo único · tipo + estado)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
      Rider         Despacho        Admin
   (por tipo)     (tiempo real)   (tiempo real)
        │
        ▼
   ┌────────────────────────────────┐
   │  WORKER = centro de avisos      │  ← /notificar (Fase 4)
   ├── App (Push FCM)      ✅        │
   ├── WhatsApp (dinámico) 🟡→✅     │
   ├── Telegram            🟡        │
   ├── Email               ❌        │
   └── Instagram (futuro)  ❌        │
                       │
                       ▼
                    Pagos
        Efectivo/Bizum ✅ · Stripe 🟡
```

---

## 9. Resumen ejecutivo

- **Base sólida:** 3 servicios funcionales + hoteles, todos ya en `/pedidos`. El motor único es más una **consolidación** que una construcción desde cero.
- **Lo más rentable primero:** terminar sincronización (Fase 1), extraer el motor compartido (Fase 2), y que el rider muestre el tipo (Fase 3). Con eso, la plataforma queda coherente.
- **Reutilización:** Moto, Mensajería y Stripe ya existen → no rehacer, conectar.
- **Modelo de datos:** un solo nodo `/pedidos`, un campo `tipo`, un campo `estado`. Simple y escalable.
