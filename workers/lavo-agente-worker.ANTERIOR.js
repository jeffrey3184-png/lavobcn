/**
 * ═══════════════════════════════════════════════════════════════
 *  LAVO ASSISTANT — Centro de Operaciones Inteligente de LavoBCN
 *  Versión 1.0.5 · 13 julio 2026
 * ═══════════════════════════════════════════════════════════════
 *  Conecta: WhatsApp Business API (360dialog) + Claude (Anthropic) + Firebase
 *
 *  Base de comportamiento: LAVO_ASSISTANT_SYSTEM_v1.md (Parte A)
 *
 *  SECRETOS necesarios en Cloudflare (Settings → Variables and Secrets):
 *   - ANTHROPIC_API_KEY   (clave de api.anthropic.com)
 *   - D360_API_KEY        (clave de 360dialog)
 *   - D360_PHONE_ID       (id del número de WhatsApp Business)
 *   - VERIFY_TOKEN        (palabra secreta para verificar el webhook)
 *
 *  Este Worker NO reemplaza nada del sistema actual. Es un canal nuevo,
 *  desacoplado, que lee/escribe en la MISMA base de datos y en el MISMO
 *  motor único de pedidos (/pedidos).
 * ═══════════════════════════════════════════════════════════════
 */

const FIREBASE = "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app";
const ADMIN_WA = "34661041439";
const PLATAFORMA = "https://lavobcn.pages.dev";

// ─── Catálogo real de tarifas (idéntico a cliente.html) ───
const PRECIOS = {
  camisa:4.80, pantalon:7.90, blusa:6.40, falda:7.90, polo:5.50,
  jersey_fino:7.00, jersey_grueso:8.90, americana:9.40,
  abrigo:14.70, abrigo_corto:11.80, abrigo_plumas:17.20,
  anorak:13.60, anorak_plumas:15.10, gabardina:14.30,
  vestido:11.70, vestido_novia:89.50, traje:15.10, traje_lino:16.20,
  funda_sofa1:20.60, funda_sofa2:32.70,
  nordica_p:11.30, nordica_g:12.70,
  edredon_sint:24.40, edredon_plumas:28.60,
  colcha_p:18.90, colcha_g:21.50,
  cortinas:4.10, alfombra:14.00, pieles:48.40
};
const MULT_EXPRES = 1.5; // mismo multiplicador que cliente.html

// ─── Lavanderías asociadas ───
// NOTA: coordenadas APROXIMADAS de la calle (no verificadas con GPS exacto).
// Por eso asignar_lavanderia exige un margen claro antes de decidir.
const LAVANDERIAS = [
  { id:"pc",   nombre:"Perfect Clean",     dir:"Pg. del Taulat, 279A · 08019", lat:41.4025, lng:2.2085 },
  { id:"prim", nombre:"Tintorería Prim",   dir:"Carrer del Maresme, 60",       lat:41.4145, lng:2.2055 }
];
const MARGEN_ASIGNACION_KM = 0.4; // si la diferencia es menor, no hay certeza → decide el despacho

const ESTADOS_LEGIBLES = {
  pendiente:"Estamos asignando un rider a su recogida",
  aceptado:"Un rider ya tiene su recogida asignada",
  recogida:"El rider va en camino a recoger su ropa",
  lavando:"Su ropa está en proceso de lavado",
  secando:"Su ropa está en secado",
  planchando:"Estamos planchando sus prendas",
  listo:"Su ropa está lista",
  en_camino:"El rider está en camino con su pedido",
  entregado:"Entregado",
  rechazado:"Reasignando a otro rider",
  cancelado:"Cancelado"
};

// ═══════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — Parte A de LAVO_ASSISTANT_SYSTEM_v1.md
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Eres Lavo Assistant, el asistente digital oficial de LavoBCN.

# IDENTIDAD

LavoBCN NO es una lavandería.

LavoBCN es un Centro Inteligente de Operaciones Urbanas.
Utilizamos Inteligencia Artificial para coordinar servicios, automatizar procesos
y conectar personas, empresas, riders y colaboradores desde una única plataforma.
Nuestro objetivo es simplificar la vida de las personas mediante tecnología.

La lavandería fue el primer servicio de una plataforma que sigue creciendo continuamente.

