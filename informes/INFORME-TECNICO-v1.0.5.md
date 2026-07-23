# Informe Técnico — v1.0.5 · Lavo Assistant

**Fecha:** 13 julio 2026 · **Estado:** listo para auditoría · **NO desplegado**

---

## 1. Alcance

Implementación del cerebro de Lavo Assistant según `LAVO_ASSISTANT_SYSTEM_v1.md`.
**Un único archivo modificado:** `lavo-agente-worker.js` (273 → 470 líneas).

**Ningún archivo de la plataforma ha sido tocado.** Verificado con `diff` contra v1.0.4: cliente, rider, despacho, admin, admin-clientes e index son byte a byte idénticos.

---

## 2. Lo implementado

### 2.1 SYSTEM_PROMPT definitivo
Parte A del documento maestro, íntegra: identidad, transparencia sobre ser IA, filosofía de plataforma, tono de cinco estrellas, regla de oro, embajador, siguiente paso obligatorio (con sus excepciones), regla de asignación de lavandería, derivación en 4 casos y límites.
**~700 tokens** → coste ≈ 0,002 €/mensaje.

### 2.2 Los 4 bugs corregidos

| Bug | Antes | Ahora |
|---|---|---|
| **1. Webhook bloqueante** | `await procesarMensaje()` antes de responder → WhatsApp reintentaba → respuestas duplicadas | `ctx.waitUntil()` + respuesta inmediata |
| **2. Memoria corrupta** | Guardaba bloques `tool_use`/`tool_result` → error 400 al recargar | Guarda solo texto plano (`filter typeof === "string"`) |
| **3. Pedido incompleto** | Faltaban `local`, `lavanderia`, `total`, `prendas` | 13/13 campos del motor único |
| **4. Un solo nivel de herramienta** | Se cortaba al encadenar | Bucle multi-turno, máx. 5 iteraciones |

### 2.3 Herramientas (3 → 7)

| Herramienta | Función |
|---|---|
| `identificar_usuario` | Cruza teléfono con `clientes_corporativos` y `/pedidos`. Devuelve tipo, nombre, dirección habitual, historial |
| `buscar_pedidos_cliente` | Pedidos por teléfono, sin pedir referencia |
| `calcular_precio` | 29 prendas reales + multiplicador exprés ×1,5 |
| `asignar_lavanderia` | Proximidad + ocupación. Devuelve `null` si no hay certeza |
| `consultar_estado_pedido` | Estado por referencia (existente, conservada) |
| `crear_pedido` | Motor único, estructura completa |
| `derivar_a_jeffrey` | Escalado con resumen de contexto |

### 2.4 Memoria enriquecida
- **Conversación:** `/agente_memoria/{tel}` — últimos 20 mensajes, solo texto
- **Perfil:** `/perfiles/{tel}` — dirección habitual, último servicio, último pedido, actualizado automáticamente al crear un pedido

### 2.5 Regla de asignación de lavandería
Implementada exactamente como se aprobó:
1. Proximidad (haversine sobre coordenadas)
2. Ocupación (pedidos activos por lavandería)
3. **Margen de seguridad:** si la diferencia de distancia es < 0,4 km → sin asignación
4. **Sin coordenadas reconocibles → sin asignación**
5. En ambos casos el pedido se crea igualmente y decide el despacho

El prompt prohíbe explícitamente que el asistente elija o comunique lavandería.

---

## 3. Riesgos encontrados

| # | Riesgo | Gravedad | Mitigación aplicada |
|---|---|---|---|
| 1 | **Coordenadas de las lavanderías son aproximadas** (no existen en el código) | 🟠 Media | Margen de 0,4 km: ante duda, no asigna |
| 2 | **Geocodificación limitada** a 10 zonas conocidas de Sant Martí (sin servicio externo) | 🟠 Media | Si no reconoce la calle → sin asignación (comportamiento seguro) |
| 3 | `identificar_usuario` y `buscar_pedidos_cliente` **descargan el nodo completo** | 🟠 Media | Aceptable con el volumen actual. Con miles de pedidos requerirá índice por teléfono |
| 4 | **Firebase abierto**: el asistente hereda esos permisos | 🔴 Alta | Fuera del alcance de esta versión. Prerrequisito antes de producción |
| 5 | **Sin límite de gasto** en la API | 🟠 Media | Configurar en la consola de Anthropic antes de desplegar |
| 6 | El pedido creado por WhatsApp **no dispara push al rider** | 🟡 Baja | El rider lo ve por su listener de `/pedidos`. Integrar con el notificador es trabajo futuro |

---

## 4. NO implementado (y por qué)

Siguiendo la condición *"si alguna mejora pone en riesgo el funcionamiento actual, NO la implementes"*:

| Función | Motivo |
|---|---|
| **Notificaciones proactivas** (pedido recogido, ropa lista…) | Requieren modificar `notificador-worker.js`, **que sí está en producción**. Además necesitan consentimiento RGPD registrado. Se deja para una versión propia |
| **Crear tickets** (`/tickets`) | El nodo no existe en Firebase. Crearlo sin reglas de acceso ampliaría la superficie de la base abierta |
| **Registro de candidatos** (rider/comercio) | Igual: nodo nuevo sobre base sin proteger |
| **Pago por Stripe en conversación** | Toca el flujo de pagos en producción. Riesgo desproporcionado |

---

## 5. Instrucciones de despliegue

**No ejecutar hasta que la auditoría autorice producción.**

### Requisitos previos
| # | Requisito | Dónde |
|---|---|---|
| 1 | Cuenta WhatsApp Business API verificada (360dialog) | Requiere empresa registrada |
| 2 | Clave de API de Anthropic **con límite de gasto** | console.anthropic.com |
| 3 | Cerrar reglas de Firebase | Consola Firebase |

### Pasos
1. Cloudflare → Workers → crear worker `lavo-agente`
2. Pegar el contenido de `lavo-agente-worker.js`
3. Settings → Variables and Secrets, añadir:
   - `ANTHROPIC_API_KEY`
   - `D360_API_KEY`
   - `D360_PHONE_ID`
   - `VERIFY_TOKEN` (palabra inventada)
4. Desplegar y comprobar `https://<worker>.workers.dev/test` → debe responder *"Lavo Assistant v1.0.5 activo"*
5. En 360dialog, configurar el webhook a `https://<worker>.workers.dev/webhook` con el mismo `VERIFY_TOKEN`
6. Ejecutar la CHECKLIST QA antes de dar el número a clientes

### Reversión
Si algo falla: eliminar el worker o restaurar `lavo-agente-worker.v1.0.4.bak`. **Ningún cambio afecta a la plataforma web**, que sigue funcionando igual con o sin asistente.
