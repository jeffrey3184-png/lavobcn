# CHANGELOG — LAVO CORE (versión consolidada)
### 13 julio 2026 · Versión única. Integra todo el trabajo del proyecto.

Este documento sustituye a todos los changelogs anteriores. No hay versiones intermedias que aplicar.

---

## Arquitectura

**Un cerebro, dos canales, cinco roles.** Un único Worker con:
- El mismo `SYSTEM_PROMPT` para WhatsApp y Telegram (identidad Lavo Assistant, filosofía de plataforma tecnológica, concierge digital, catálogo completo, reglas de embajador, 9 tipos de usuario, traducción de estados, casos límite, 14 prohibiciones)
- Las mismas **7 herramientas**: `identificar_usuario`, `buscar_pedidos_cliente`, `calcular_precio` (29 prendas reales), `asignar_lavanderia`, `consultar_estado_pedido`, `crear_pedido`, `derivar_a_jeffrey`
- La misma memoria (conversación + perfil)
- El mismo **motor único** `/pedidos` — 13 campos idénticos a los de la app web

**Decisión de diseño central:** conversación, venta y soporte → Claude. Acciones operativas críticas (aceptar, rechazar, entregar, asignar) → botones deterministas, sin IA, instantáneos.

**8 módulos activables por interruptor**, independientes entre sí.

---

## Correcciones integradas

### Bugs del asistente
1. **Webhook bloqueante** → `ctx.waitUntil`, evita respuestas duplicadas
2. **Memoria corrupta** con bloques de herramienta → solo texto plano
3. **Pedido incompleto** → 13/13 campos del motor único
4. **Un solo nivel de herramienta** → bucle multi-turno (máx. 5)

### Condición de carrera (el fallo más grave detectado)
Dos riders podían aceptar el mismo pedido. **Resuelto con escrituras condicionadas por ETag de Firebase**: se exige la huella exacta del estado anterior; si otro escribió antes, Firebase rechaza con 412 y el rider recibe "Este pedido ya no está disponible". Aplicado a aceptar, rechazar, entregar y asignar.

### Botones y comandos
- `cli_recogida` y `cli_estado` (botones muertos del primer contacto) → conectados al cerebro
- `/entregar {ref}` → implementado (comando + botón, misma función)
- `/pendientes` de despacho → implementado
- Botones "Asignar" de despacho → ahora se generan de verdad (antes el código que los procesaba era inalcanzable)
- **Verificado:** los 7 `callback_data` que genera el sistema tienen manejador; los 6 comandos anunciados existen

### Fotos
`btoa(String.fromCharCode(...bytes))` lanzaba `RangeError` con cualquier foto real. **Resuelto** con conversión en trozos de 32 KB. Probado con 500 KB, 2 MB, 5 MB y 8 MB, con integridad de datos verificada. Límite de 8 MB con mensaje claro.

### Seguridad
- **Telegram:** verificación del `X-Telegram-Bot-Api-Secret-Token`. Sin coincidencia → 401, no se procesa nada
- **WhatsApp:** firma HMAC-SHA256 (`X-Hub-Signature-256`). Cálculo verificado contra implementación de referencia independiente
- **Escalada a administrador cerrada:** los roles se comprueban primero contra variables de entorno de Cloudflare (inmodificables desde fuera); Firebase queda como respaldo con `admin_staff` y `despacho_staff` marcados `.write: false`
- **Ambos webhooks rechazan por defecto** si falta el secreto (fallo seguro, no fallo abierto)

### Privacidad (RGPD)
- **Un rider solo ve pedidos sin asignar o asignados a él** — antes veía todos los de la empresa
- **Antes de aceptar ve la zona, no la dirección exacta.** Al aceptar recibe dirección completa y teléfono
- Nodos de permisos y `rate_limit` no legibles/escribibles desde el cliente

### Control de abuso
- **Rate limiting:** 8 mensajes/minuto y 60/hora por usuario. Probado: deja pasar uso normal, bloquea spam y abuso sostenido
- Mensajes truncados a 4.000 caracteres antes de llegar a Claude

### Trazabilidad
- `ref_activo` **se escribe al aceptar y se limpia al entregar** — antes se leía y nunca se escribía, por lo que las fotos de entrega jamás se asociaban al pedido
- Logs JSON estructurados (`log`, `logError`, `logSeguridad`), reconstruibles, sin datos sensibles completos
- 14 bloques `catch {}` silenciosos convertidos a error registrado con contexto

### Rendimiento
- `despacho_staff` ya no se consulta dentro del bucle del Cron
- `identificar_usuario` y `buscar_pedidos_cliente` usan consultas indexadas, con **respaldo automático** al escaneo completo si el índice aún no está aplicado (nunca se rompe)
- Índices añadidos en `firebase-rules.json`

---

## Firebase

**Cambios (solo aditivos y de permisos en nodos nuevos):**
- `.indexOn` añadidos: `pedidos.tel`, `clientes_corporativos.telefono`, `perfiles.telegram_chat_id`
- `admin_staff`, `despacho_staff`, `derivaciones` → `.write: false`
- `rate_limit` → sin acceso desde cliente
- `riders_estado/$rider/telegram_chat_id` → `.write: false`

**Sin cambios:** permisos de `pedidos`, `despachos`, `viajes`, `autosave`, `clientes_corporativos` y raíz — para no romper la app web existente.

---

## Archivos

**Modificados respecto al proyecto original:** solo `firebase-rules.json` (índices y permisos de nodos nuevos).

**Nuevos:** `workers/lavo-core-worker.js`, `telegram-miniapp.html`.

**Sin tocar (verificado byte a byte con `diff`):** `cliente.html`, `rider.html`, `despacho.html`, `admin.html`, `admin-clientes.html`, `index.html`, `notificador-worker.js`, `manifest.json`, `firebase-messaging-sw.js`, `notificaciones.js`, y los módulos de `core/` y `config/`.

---

## Verificado antes de entregar

- Sintaxis válida
- 0 funciones duplicadas
- 0 herramientas duplicadas
- 0 botones sin manejador
- 0 comandos anunciados sin implementar
- 0 prompts antiguos
- Motor único: 13/13 campos
- Rate limiting probado con 3 escenarios
- Conversión de fotos probada con 4 tamaños
- Firma HMAC contrastada con implementación independiente
- Permisos de Firebase: solo cambian los nodos nuevos

---

## Pendiente conocido (no bloquea el piloto)

- **Reglas raíz de Firebase siguen abiertas** (`.read/.write: true`). Los nodos críticos están protegidos, pero cerrar el resto exige Firebase Auth y tocar la app web — fuera del alcance de esta consolidación
- Ubicación en vivo del rider: se guarda, ninguna pantalla la muestra todavía
- Derivaciones a Jeffrey: se registran, sin pantalla de histórico
- Sin alerta de "pedido aceptado y no entregado tras X horas"
- Incidencias de rider se derivan a Jeffrey, no a despacho
