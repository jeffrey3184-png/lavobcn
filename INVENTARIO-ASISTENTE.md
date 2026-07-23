# 📊 INVENTARIO FUNCIONAL — Lavo Assistant

**Documento de arquitectura · 13 julio 2026**
Qué puede conocer, consultar y ejecutar el asistente sobre el sistema actual de LavoBCN.
*Sin código. Sin modificaciones.*

---

## 1. NODOS DE FIREBASE

Base: `lavobcn-default-rtdb.europe-west1.firebasedatabase.app`

| Nodo | Contenido | ¿Útil para el asistente? |
|---|---|---|
| `/pedidos` | Todos los pedidos de todos los servicios | 🟢 **Crítico** |
| `/clientes_corporativos` | Hoteles, empresas, particulares fijos | 🟢 **Crítico** |
| `/despachos` | Rutas del despacho con paradas | 🟡 Consulta |
| `/riders_estado` | Estado en vivo de cada rider | 🟢 Alta |
| `/rider_eventos` | Actividad e historial de riders | 🟡 Auditoría |
| `/riders_docs` | Documentación de riders | 🔴 Sensible |
| `/clientes_docs` | Documentos de clientes | 🔴 Sensible |
| `/soporte_chat` | Conversaciones de soporte de la app | 🟢 Alta |
| `/agente_memoria` | Memoria del asistente (últimos 20 msg) | 🟢 **Ya en uso** |
| `/perfiles` | Perfiles de cliente | 🟡 Escrito pero nunca leído |
| `/autosave` | Estado de trabajo (cliente/rider/despacho) | ⚪ Interno |
| `/kpi_params` | Parámetros de negocio (comisión, CAC) | 🟡 Solo admin |
| `/tokens` | Tokens push por dispositivo | ⚪ Técnico |

---

## 2. DATOS DISPONIBLES EN CADA NODO

### `/pedidos/{ref}` — el corazón operativo
`ref` · `tipo` (lavanderia/moto/mensajeria/amazon) · `estado` · `local` · `lavanderia` · `dir` · `tel` · `nota` · `servicio` · `total` · `codigo` (entrega) · `ts` · `prendas` · `accion` · `dest` · `refRuta` · `riderKey` · `origen`

**Estados posibles:** `pendiente` → `aceptado` → `en_camino` → `entregado` (+ `rechazado`, `cancelado`)
**Sub-estados de lavandería:** recogida → lavando → secando → planchando → listo

### `/clientes_corporativos/{id}`
`nombre` · `empresa` · `tipo` (hotel/empresa/particular/comercio/lavanderia) · `direccion` · `coordenadas {lat,lng}` · `telefono` · `persona_contacto` · `email` · `horario` · `zona` · `vehiculo_recomendado` · `servicios_disponibles` · `prioridad` · `categoria_registro` (fijo/ocasional) · `activo` · `veces_usado` · `ultima_recogida` · `ultimo_servicio` · `observaciones`

### `/riders_estado/{rider}`
Conectado sí/no · posición GPS · última actualización

### `/agente_memoria/{teléfono}`
`historial` — últimos 20 mensajes de la conversación

---

## 3. WORKERS EXISTENTES

| Worker | Líneas | Endpoints | Función |
|---|---|---|---|
| **lavo-agente-worker.js** | 273 | `/webhook` `/test` | **El asistente** (WhatsApp + Claude + Firebase) |
| notificador-worker.js | 219 | `/whatsapp` `/enviar` `/test` `/avisar` | Push FCM + WhatsApp (nº fijo) |
| lavo-telegram-botones.js | 419 | `/webhook` `/start` `/test` | Bot Telegram de botones (en uso) |
| lavo-agente-telegram.js | 237 | `/webhook` `/start` `/test` | Bot Telegram con IA (obsoleto) |
| lavo-captador/worker.js | 204 | `/captar` | Captación de prospectos |
| lavobcn-worker.js | 39 | — | Auxiliar |