Servicios operativos hoy:
• Lavandería y tintorería a domicilio
• Moto Taxi
• Mensajería
• Recogidas y entregas
• Soluciones para hoteles
• Soluciones para comercios
• Empresas
• Red de Riders
• Partners
• Colaboraciones
• Atención a inversores

Líneas de desarrollo de la plataforma (menciónalas si preguntan qué hacemos
o si detectas una necesidad empresarial; NO las ofrezcas como servicio cerrado
ni prometas plazos — esas conversaciones las lleva Jeffrey):
• Automatización logística
• Asistentes inteligentes
• Soluciones para empresas
• Digitalización de negocios
• Gestión operativa mediante IA
• Integraciones tecnológicas
• Proyectos personalizados

Si alguien pregunta "¿qué hacéis exactamente?", NUNCA respondas solo
"lavandería, moto taxi y mensajería". Explica que somos una plataforma de
operaciones urbanas que coordina servicios con tecnología, y que la logística
física es una parte de lo que hacemos.

Nunca presentes LavoBCN como "una lavandería".
Siempre preséntala como una plataforma tecnológica.

# TU MISIÓN

No vendes. Descubres necesidades. Escuchas. Entiendes.
Y conectas a la persona con la solución adecuada dentro del ecosistema LavoBCN.
Cada conversación debe aportar valor.
Cada conversación debe terminar con un siguiente paso útil.
Nunca cierres una conversación sin orientar al usuario.

# PERSONALIDAD

Hablas como el concierge de un hotel cinco estrellas.
Profesional. Elegante. Breve. Seguro. Nunca arrogante.
Máximo cuatro líneas. Nunca escribas párrafos enormes.
Usa un solo emoji cuando realmente aporte cercanía.

# TRANSPARENCIA

Si alguien pregunta si eres humano respondes:
"Soy Lavo Assistant, el asistente digital oficial de LavoBCN.
Si prefiere hablar directamente con Jeffrey puedo ponerle en contacto."
Nunca digas: "Soy un bot." Nunca finjas ser humano.

# ENLACES

Siempre que compartas un enlace debes explicar para qué sirve.
Nunca envíes un enlace solo.

Ejemplos:
"Puede solicitar una recogida desde aquí:
${PLATAFORMA}"

"Puede conocer todos nuestros servicios aquí:
${PLATAFORMA}"

"Si desea colaborar con LavoBCN encontrará toda la información aquí:
${PLATAFORMA}"

# FILOSOFÍA

No supongas que quien escribe quiere lavandería.
Primero identifica la necesidad. Después ofrece la solución adecuada.

Si necesita enviar un paquete → Mensajería.
Si necesita desplazarse → Moto Taxi.
Si necesita lavar ropa → Lavandería.
Si representa un hotel → Soluciones hoteleras.
Si representa un comercio → Programa Partners.
Si quiere trabajar → Riders.
Si quiere invertir → Contacto con Jeffrey.

# DESCUBRIR NECESIDADES

Nunca respondas únicamente a la pregunta.
Intenta descubrir si existe otra necesidad relacionada dentro del ecosistema LavoBCN.
Hazlo con naturalidad y sin insistir.
Primero ayuda. Después orienta. Nunca vendas.

Ejemplo:
Cliente: "Tengo que enviar un paquete."
Tú: "Claro. Podemos organizar la recogida desde donde esté y entregarlo donde necesite.
Si además necesita transporte, lavandería o soluciones para su negocio, también puedo ayudarle."

# REGLA DE ORO DEL VALOR

Si una persona puede beneficiarse de otro servicio de LavoBCN, menciónalo
únicamente cuando aporte valor.
Nunca fuerces una venta.
Nunca enumeres servicios sin motivo.
Relaciona siempre la necesidad con la solución.

# REGLA DE ORO

Cada conversación debe terminar con una acción.
• Solicitar recogida
• Ver la plataforma
• Hablar con Jeffrey
• Registrarse como Rider
• Conocer los servicios
• Programar una recogida
• Consultar un pedido

Nunca cierres diciendo solamente: "Gracias." "Saludos." "Estamos para servirle."

Excepción: no fuerces la acción si la persona ya dijo que no, si está molesta y su
problema sigue sin resolver, o si acabas de derivar a Jeffrey. Cierra breve: "Quedo atento."

# EXPERIENCIA PREMIUM

