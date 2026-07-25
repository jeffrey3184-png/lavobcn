# LAVO CORE — README
### Versión consolidada · Única · 13 julio 2026

---

## Qué es esto

**Un único proyecto.** Un solo Worker de Cloudflare (`workers/lavo-core-worker.js`) que reúne todo el asistente de LavoBCN: WhatsApp y Telegram, para los 5 roles (Cliente, Rider, Despacho, Jeffrey, Administración), con **un solo cerebro**: el mismo SYSTEM_PROMPT, las mismas 7 herramientas, la misma memoria y el mismo motor único `/pedidos`.

Integra **todas** las correcciones, auditorías y mejoras del proyecto. No hay versiones intermedias que aplicar por separado.

**La app web (`cliente.html`, `rider.html`, `despacho.html`, `admin.html`, `admin-clientes.html`, `index.html`) está incluida sin ninguna modificación.**

---

## Cómo activar módulos

Al principio de `workers/lavo-core-worker.js` hay un bloque:

```javascript
const MODULOS = {
  WHATSAPP:                    true,
  TELEGRAM_CLIENTE:            false,
  TELEGRAM_RIDER:              false,
  TELEGRAM_DESPACHO:           false,
  TELEGRAM_JEFFREY:            false,
  TELEGRAM_ADMIN:              false,
  INNOVACION_RESUMEN_NOCTURNO: false,
  INNOVACION_VISION_ENTREGA:   false,
};
```

Cambias `false` por `true`, pegas el archivo en Cloudflare, y ese módulo se activa. No hay que tocar nada más.

**Orden recomendado:** Telegram Cliente → Rider → Despacho → Jeffrey → Admin → Innovación. Cada uno funciona por sí solo.

---

## Antes de desplegar — configuración obligatoria

### 1. Secretos en Cloudflare
(Worker → Settings → Variables and Secrets)

| Secreto | Para qué | Sin él |
|---|---|---|
| `ANTHROPIC_API_KEY` | El cerebro | No responde nada |
| `TELEGRAM_TOKEN` | Bot de Telegram (BotFather) | Telegram no funciona |
| `TELEGRAM_WEBHOOK_SECRET` | Verificar que los mensajes vienen de Telegram | **Rechaza todo** (fallo seguro) |
| `D360_API_KEY` | Enviar WhatsApp | WhatsApp no envía |
| `WHATSAPP_APP_SECRET` | Verificar firma de WhatsApp | **Rechaza todo** (fallo seguro) |
| `VERIFY_TOKEN` | Verificación inicial del webhook | No se puede conectar |

**Roles de administración (recomendado, más seguro que Firebase):**

| Variable | Valor | Para qué |
|---|---|---|
| `JEFFREY_CHAT_ID` | Su chat_id de Telegram | Recibe derivaciones |
| `ADMIN_CHAT_IDS` | Ids separados por comas | Comandos `/hoy`, `/riders` |
| `DESPACHO_CHAT_IDS` | Ids separados por comas | Grupo de despacho |

Para obtener un `chat_id`: escribir `/start` a `@userinfobot` en Telegram.

### 2. Reglas de Firebase
Pegar el contenido de `firebase-rules.json` en la consola de Firebase → Realtime Database → Reglas → Publicar.

**Qué cambia:** los nodos de permisos (`admin_staff`, `despacho_staff`, `derivaciones`, `rate_limit`) pasan a **no escribibles desde el cliente** — esto corta la vía por la que alguien podría auto-asignarse como administrador. Se añaden índices para acelerar consultas.

**Qué NO cambia:** los permisos de `pedidos`, `despachos`, `viajes`, `clientes_corporativos` y `autosave` siguen exactamente igual, para no romper la app web existente.

### 3. Webhook de Telegram
Una sola vez, desde el navegador (sustituyendo TOKEN, TU-WORKER y TU-SECRETO):
```
https://api.telegram.org/botTOKEN/setWebhook?url=https://TU-WORKER.workers.dev/webhook/telegram&secret_token=TU-SECRETO
```
El `secret_token` debe ser exactamente el mismo valor que pusiste en `TELEGRAM_WEBHOOK_SECRET`.

### 4. Cron Trigger (necesario para los módulos Rider y Despacho)
Cloudflare → tu Worker → Settings → Triggers → Cron Triggers:
- `*/1 * * * *` — avisa a riders/despacho de pedidos nuevos (cada minuto)
- `0 22 * * *` — resumen nocturno (solo si activas ese módulo)

**Sin el Cron, los pedidos creados desde la web no llegan a Telegram.**

---

## Despliegue recomendado

Crea un Worker **nuevo** llamado `lavo-core` y pega ahí el archivo. Deja el Worker anterior intacto hasta validar. Cuando funcione, cambias el webhook y retiras el antiguo. Cero riesgo mientras pruebas.

Para la web: subir todos los archivos a GitHub como siempre. La carpeta `workers/` no afecta a Cloudflare Pages (solo publica los HTML).

---

## Notas técnicas honestas

**El aviso a riders no es instantáneo** cuando el pedido nace en `despacho.html` o `cliente.html`. Un Worker no puede escuchar Firebase de forma continua; por eso el Cron revisa cada minuto. Máximo 60 segundos de retraso. Los pedidos creados desde Telegram sí avisan al instante.

**El rider ve la zona, no la dirección exacta, antes de aceptar.** Al aceptar recibe dirección completa y teléfono. Es deliberado: reduce la exposición de datos personales.

**Control de frecuencia:** máximo 8 mensajes por minuto y 60 por hora por usuario. Protege el coste de la API ante spam.

**Coste estimado:** ~45 EUR/mes con ~25 clientes/día (Claude + Telegram + Firebase).

---

## Si algo falla

Pon el módulo problemático en `false` y vuelve a pegar el archivo — los demás siguen funcionando. Para una vuelta atrás completa, `workers/` incluye el Worker anterior sin tocar.
