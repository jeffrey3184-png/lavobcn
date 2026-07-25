# CHECKLIST — LAVO CORE (versión consolidada)
### Prueba lo que actives. No hace falta probar módulos apagados.

---

## PASO 0 — Configuración (obligatorio antes de todo)

| # | Comprobación | Cómo saber que está bien |
|---|---|---|
| 1 | Secretos en Cloudflare | Abrir `https://TU-WORKER.workers.dev/test` → responde "LAVO CORE activo" con la lista de módulos |
| 2 | Reglas de Firebase pegadas | En la consola: `admin_staff` muestra `.write: false` |
| 3 | Webhook de Telegram con `secret_token` | Escribir al bot: responde |
| 4 | Cron Trigger creado | Cloudflare → Triggers muestra `*/1 * * * *` |

**Si el paso 1 falla, nada más funcionará.**

---

## SEGURIDAD (los 3 puntos críticos resueltos)

| # | Prueba | Cómo | Esperado |
|---|---|---|---|
| 5 | **Dos riders, mismo pedido** | Dos cuentas de rider, ambas con `/pedidos`, tocar "Aceptar" en el mismo pedido casi a la vez | Solo **uno** lo consigue. El otro: "Este pedido ya no está disponible" |
| 6 | **Webhook sin credenciales** | Petición POST a `/webhook/telegram` sin la cabecera secreta (Postman) | 401, nada se procesa |
| 7 | **Rider no ve pedidos ajenos** | Asignar un pedido al rider A. El rider B escribe `/pedidos` | El pedido de A **no aparece** en la lista de B |
| 8 | **Dirección oculta antes de aceptar** | Rider escribe `/pedidos` | Ve la calle sin número. Al aceptar, recibe dirección completa + teléfono |
| 9 | **Rate limiting** | Enviar 10 mensajes seguidos rápido | A partir del 8º: "Está enviando mensajes muy seguidos" |
| 10 | **Admin por variable de entorno** | Con `ADMIN_CHAT_IDS` configurado, escribir `/hoy` | Funciona sin depender de Firebase |

**Bloqueantes: 5, 6, 7.**

---

## CLIENTE (Telegram)

| # | Prueba | Esperado |
|---|---|---|
| 11 | `/start` | Presentación de Lavo Assistant + 2 botones |
| 12 | Botón "🧺 Solicitar recogida" | Inicia la conversación de recogida |
| 13 | Botón "📦 Consultar un pedido" | Inicia la consulta |
| 14 | "¿Cuánto cuesta 3 camisas?" | **14,40 €** — precio real, no inventado |
| 15 | "¿Qué es LavoBCN?" | Habla de plataforma tecnológica, **nunca** solo "lavandería" |
| 16 | "¿A qué lavandería irá mi ropa?" | **No la nombra** — dice que el despacho confirma |
| 17 | Escribir en inglés | Responde en inglés |
| 18 | Completar un pedido | Aparece en `/pedidos` de Firebase con los 13 campos |

---

## RIDER (Telegram)

| # | Prueba | Esperado |
|---|---|---|
| 19 | Vincular: guardar `telegram_chat_id` en `/riders_estado/{riderKey}` | — |
| 20 | `/pedidos` | Solo pedidos sin asignar o suyos, con zona (no dirección exacta) |
| 21 | Aceptar | Recibe dirección completa + teléfono + botón "Marcar como entregado" |
| 22 | Compartir ubicación en vivo | `lat`/`lng` aparecen en `/riders_estado` |
| 23 | Enviar foto de entrega | Se guarda `foto_entrega_telegram_id` **en el pedido activo** |
| 24 | Botón "Marcar como entregado" | Estado → entregado; `ref_activo` se limpia |
| 25 | `/entregar LV123456` | Mismo resultado que el botón |
| 26 | "Se me ha pinchado la rueda" | Responde el cerebro (no un botón), puede derivar |
| 27 | Cron: crear pedido desde `despacho.html` | En ≤1 minuto llega a Telegram |

---

## DESPACHO · JEFFREY · ADMIN

| # | Rol | Prueba | Esperado |
|---|---|---|---|
| 28 | Despacho | `/pendientes` | Lista pedidos sin rider con un botón por rider |
| 29 | Despacho | Tocar botón de rider | Se asigna y **el rider recibe aviso con Aceptar/Rechazar** |
| 30 | Despacho | Dos personas asignan el mismo pedido a la vez | Solo una lo consigue |
| 31 | Jeffrey | Provocar derivación ("quiero hablar con Jeffrey") | Tarjeta con resumen + botón "Marcar resuelto" |
| 32 | Jeffrey | Comprobar WhatsApp | El aviso al admin **también** llega (no se sustituye) |
| 33 | Admin | `/hoy` | Pedidos del día por estado |
| 34 | Admin | `/riders` | Lista de riders y estado |

---

## INNOVACIÓN (si la activas)

| # | Prueba | Esperado |
|---|---|---|
| 35 | Foto con `INNOVACION_VISION_ENTREGA` activo | "Entrega verificada" o "REVISAR: motivo" — **sin error** |
| 36 | Foto muy grande (>8 MB) | Mensaje claro, sin romperse |
| 37 | Resumen nocturno (cron 22:00) | Jeffrey recibe el resumen |
| 38 | Mini App de prendas | Se abre en el chat, al confirmar se cierra |

---

## ERRORES Y LOGS

| # | Prueba | Esperado |
|---|---|---|
| 39 | Forzar un fallo (token mal puesto) | Cloudflare → Logs muestra JSON claro con contexto |
| 40 | En cualquier fallo | El usuario ve un mensaje humano, **nunca** código ni "undefined" |

---

## Cómo interpretar un fallo

- **Los webhooks rechazan todo:** el `secret_token` del `setWebhook` no coincide con `TELEGRAM_WEBHOOK_SECRET`
- **Sigue habiendo carrera entre riders:** revisar en los logs si aparece `motivo:"sin_etag"` — significa que Firebase no devuelve la cabecera ETag
- **El rider no recibe nada tras 2 minutos:** falta el Cron Trigger
- **Consultas lentas:** falta pegar `firebase-rules.json` en la consola (funciona igual, solo más lento)
- **Algo que funcionaba deja de funcionar:** vuelve al Worker anterior incluido en `workers/` y avisa qué prueba concreta falla
