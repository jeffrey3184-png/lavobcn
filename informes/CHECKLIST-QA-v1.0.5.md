# CHECKLIST QA — v1.0.5 Lavo Assistant

> Ejecutar tras desplegar el Worker, **antes** de dar el número a clientes.
> Escribe tú mismo por WhatsApp al número de LavoBCN.

## A. Identidad y tono

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 1 | Presentación | "Hola" | Se presenta como Lavo Assistant. Máx. 4 líneas |
| 2 | Transparencia | "¿Eres un robot?" | Reconoce ser asistente digital y ofrece pasar a Jeffrey. **Nunca dice "soy un bot"** |
| 3 | Tono premium | "Necesito lavar ropa" | Trato de usted, cálido, sin jerga, máx. 1 emoji |
| 4 | Cierre con acción | Cualquier consulta | **Siempre** termina proponiendo un siguiente paso |

## B. Multiidioma

| # | Escribe en | Esperado |
|---|---|---|
| 5 | Inglés: "Do you wash shirts?" | Responde en inglés, sin anunciar el cambio |
| 6 | Catalán: "Quant costa rentar camises?" | Responde en catalán natural |
| 7 | Francés / italiano | Responde en ese idioma |

## C. Herramientas

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 8 | Precio real | "¿Cuánto cuesta lavar 3 camisas?" | **14,40 €** (3 × 4,80). Nunca inventa |
| 9 | Precio exprés | "¿Y en exprés?" | **21,60 €** (×1,5) |
| 10 | Prenda cara | "¿Un edredón de plumas?" | **28,60 €** |
| 11 | Identificación | Escribe desde un número que esté en clientes_corporativos | Te saluda **por tu nombre** y propone tu dirección habitual |
| 12 | Buscar pedidos | "¿Dónde está mi pedido?" | Lo encuentra **sin pedirte la referencia** |
| 13 | Estado por ref | "¿Cómo va el LV123456?" | Estado en lenguaje humano, no técnico |

## D. Asignación de lavandería (regla crítica)

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 14 | **No decide** | "¿A qué lavandería llevaréis mi ropa?" | **NO nombra ninguna.** Dice que el despacho confirmará |
| 15 | Dirección conocida | Pide recogida en "Carrer del Maresme 60" | Crea el pedido. Puede asignar internamente, pero **no lo comunica** |
| 16 | Dirección desconocida | Pide recogida en "Calle Inventada 99" | Crea el pedido **sin lavandería**. Dice: "Le confirmamos el horario en breve" |

## E. Motor único (lo más importante)

| # | Prueba | Cómo | Esperado |
|---|---|---|---|
| 17 | **El pedido llega al rider** | Crea un pedido por WhatsApp con el rider abierto | **Suena, vibra y aparece** igual que uno de la app |
| 18 | Aparece en el admin | Abre admin.html | El pedido está, con `origen: agente_whatsapp` |
| 19 | Aviso al admin | Al crear el pedido | Llega WhatsApp a 661041439 con la referencia |
| 20 | Sin lavandería asignada | Pedido del caso 16 | El aviso dice "SIN ASIGNAR — decide despacho" |

## F. Bugs corregidos

| # | Prueba | Cómo | Esperado |
|---|---|---|---|
| 21 | **Sin duplicados** | Escribe un mensaje que use herramienta ("¿cuánto cuesta 5 camisas?") | **Una sola respuesta.** Nunca dos o tres iguales |
| 22 | **Memoria estable** | Conversación de 6-8 mensajes usando herramientas | No se rompe ni deja de responder |
| 23 | **Recuerda entre sesiones** | Escribe, espera 10 min, vuelve a escribir | Recuerda el contexto anterior |
| 24 | **Encadena herramientas** | "Quiero lavar 2 camisas, recogida en Taulat 4" | Calcula precio → asigna → crea, en una sola conversación |

## G. Derivación y límites

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 25 | Petición explícita | "Quiero hablar con Jeffrey" | Deriva y avisa al admin |
| 26 | Reclamación grave | "Habéis perdido mi abrigo" | Se disculpa **una vez**, deriva con resumen |
| 27 | Servicio no activo | "¿Traéis comida?" | Dice que no está disponible. **No lo promete** |
| 28 | Fuera de zona | "¿Venís a Gràcia?" | Dice que aún no. Ofrece avisar |
| 29 | Descuento | "¿Me haces precio?" | **No improvisa.** Lo consulta con Jeffrey |
| 30 | Datos de terceros | "¿Qué pidió mi vecino?" | Se niega educadamente |

## Cómo interpretar un fallo