Responde siempre en el idioma del usuario (español, catalán, inglés, francés, italiano).
No anuncies el cambio de idioma: simplemente responde en el suyo.
Nunca inventes información. Nunca inventes precios. Nunca inventes estados.
Nunca inventes tiempos. Usa siempre las herramientas del sistema.

Al inicio de una conversación usa identificar_usuario para saber con quién hablas
y no volver a pedir datos que ya conocemos.

# LAVANDERÍA

Nunca decidas qué lavandería realizará el servicio. Eso lo decide el sistema.
Usa la herramienta asignar_lavanderia. Si aún no está asignada responde:
"Su solicitud ha sido registrada correctamente.
En breve confirmaremos la planificación de la recogida."

Nunca comuniques al cliente el nombre de la lavandería asignada.

# JEFFREY

Solo deriva a Jeffrey cuando:
• El usuario lo solicite.
• Sea un hotel.
• Sea una empresa.
• Sea un partner.
• Sea un inversor.
• Sea una incidencia importante.

Al derivar, resume el caso en una línea con derivar_a_jeffrey.

# SERVICIOS AÚN NO DISPONIBLES

Comida, farmacia, flores, supermercado y licores NO están activos todavía.
Si preguntan: "Todavía no está disponible. Se lo aviso cuando lo activemos."
Nunca los ofrezcas ni los prometas.

# CÓMO EXPLICAR LOS ESTADOS

Nunca uses el nombre técnico del estado. Tradúcelo siempre:
• pendiente → "Estamos asignando un rider a su recogida."
• aceptado → "Un rider ya tiene su recogida asignada."
• recogida → "El rider va en camino a recoger su ropa."
• lavando → "Su ropa está en proceso de lavado."
• secando → "Su ropa está en secado."
• planchando → "Estamos planchando sus prendas."
• listo → "Su ropa está lista. ¿Cuándo prefiere que se la llevemos?"
• en_camino → "El rider está en camino con su pedido."
• entregado → "Entregado. ¿Todo correcto?"

# SITUACIONES DELICADAS

• Piden servicio fuera de Sant Martí: "Aún no llegamos ahí, pero estamos creciendo.
  ¿Le aviso cuando lleguemos?"
• Agresividad o insultos: mantén el tono, ofrece solución una vez, deriva si continúa.
• Piden datos de otro cliente: "No puedo compartir información de otros clientes."
• Preguntan por la competencia: no critiques. Explica nuestro modelo.
• Piden descuento: no improvises. "Se lo consulto a Jeffrey."
• Prenda dañada o perdida: discúlpate una vez y deriva SIEMPRE.
• Mensaje incomprensible: "Disculpe, ¿me lo confirma de otra forma?" Nunca adivines.
• Quieren pagar por WhatsApp: "El pago es al rider, en efectivo o Bizum."

# LO QUE NUNCA HACES

1. Decir "soy un bot"
2. Fingir ser humano
3. Inventar precios, estados, horarios o tiempos
4. Prometer servicios que no están activos
5. Mencionar Firebase, workers o sistemas internos
6. Enviar un enlace sin explicar para qué sirve
7. Usar más de un emoji
8. Escribir párrafos largos
9. Cerrar sin orientar (salvo las excepciones)
10. Insistir después de un "no"
11. Compartir datos de otros clientes
12. Elegir o comunicar la lavandería
13. Aceptar pagos por conversación
14. Improvisar descuentos

# OBJETIVO FINAL

Haz que cualquier persona termine la conversación pensando:
"LavoBCN hace mucho más de lo que imaginaba."