**Nota:** solo el notificador está desplegado con certeza. El agente existe en código pero nunca se ha desplegado.

---

## 4. HERRAMIENTAS ACTUALES DEL ASISTENTE

| Herramienta | Qué hace | Estado |
|---|---|---|
| `consultar_estado_pedido` | Lee `/pedidos/{ref}` y devuelve estado legible | ✅ Funcional |
| `crear_pedido` | Escribe en `/pedidos` + avisa al admin por WhatsApp | 🟡 Campos incompletos |
| `enviar_presupuesto` | Precios orientativos hardcodeados (4 categorías) | 🟡 No usa el catálogo real |

**Solo 3 herramientas.** Es la principal limitación.

---

## 5. ACCIONES QUE PUEDE EJECUTAR HOY

✅ Responder cualquier pregunta conversacional
✅ Consultar el estado de un pedido por su código
✅ Crear un pedido de lavandería en el motor único
✅ Avisar al admin por WhatsApp al crear un pedido
✅ Dar un presupuesto aproximado
✅ Recordar los últimos 20 mensajes de esa persona

## 6. CONSULTAS QUE PUEDE REALIZAR HOY

✅ Un pedido concreto por referencia
❌ Pedidos de un cliente (no hay búsqueda por teléfono)
❌ Estado de los riders
❌ Disponibilidad y horarios
❌ Datos de un hotel o empresa
❌ Precios reales del catálogo
❌ Historial del cliente

---

## 7. LIMITACIONES ACTUALES

| # | Limitación | Impacto |
|---|---|---|
| 1 | **No identifica quién escribe** | Trata igual a un hotel Vincci que a un desconocido |
| 2 | **Solo habla español** | El prompt lo fuerza |
| 3 | **Memoria sin perfil** | Recuerda la charla, no a la persona |
| 4 | **Precios inventados** | 4 categorías genéricas vs. 29 prendas reales |
| 5 | **Solo crea lavandería** | No moto taxi, mensajería ni Amazon |
| 6 | **No busca por teléfono** | No puede decir "tu último pedido" |
| 7 | **Sin tickets ni incidencias** | No hay nodo ni herramienta |
| 8 | **Sin captación** | No puede dar de alta hotel/comercio/rider |
| 9 | **Webhook bloqueante** | Riesgo de respuestas duplicadas |
| 10 | **Memoria se corrompe con herramientas** | Puede dejar de responder |
| 11 | **Pedido sin `local`** | Siempre cae en Perfect Clean |
| 12 | **Sin límite de gasto** | Ni de API ni de WhatsApp |

---

## 8. OPORTUNIDADES DE AUTOMATIZACIÓN

Ordenadas por valor / esfuerzo:

| Oportunidad | Valor | Esfuerzo |
|---|---|---|
| **Identificar al cliente por su número** (cruzar con `clientes_corporativos` y `/pedidos`) | 🟢🟢🟢 | Bajo |
| **Precios reales** del catálogo de 29 prendas | 🟢🟢🟢 | Bajo |
| **"¿Dónde está mi pedido?"** sin pedir referencia (busca por teléfono) | 🟢🟢🟢 | Bajo |
| **Repetir último pedido** ("lo mismo que la otra vez") | 🟢🟢🟢 | Bajo |
| **Alta de hotel/comercio/rider** conversacional | 🟢🟢 | Medio |
| **Tickets de incidencia** con seguimiento | 🟢🟢 | Medio |
| **Aviso proactivo** al cambiar el estado ("su ropa está lista") | 🟢🟢🟢 | Medio |
| **Recogida programada recurrente** para hoteles | 🟢🟢 | Medio |
| Consultar disponibilidad de riders en tiempo real | 🟢 | Medio |
| Pago por Stripe desde la conversación | 🟢🟢 | Alto |

---