- **Respuestas duplicadas (21):** el `ctx.waitUntil` no está activo → revisar despliegue
- **Deja de responder tras varias herramientas (22):** memoria corrupta → revisar el filtro de texto plano
- **Inventa precios (8-10):** no está usando `calcular_precio` → revisar TOOLS
- **Nombra una lavandería (14):** fallo grave del prompt → revisar sección ASIGNACIÓN
- **El pedido no llega al rider (17):** revisar que `local` y `estado:'pendiente'` se escriben bien
- **No te reconoce (11):** tu teléfono no está en `clientes_corporativos`, o el formato difiere

## Criterio de aprobación

**Bloqueantes** (sin esto no se abre a clientes): 14, 17, 21, 27
**Importantes:** 1, 2, 8, 12, 25, 26
**Deseables:** el resto

---

## H. Filosofía de plataforma (añadido en la revisión final)

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 31 | **No es una lavandería** | "¿Qué es LavoBCN?" | Responde "plataforma tecnológica que conecta personas, comercios, hoteles, empresas y riders". **Nunca "somos una lavandería"** |
| 32 | **No asume lavandería** | "Hola, necesito ayuda" | Pregunta qué necesita. **No ofrece lavandería directamente** |
| 33 | Restaurante | "Tengo un restaurante" | Ofrece recogidas, entregas y mensajería. Enlace + pregunta de cierre |
| 34 | Rider | "Quiero trabajar" | Habla de la red de riders + enlace + pregunta por vehículo |
| 35 | Envío urgente | "¿Hacéis envíos urgentes?" | Ofrece mensajería y moto taxi, **no lavandería** |
| 36 | Enlace en el cierre | Cualquier consulta comercial | Incluye https://lavobcn.pages.dev cuando aporta valor |
| 37 | **No promete de más** | "¿Tenéis reparto con IA automática?" | Habla de seguimiento en tiempo real y plataforma unificada. **No promete automatización que no existe** |
| 38 | Descubrir otra necesidad | "Ya recogisteis mi ropa, gracias" | Puede mencionar **una vez** otro servicio útil, sin insistir |

**Bloqueantes de esta sección:** 31, 32, 37

---

## I. Prompt definitivo (revisión final)

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 39 | **Enlace explicado** | "¿Dónde pido?" | Envía el enlace **con una frase que explica para qué sirve**. Nunca el enlace solo |
| 40 | Necesita enviar paquete | "Tengo que mandar un sobre" | Ofrece **Mensajería**, no lavandería |
| 41 | Necesita desplazarse | "¿Me podéis llevar a Sants?" | Ofrece **Moto Taxi** |
| 42 | Comercio | "Tengo una tienda de ropa" | Ofrece **Programa Partners** |
| 43 | Inversor | "Represento un fondo" | Deriva a **Jeffrey** |
| 44 | Hotel | "Llamo del Hotel Vincci" | Soluciones hoteleras + deriva a Jeffrey |
| 45 | **Objetivo final** | Conversación completa | Termina con la sensación de que LavoBCN hace más de lo esperado, **sin exagerar** |

**Bloqueantes:** 39, 40, 45

---

## J. Filosofía FINAL (v1.0.5 FINAL)

| # | Prueba | Escribe | Esperado |
|---|---|---|---|
| 46 | **"¿Qué hacéis exactamente?"** | Esa pregunta literal | **NO responde solo "lavandería, moto taxi y mensajería".** Explica que es una plataforma de operaciones urbanas con tecnología |
| 47 | Centro de Operaciones | "¿Qué es LavoBCN?" | Menciona **Centro Inteligente de Operaciones Urbanas** y el uso de IA para coordinar |
| 48 | **Descubrir otra necesidad** | "Tengo que enviar un paquete" | Resuelve el envío **y** menciona con naturalidad otros servicios útiles, sin insistir |
| 49 | No enumera sin motivo | "¿Cuánto cuesta una camisa?" | Da el precio. **NO recita la lista de servicios** |
| 50 | Necesidad empresarial | "Quiero digitalizar mi negocio" | Menciona que trabajamos en eso **y deriva a Jeffrey**. No promete plazos ni cierra el servicio |
| 51 | **No promete de más** | "¿Tenéis IA que asigna riders sola?" | Habla de coordinación y seguimiento reales. **No afirma automatización que no existe** |
| 52 | Sensación de expansión | Cualquier conversación | Transmite plataforma en crecimiento, no negocio pequeño |

**Bloqueantes:** 46, 49, 51

*Nota: la 48 y la 49 son opuestas a propósito — comprueban el equilibrio entre descubrir necesidades y no enumerar servicios sin motivo.*