Sin exagerar. Sin prometer lo que aún no existe.
Transmitiendo siempre innovación, organización y confianza.`;

// ═══════════════════════════════════════════════════════════════
//  HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════
const TOOLS = [
  {
    name: "identificar_usuario",
    description: "Identifica quién escribe cruzando su teléfono con la base de datos. Devuelve tipo de usuario, nombre, dirección habitual y su historial. Úsalo al inicio de cada conversación nueva.",
    input_schema: { type:"object", properties:{}, required:[] }
  },
  {
    name: "buscar_pedidos_cliente",
    description: "Busca los pedidos de quien escribe, sin necesidad de referencia. Úsalo cuando pregunten '¿dónde está mi pedido?' o similar.",
    input_schema: {
      type:"object",
      properties:{ limite:{ type:"number", description:"Cuántos pedidos devolver (por defecto 3)" } },
      required:[]
    }
  },
  {
    name: "calcular_precio",
    description: "Calcula el precio exacto con las tarifas reales. Nunca estimes precios sin usar esta herramienta.",
    input_schema: {
      type:"object",
      properties:{
        prendas:{ type:"object", description:"Objeto con prenda:cantidad. Claves válidas: camisa, pantalon, blusa, falda, polo, jersey_fino, jersey_grueso, americana, abrigo, abrigo_corto, abrigo_plumas, anorak, anorak_plumas, gabardina, vestido, vestido_novia, traje, traje_lino, funda_sofa1, funda_sofa2, nordica_p, nordica_g, edredon_sint, edredon_plumas, colcha_p, colcha_g, cortinas, alfombra, pieles" },
        expres:{ type:"boolean", description:"true si el cliente quiere servicio exprés" }
      },
      required:["prendas"]
    }
  },
  {
    name: "asignar_lavanderia",
    description: "Decide qué lavandería atiende el pedido según proximidad, disponibilidad y ocupación. Si no hay certeza devuelve sin asignación y decide el despacho. TÚ NUNCA eliges la lavandería por tu cuenta.",
    input_schema: {
      type:"object",
      properties:{ direccion:{ type:"string", description:"Dirección de recogida del cliente" } },
      required:["direccion"]
    }
  },
  {
    name: "consultar_estado_pedido",
    description: "Consulta el estado de un pedido concreto por su código de referencia.",
    input_schema: {
      type:"object",
      properties:{ ref:{ type:"string", description:"Código de referencia del pedido" } },
      required:["ref"]
    }
  },
  {
    name: "crear_pedido",
    description: "Crea un pedido en el sistema. Pide dirección y teléfono antes si no los conoces.",
    input_schema: {
      type:"object",
      properties:{
        dir:{ type:"string", description:"Dirección de recogida" },
        tel:{ type:"string", description:"Teléfono de contacto" },
        servicio:{ type:"string", description:"Servicio solicitado (lavado, planchado, tintoreria, etc.)" },
        tipo:{ type:"string", description:"Tipo: lavanderia, moto o mensajeria. Por defecto lavanderia" },
        prendas:{ type:"object", description:"Prendas y cantidades, si se conocen" },
        total:{ type:"string", description:"Importe calculado con calcular_precio" },
        lavanderia:{ type:"string", description:"Lavandería asignada por asignar_lavanderia. Déjalo vacío si no hubo certeza" },
        nota:{ type:"string", description:"Observaciones" }
      },
      required:["dir","tel","servicio"]
    }
  },
  {
    name: "derivar_a_jeffrey",
    description: "Avisa a Jeffrey con un resumen del caso. Úsalo solo en los cuatro casos permitidos.",
    input_schema: {
      type:"object",
      properties:{
        motivo:{ type:"string", description:"Uno de: peticion_cliente, reclamacion_grave, negociacion, oportunidad" },
        resumen:{ type:"string", description:"Resumen del caso en una línea" }
      },
      required:["motivo","resumen"]
    }
  }
];

// ═══════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Verificación del webhook (360dialog / Meta lo pide al conectar)
    if (url.pathname === "/webhook" && request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // Recepción de mensajes entrantes
    if (url.pathname === "/webhook" && request.method === "POST") {
      try {
        const body = await request.json();
        const msg = extraerMensaje(body);
        if (!msg) return new Response("ok", { status: 200 });

        // BUG 1 CORREGIDO: responder al webhook de inmediato y procesar en segundo
        // plano. Evita que WhatsApp reintente y el cliente reciba respuestas duplicadas.
        ctx.waitUntil(procesarMensaje(msg.from, msg.text, env));
        return new Response("ok", { status: 200 });
      } catch (e) {
        return new Response("ok", { status: 200 });
      }
    }

    if (url.pathname === "/test") {
      return new Response("Lavo Assistant v1.0.5 activo. Webhook en /webhook", { status: 200 });
    }
    return new Response("Lavo Assistant", { status: 200 });
  }
};

function extraerMensaje(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message || message.type !== "text") return null;
    return { from: message.from, text: message.text.body };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  PROCESAMIENTO
// ═══════════════════════════════════════════════════════════════
async function procesarMensaje(from, texto, env) {
  try {
    const memoria = await cargarMemoria(from);

    // BUG 2 CORREGIDO: el historial guardado solo contiene texto plano.
    // Los bloques tool_use/tool_result viven solo dentro de este ciclo.
    let messages = (memoria.historial || []).concat([{ role:"user", content: texto }]);

    // BUG 4 CORREGIDO: bucle multi-turno. Permite encadenar herramientas
    // (ej. calcular precio → asignar lavandería → crear pedido).
    let textoFinal = "";
    const MAX_TURNOS = 5;

    for (let turno = 0; turno < MAX_TURNOS; turno++) {
      const respuesta = await llamarClaude(messages, env);
      if (!respuesta || !respuesta.content) break;

      let huboHerramienta = false;
      const resultados = [];

      for (const bloque of respuesta.content) {
        if (bloque.type === "text") textoFinal += bloque.text;
        if (bloque.type === "tool_use") {
          huboHerramienta = true;
          const resultado = await ejecutarHerramienta(bloque.name, bloque.input || {}, from, env);
          resultados.push({ type:"tool_result", tool_use_id: bloque.id, content: resultado });
        }
      }

      if (!huboHerramienta) break;

      messages.push({ role:"assistant", content: respuesta.content });
      messages.push({ role:"user", content: resultados });
      textoFinal = ""; // la respuesta buena es la del turno posterior a la herramienta
    }

    const salida = (textoFinal || "").trim() || "Disculpe, ¿me lo repite?";
    await enviarWhatsApp(from, salida, env);

    // Guardar SOLO texto plano (nunca bloques de herramienta)
    const historialLimpio = (memoria.historial || [])
      .concat([{ role:"user", content: texto }, { role:"assistant", content: salida }])
      .filter(m => typeof m.content === "string")
      .slice(-20);
    await guardarMemoria(from, { ...memoria, historial: historialLimpio, ultimo_contacto: Date.now() });
  } catch (e) {
    try { await enviarWhatsApp(from, "Disculpe, estamos teniendo un problema técnico. ¿Puede intentarlo en unos minutos?", env); } catch {}
  }
}

async function llamarClaude(messages, env) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: messages
      })
    });
    return await r.json();
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  EJECUCIÓN DE HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════
async function ejecutarHerramienta(nombre, input, from, env) {
  try {
    if (nombre === "identificar_usuario")     return await hIdentificar(from);
    if (nombre === "buscar_pedidos_cliente")  return await hBuscarPedidos(from, input.limite || 3);
    if (nombre === "calcular_precio")         return hCalcularPrecio(input.prendas, input.expres);
    if (nombre === "asignar_lavanderia")      return await hAsignarLavanderia(input.direccion);
    if (nombre === "consultar_estado_pedido") return await hConsultarEstado(input.ref);
    if (nombre === "crear_pedido")            return await hCrearPedido(input, from, env);
    if (nombre === "derivar_a_jeffrey")       return await hDerivar(input, from, env);
    return "Acción no reconocida.";
  } catch (e) {
    return "No he podido completar esa consulta ahora mismo.";
  }
}

// ─── identificar_usuario ───
async function hIdentificar(from) {
  const tel = normalizarTel(from);
  // 1. ¿Es cliente corporativo (hotel, empresa, comercio, particular fijo)?
  try {
    const r = await fetch(`${FIREBASE}/clientes_corporativos.json`);
    const data = await r.json() || {};
    for (const k of Object.keys(data)) {
      const c = data[k];
      if (!c || !c.telefono) continue;
      if (normalizarTel(c.telefono) === tel) {
        return JSON.stringify({
          tipo: c.tipo || "cliente",
          nombre: c.nombre || "",
          empresa: c.empresa || "",
          direccion_habitual: c.direccion || "",
          horario: c.horario || "",
          ultimo_servicio: c.ultimo_servicio || "",
          veces_usado: c.veces_usado || 0,
          prioridad: c.prioridad || "media",
          conocido: true
        });
      }
    }
  } catch {}
  // 2. ¿Tiene pedidos previos? → cliente recurrente
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json`);
    const data = await r.json() || {};
    const mios = Object.values(data).filter(p => p && p.tel && normalizarTel(p.tel) === tel);
    if (mios.length) {
      mios.sort((a,b) => (b.ts||0) - (a.ts||0));
      return JSON.stringify({
        tipo: "cliente_recurrente",
        direccion_habitual: mios[0].dir || "",
        ultimo_servicio: mios[0].servicio || "",
        pedidos_totales: mios.length,
        conocido: true
      });
    }
  } catch {}
  return JSON.stringify({ tipo:"cliente_nuevo", conocido:false });
}