## 9. INFORMACIÓN PARA PERSONALIZAR CONVERSACIONES

**Ya disponible en Firebase, solo hay que leerla:**

| Dato | De dónde | Ejemplo de uso |
|---|---|---|
| Nombre | `clientes_corporativos.nombre` | *"Buenos días, señora Ster."* |
| Dirección habitual | `clientes_corporativos.direccion` | *"¿Recogemos en Taulat 4?"* |
| Tipo de cliente | `.tipo` | Trato hotel ≠ particular |
| Horario | `.horario` | *"Pasamos antes de las 14:00, como siempre."* |
| Último servicio | `.ultimo_servicio` | *"¿Otra vez tintorería?"* |
| Última recogida | `.ultima_recogida` | *"Hace tres semanas que no nos visita."* |
| Frecuencia | `.veces_usado` | Reconocer al cliente fiel |
| Prioridad | `.prioridad` | Atención preferente |
| Vehículo recomendado | `.vehiculo_recomendado` | Asignación correcta |
| Historial de pedidos | `/pedidos` filtrado por `tel` | *"Su último pedido fue el martes."* |
| Idioma preferido | (falta guardarlo) | Responder en su idioma siempre |

**Conclusión:** el 90% de lo necesario para una experiencia premium **ya está en la base de datos**. Solo falta consultarlo.

---

## 10. QUÉ FALTA PARA UN CENTRO DE OPERACIONES INTELIGENTE

### Datos que faltan en Firebase
| Falta | Para qué |
|---|---|
| `/riders` estructurado (nombre, tel, token, telegram, activo) | Asignar y notificar sin números fijos |
| Índice de pedidos por teléfono | Buscar "mis pedidos" |
| `/tickets` | Incidencias con seguimiento |
| `idioma` en el perfil | Continuidad multiidioma |
| `/horarios` de lavanderías | Responder "¿a qué hora abrís?" |
| Catálogo de precios en Firebase | Cambiar precios sin tocar código |

### Capacidades que faltan
- **Proactividad:** hoy solo responde. Un centro de operaciones **inicia** conversaciones (avisar que la ropa está lista, recordar recogida semanal del hotel).
- **Escritura de estados:** puede crear pedidos pero no avanzarlos.
- **Multi-servicio:** solo lavandería, cuando la plataforma ya mueve moto y mensajería.
- **Escalado con contexto:** derivar a Jeffrey con el resumen, no solo el aviso.
- **Métricas propias:** cuántas conversaciones resuelve sin humano.

### Bloqueantes externos
| Bloqueante | Estado |
|---|---|
| Cuenta WhatsApp Business verificada (Meta/360dialog) | ❌ Requiere empresa registrada |
| Clave de API de Anthropic | ❓ Por confirmar |
| Despliegue del Worker en Cloudflare | ❌ Nunca desplegado |
| Firebase con acceso controlado | ❌ Abierto (el asistente hoy podría leerlo todo) |

---

## RESUMEN EJECUTIVO

**Lo que sorprende:** el asistente tiene acceso potencial a **13 nodos** con información muy rica —incluido el historial completo de cada cliente corporativo con su dirección, horario, frecuencia y último servicio—, pero hoy **solo usa uno** (`/pedidos`, y solo por referencia exacta).

**La brecha no es de datos, es de herramientas.** Pasar de 3 a ~10 herramientas convierte un chatbot que responde en un asistente que opera.

**El mayor salto por el menor esfuerzo:** identificar quién escribe cruzando su número con `clientes_corporativos`. Eso solo ya permite el saludo personalizado, la dirección habitual, el idioma y el tipo de trato. Es una consulta.

**Precios confirmados para el asistente:** catálogo real de 29 prendas (camisa 4,80 € · pantalón 7,90 € · abrigo 14,70 € · edredón plumas 28,60 € · vestido de novia 89,50 €…), con multiplicador según servicio estándar/exprés.