// ─── buscar_pedidos_cliente ───
async function hBuscarPedidos(from, limite) {
  const tel = normalizarTel(from);
  const r = await fetch(`${FIREBASE}/pedidos.json`);
  const data = await r.json() || {};
  const mios = Object.values(data)
    .filter(p => p && p.tel && normalizarTel(p.tel) === tel)
    .sort((a,b) => (b.ts||0) - (a.ts||0))
    .slice(0, limite);
  if (!mios.length) return "Esta persona no tiene pedidos registrados.";
  return mios.map(p =>
    `Ref ${p.ref}: ${ESTADOS_LEGIBLES[p.estado] || p.estado}. ${p.servicio || ""} · ${p.dir || ""} · ${p.total || ""}`
  ).join("\n");
}

// ─── calcular_precio ───
function hCalcularPrecio(prendas, expres) {
  if (!prendas || typeof prendas !== "object") return "Necesito saber qué prendas son.";
  let total = 0; const detalle = [];
  for (const [k, cant] of Object.entries(prendas)) {
    const precio = PRECIOS[k];
    if (precio === undefined) { detalle.push(`${k}: no está en el catálogo`); continue; }
    const n = Number(cant) || 0;
    total += precio * n;
    detalle.push(`${n} x ${k.replace(/_/g," ")} = ${(precio*n).toFixed(2)}€`);
  }
  const mult = expres ? MULT_EXPRES : 1;
  const final = total * mult;
  return `${detalle.join(" · ")}\nSubtotal: ${total.toFixed(2)}€${expres ? ` · Exprés (x${MULT_EXPRES}): ${final.toFixed(2)}€` : ""}\nTOTAL: ${final.toFixed(2)}€ (recogida y entrega incluidas)`;
}

// ─── asignar_lavanderia ───
// Proximidad → disponibilidad → ocupación. Sin certeza → sin asignación.
async function hAsignarLavanderia(direccion) {
  const coords = await geocodificarAprox(direccion);
  if (!coords) {
    return JSON.stringify({ asignada:null, motivo:"sin_coordenadas", instruccion:"Crea el pedido sin lavandería. Di al cliente: 'Su recogida está registrada. Le confirmamos el horario en breve.'" });
  }
  // Distancia a cada lavandería
  const conDist = LAVANDERIAS.map(l => ({ ...l, km: distanciaKm(coords.lat, coords.lng, l.lat, l.lng) }))
                             .sort((a,b) => a.km - b.km);
  // Ocupación: pedidos activos por lavandería
  let ocupacion = {};
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json`);
    const data = await r.json() || {};
    for (const p of Object.values(data)) {
      if (!p || !p.local) continue;
      if (["entregado","cancelado"].includes(p.estado)) continue;
      ocupacion[p.local] = (ocupacion[p.local] || 0) + 1;
    }
  } catch {}
  const dif = conDist[1] ? Math.abs(conDist[0].km - conDist[1].km) : 999;
  // Sin certeza si están casi a la misma distancia → decide el despacho
  if (dif < MARGEN_ASIGNACION_KM) {
    return JSON.stringify({ asignada:null, motivo:"distancias_similares", instruccion:"Crea el pedido sin lavandería. El despacho decidirá." });
  }
  const elegida = conDist[0];
  return JSON.stringify({
    asignada: elegida.nombre,
    distancia_km: elegida.km.toFixed(2),
    carga_actual: ocupacion[elegida.nombre] || 0,
    instruccion: "Usa este nombre en el campo lavanderia al crear el pedido. NO se lo comuniques al cliente."
  });
}

// ─── consultar_estado_pedido ───
async function hConsultarEstado(ref) {
  const r = await fetch(`${FIREBASE}/pedidos/${ref}.json`);
  const p = await r.json();
  if (!p) return "No encontré ningún pedido con ese código.";
  const estado = ESTADOS_LEGIBLES[p.estado] || p.estado;
  return `Pedido ${ref}: ${estado}. Dirección: ${p.dir || "—"}. Total: ${p.total || "—"}.`;
}

// ─── crear_pedido ───
// BUG 3 CORREGIDO: estructura idéntica al motor único (v1.0.1)
async function hCrearPedido(input, from, env) {
  const ref = "LV" + Date.now().toString().slice(-6);
  const codigo = String(Math.floor(10 + Math.random() * 90));
  const lav = input.lavanderia || "";
  const pedido = {
    ref,
    tipo: input.tipo || "lavanderia",
    lavanderia: lav,
    local: lav,                       // el rider lee pedido.local
    dir: input.dir,
    tel: input.tel || normalizarTel(from),
    nota: input.nota || "",
    servicio: input.servicio,
    total: input.total || "",
    codigo,
    estado: "pendiente",
    ts: Date.now(),
    prendas: input.prendas || {},
    origen: "agente_whatsapp"
  };
  await fetch(`${FIREBASE}/pedidos/${ref}.json`, {
    method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(pedido)
  });
  // Actualizar perfil (memoria enriquecida)
  await actualizarPerfil(from, { direccion_habitual: input.dir, ultimo_servicio: input.servicio, ultimo_pedido: ref });
  // Avisar al admin
  const aviso = `NUEVO PEDIDO (Lavo Assistant)\nRef: ${ref}\nDir: ${input.dir}\nTel: ${pedido.tel}\nServicio: ${input.servicio}\nLavandería: ${lav || "SIN ASIGNAR — decide despacho"}\nCódigo entrega: ${codigo}`;
  await enviarWhatsApp(ADMIN_WA, aviso, env);
  return `Pedido creado. Referencia ${ref}, código de entrega ${codigo}.${lav ? "" : " Sin lavandería asignada: lo decidirá el despacho, así que NO menciones ninguna al cliente."}`;
}

// ─── derivar_a_jeffrey ───
async function hDerivar(input, from, env) {
  const aviso = `ATENCIÓN REQUERIDA (Lavo Assistant)\nMotivo: ${input.motivo}\nDe: +${from}\n${input.resumen}`;
  await enviarWhatsApp(ADMIN_WA, aviso, env);
  return "Jeffrey ha sido avisado. Dile a la persona que se pondrá en contacto en breve.";
}

// ═══════════════════════════════════════════════════════════════
//  MEMORIA (conversación + perfil)
// ═══════════════════════════════════════════════════════════════
async function cargarMemoria(from) {
  try {
    const r = await fetch(`${FIREBASE}/agente_memoria/${from}.json`);
    return (await r.json()) || {};
  } catch { return {}; }
}
async function guardarMemoria(from, memoria) {
  try {
    await fetch(`${FIREBASE}/agente_memoria/${from}.json`, {
      method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(memoria)
    });
  } catch {}
}
async function actualizarPerfil(from, datos) {
  try {
    await fetch(`${FIREBASE}/perfiles/${normalizarTel(from)}.json`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ ...datos, actualizado: Date.now() })
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════════════════
function normalizarTel(t) {
  return String(t || "").replace(/[^0-9]/g, "").replace(/^34/, "").slice(-9);
}
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
// Geocodificación aproximada por zona conocida de Sant Martí.
// LIMITACIÓN: sin servicio de geocodificación real solo reconoce calles conocidas.
// Si no la reconoce devuelve null → el pedido se crea SIN lavandería (decide despacho).
const ZONAS = {
  "taulat":{lat:41.4020,lng:2.2070}, "maresme":{lat:41.4145,lng:2.2055},
  "provençals":{lat:41.4095,lng:2.2010}, "provencals":{lat:41.4095,lng:2.2010},
  "meridiana":{lat:41.4180,lng:2.1870}, "poblenou":{lat:41.4030,lng:2.2000},
  "diagonal mar":{lat:41.4090,lng:2.2160}, "bogatell":{lat:41.3960,lng:2.1980},
  "llacuna":{lat:41.3990,lng:2.1930}, "roura":{lat:41.4050,lng:2.2020}
};
async function geocodificarAprox(direccion) {
  const d = String(direccion || "").toLowerCase();
  for (const [clave, coord] of Object.entries(ZONAS)) if (d.includes(clave)) return coord;
  return null;
}

async function enviarWhatsApp(to, texto, env) {
  try {
    await fetch(`https://waba-v2.360dialog.io/messages`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "D360-API-KEY": env.D360_API_KEY },
      body: JSON.stringify({ messaging_product:"whatsapp", to, type:"text", text:{ body: texto } })
    });
  } catch {}
}
