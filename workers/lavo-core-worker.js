/**
 * ═══════════════════════════════════════════════════════════════
 *  LAVO CORE — Centro de Operaciones Inteligente de LavoBCN
 *  VERSIÓN CONSOLIDADA · 13 julio 2026
 *  Integra todas las correcciones y auditorías del proyecto.
 * ═══════════════════════════════════════════════════════════════
 *  UN SOLO PROYECTO, MODULAR. Un cerebro (SYSTEM_PROMPT + 7 herramientas
 *  + memoria), varios canales (WhatsApp, Telegram) y varios roles
 *  (Cliente, Rider, Despacho, Jeffrey, Admin) dentro del mismo archivo.
 *
 *  CÓMO ACTIVAR UN MÓDULO: cambia su valor a `true` en MODULOS (abajo)
 *  y vuelve a pegar este archivo en Cloudflare. Nada más. Cada módulo
 *  es independiente: activar uno no afecta a los demás.
 *
 *  El módulo WHATSAPP replica EXACTAMENTE el comportamiento de
 *  lavo-agente-worker.js v1.0.5 (mismo SYSTEM_PROMPT, mismas 7
 *  herramientas, mismo motor único, mismos 4 bugs corregidos).
 *  Nada de eso cambia aquí — solo se le añaden canales y roles nuevos.
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
//  MÓDULOS — activa/desactiva aquí. Ver README.md para el orden.
// ═══════════════════════════════════════════════════════════════
const MODULOS = {
  WHATSAPP:                    true,   // Fase 0 · Lavo Assistant por WhatsApp (ya diseñado en v1.0.5)
  TELEGRAM_CLIENTE:            false,  // Fase 1 · Lavo Assistant por Telegram
  TELEGRAM_RIDER:              false,  // Fase 2 · Riders operan desde Telegram
  TELEGRAM_DESPACHO:           false,  // Fase 3 · Grupo de despacho en Telegram
  TELEGRAM_JEFFREY:            false,  // Fase 4 · Derivaciones enriquecidas a Jeffrey
  TELEGRAM_ADMIN:              false,  // Fase 5 · Comandos de administración
  INNOVACION_RESUMEN_NOCTURNO: false,  // Fase 6a · Resumen automático cada noche (requiere Cron Trigger)
  INNOVACION_VISION_ENTREGA:   false,  // Fase 6b · Verificar fotos de entrega con Claude Vision
};

// ═══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN COMPARTIDA (idéntica a v1.0.5 · sin cambios)
// ═══════════════════════════════════════════════════════════════
const FIREBASE = "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app";
const ADMIN_WA = "34661041439";
const PLATAFORMA = "https://lavobcn.pages.dev";

// TODO (Fase 4): rellenar cuando actives TELEGRAM_JEFFREY.
// Se obtiene escribiéndole a @userinfobot en Telegram desde el móvil de Jeffrey.
const JEFFREY_TELEGRAM_ID = null;

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
const MULT_EXPRES = 1.5;

const LAVANDERIAS = [
  { id:"pc",   nombre:"Perfect Clean",   dir:"Pg. del Taulat, 279A · 08019", lat:41.4025, lng:2.2085 },
  { id:"prim", nombre:"Tintorería Prim", dir:"Carrer del Maresme, 60",       lat:41.4145, lng:2.2055 }
];
const MARGEN_ASIGNACION_KM = 0.4;

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
//  SYSTEM PROMPT — idéntico al aprobado en v1.0.5 (verbatim, no tocar)
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
//  HERRAMIENTAS — idénticas a v1.0.5 (mismos 7 nombres y esquemas)
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
//  FETCH — enrutador principal por canal
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /test — estado del sistema, qué módulos están activos ──
    if (url.pathname === "/test") {
      const activos = Object.entries(MODULOS).filter(([,v]) => v).map(([k]) => k);
      return new Response(
        "LAVO CORE activo (versión consolidada).\nMódulos ON: " + (activos.join(", ") || "ninguno"),
        { status: 200 }
      );
    }

    // ── WHATSAPP (Fase 0) — mismo path y comportamiento que v1.0.5 + firma ──
    if (MODULOS.WHATSAPP && url.pathname === "/webhook") {
      if (request.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (env.VERIFY_TOKEN && mode === "subscribe" && token === env.VERIFY_TOKEN) {
          return new Response(challenge, { status: 200 });
        }
        logSeguridad("whatsapp_verify_rechazado", { mode });
        return new Response("Forbidden", { status: 403 });
      }
      if (request.method === "POST") {
        try {
          const verificacion = await verificarFirmaWhatsApp(request, env);
          if (!verificacion.ok) {
            logSeguridad("whatsapp_firma_invalida", {});
            return new Response("Forbidden", { status: 401 }); // no se procesa nada
          }
          const body = JSON.parse(verificacion.body);
          const msg = extraerMensajeWhatsApp(body);
          if (!msg) return new Response("ok", { status: 200 });
          // BUG 1 corregido: no bloquear el webhook, procesar en segundo plano
          ctx.waitUntil(procesarWhatsApp(msg.from, msg.text, env));
          return new Response("ok", { status: 200 });
        } catch (e) {
          logError("webhook_whatsapp", e.message);
          return new Response("ok", { status: 200 }); // 200 para no generar reintentos en bucle
        }
      }
    }

    // ── TELEGRAM (Fases 1-5) — un solo webhook, un solo bot + token secreto ──
    if (url.pathname === "/webhook/telegram" && request.method === "POST") {
      const algunModuloTelegram = MODULOS.TELEGRAM_CLIENTE || MODULOS.TELEGRAM_RIDER ||
        MODULOS.TELEGRAM_DESPACHO || MODULOS.TELEGRAM_JEFFREY || MODULOS.TELEGRAM_ADMIN;
      if (!algunModuloTelegram) return new Response("ok", { status: 200 });

      const secretoRecibido = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!env.TELEGRAM_WEBHOOK_SECRET || secretoRecibido !== env.TELEGRAM_WEBHOOK_SECRET) {
        logSeguridad("telegram_secreto_invalido", {});
        return new Response("Forbidden", { status: 401 }); // no se procesa nada
      }
      try {
        const update = await request.json();
        ctx.waitUntil(procesarTelegram(update, env));
        return new Response("ok", { status: 200 });
      } catch (e) {
        logError("webhook_telegram", e.message);
        return new Response("ok", { status: 200 });
      }
    }

    return new Response("LAVO CORE", { status: 200 });
  },

  // ── SCHEDULED (Fases 2-3-6) — requiere Cron Trigger en Cloudflare ──
  // Ver README.md "Cómo activar el Cron Trigger".
  async scheduled(event, env, ctx) {
    if (MODULOS.TELEGRAM_RIDER || MODULOS.TELEGRAM_DESPACHO) {
      ctx.waitUntil(notificarPedidosPendientesTelegram(env));
    }
    if (MODULOS.INNOVACION_RESUMEN_NOCTURNO) {
      ctx.waitUntil(resumenNocturno(env));
    }
  }
};

// Verifica la firma HMAC-SHA256 que Meta/360dialog envían en la cabecera
// X-Hub-Signature-256, calculada con el secreto de la app (WHATSAPP_APP_SECRET).
// HONESTIDAD: este es el patrón estándar de la Cloud API de Meta. Como el
// proyecto nunca llegó a tener una cuenta de 360dialog activa, no ha podido
// probarse contra tráfico real — verificar el nombre exacto de la cabecera
// en la documentación de 360dialog al configurar la cuenta de verdad.
async function verificarFirmaWhatsApp(request, env) {
  const bodyText = await request.text();
  if (!env.WHATSAPP_APP_SECRET) {
    logSeguridad("whatsapp_sin_secreto_configurado", {});
    return { ok:false, body:bodyText };
  }
  const firma = request.headers.get("X-Hub-Signature-256");
  if (!firma) { logSeguridad("whatsapp_sin_cabecera_firma", {}); return { ok:false, body:bodyText }; }
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(env.WHATSAPP_APP_SECRET), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,"0")).join("");
    const esperado = "sha256=" + hex;
    return { ok: firma === esperado, body: bodyText };
  } catch (e) {
    logError("verificarFirmaWhatsApp", e.message);
    return { ok:false, body:bodyText };
  }
}

function extraerMensajeWhatsApp(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message || message.type !== "text") return null;
    return { from: message.from, text: message.text.body };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  CEREBRO COMPARTIDO — usado por WhatsApp Y Telegram por igual.
//  Un solo SYSTEM_PROMPT, una sola lógica de herramientas, una sola
//  memoria. Los canales solo entregan texto y reciben texto.
// ═══════════════════════════════════════════════════════════════

const LONGITUD_MAX_MENSAJE = 4000; // protección defensiva de coste ante abuso/spam
const LIMITE_MENSAJES_MINUTO = 8;   // ráfaga máxima aceptable de una persona real
const LIMITE_MENSAJES_HORA   = 60;  // techo por hora y usuario

// Control de frecuencia por usuario. Vive en Firebase porque un Worker no
// conserva memoria entre peticiones. Protege el coste de Claude ante spam
// o bucles accidentales.
async function superaLimiteFrecuencia(identidad, env) {
  const clave = memKey(identidad);
  const ahora = Date.now();
  try {
    const r = await fetch(`${FIREBASE}/rate_limit/${clave}.json`);
    const d = (await r.json()) || {};
    const marcas = (d.marcas || []).filter(ts => ahora - ts < 3600000); // última hora
    const ultimoMinuto = marcas.filter(ts => ahora - ts < 60000).length;

    if (ultimoMinuto >= LIMITE_MENSAJES_MINUTO || marcas.length >= LIMITE_MENSAJES_HORA) {
      logSeguridad("rate_limit_superado", { canal: identidad.canal, ultimoMinuto, ultimaHora: marcas.length });
      return true;
    }
    marcas.push(ahora);
    await fetch(`${FIREBASE}/rate_limit/${clave}.json`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ marcas: marcas.slice(-LIMITE_MENSAJES_HORA) })
    });
    return false;
  } catch (e) {
    logError("superaLimiteFrecuencia", e.message);
    return false; // ante un fallo del control, no bloqueamos a un cliente legítimo
  }
}

// identidad = { canal:'whatsapp', tel:'34661...' }  ó  { canal:'telegram', chatId:'123456' }
async function procesarConCerebro(identidad, texto, env) {
  if (await superaLimiteFrecuencia(identidad, env)) {
    return "Está enviando mensajes muy seguidos. Espere un momento, por favor.";
  }
  if (texto.length > LONGITUD_MAX_MENSAJE) {
    logSeguridad("mensaje_demasiado_largo", { canal: identidad.canal, longitud: texto.length });
    texto = texto.slice(0, LONGITUD_MAX_MENSAJE);
  }
  const memoria = await cargarMemoria(identidad, env);

  // BUG 2 corregido: el historial guardado solo contiene texto plano.
  let messages = (memoria.historial || []).concat([{ role:"user", content: texto }]);

  // BUG 4 corregido: bucle multi-turno para encadenar herramientas.
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
        const resultado = await ejecutarHerramienta(bloque.name, bloque.input || {}, identidad, env);
        resultados.push({ type:"tool_result", tool_use_id: bloque.id, content: resultado });
      }
    }

    if (!huboHerramienta) break;
    messages.push({ role:"assistant", content: respuesta.content });
    messages.push({ role:"user", content: resultados });
    textoFinal = "";
  }

  const salida = (textoFinal || "").trim() || "Disculpe, ¿me lo repite?";

  // Guardar SOLO texto plano (nunca bloques de herramienta)
  const historialLimpio = (memoria.historial || [])
    .concat([{ role:"user", content: texto }, { role:"assistant", content: salida }])
    .filter(m => typeof m.content === "string")
    .slice(-20);
  await guardarMemoria(identidad, { ...memoria, historial: historialLimpio, ultimo_contacto: Date.now() }, env);

  return salida;
}

async function llamarClaude(messages, env) {
  if (!env.ANTHROPIC_API_KEY) { logError("llamarClaude", "ANTHROPIC_API_KEY no configurada"); return null; }
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
    if (!r.ok) { logError("llamarClaude", `HTTP ${r.status}`); return null; }
    return await r.json();
  } catch (e) { logError("llamarClaude", e.message); return null; }
}

// ── Memoria: prefijada por canal para no mezclar identidades ──
function memKey(identidad) {
  return identidad.canal === "telegram" ? `telegram_${identidad.chatId}` : `whatsapp_${normalizarTel(identidad.tel)}`;
}
async function cargarMemoria(identidad, env) {
  try {
    const r = await fetch(`${FIREBASE}/agente_memoria/${memKey(identidad)}.json`);
    const actual = await r.json();
    if (actual) return actual;
    // Compatibilidad: si es WhatsApp, intenta la clave antigua sin prefijo (v1.0.5)
    if (identidad.canal === "whatsapp") {
      const r2 = await fetch(`${FIREBASE}/agente_memoria/${normalizarTel(identidad.tel)}.json`);
      return (await r2.json()) || {};
    }
    return {};
  } catch { return {}; }
}
async function guardarMemoria(identidad, memoria, env) {
  try {
    await fetch(`${FIREBASE}/agente_memoria/${memKey(identidad)}.json`, {
      method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(memoria)
    });
  } catch (e) { logError("guardarMemoria", e.message); }
}
async function actualizarPerfil(identidad, datos, env) {
  try {
    const tel = identidad.tel ? normalizarTel(identidad.tel) : (datos.tel ? normalizarTel(datos.tel) : null);
    if (!tel) return;
    const extra = identidad.canal === "telegram" ? { telegram_chat_id: identidad.chatId } : {};
    await fetch(`${FIREBASE}/perfiles/${tel}.json`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ ...datos, ...extra, actualizado: Date.now() })
    });
  } catch (e) { logError("actualizarPerfil", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  EJECUCIÓN DE HERRAMIENTAS (las mismas 7 de v1.0.5)
// ═══════════════════════════════════════════════════════════════
async function ejecutarHerramienta(nombre, input, identidad, env) {
  try {
    if (nombre === "identificar_usuario")     return await hIdentificar(identidad);
    if (nombre === "buscar_pedidos_cliente")  return await hBuscarPedidos(identidad, input.limite || 3);
    if (nombre === "calcular_precio")         return hCalcularPrecio(input.prendas, input.expres);
    if (nombre === "asignar_lavanderia")      return await hAsignarLavanderia(input.direccion);
    if (nombre === "consultar_estado_pedido") return await hConsultarEstado(input.ref);
    if (nombre === "crear_pedido")            return await hCrearPedido(input, identidad, env);
    if (nombre === "derivar_a_jeffrey")       return await hDerivar(input, identidad, env);
    return "Acción no reconocida.";
  } catch (e) {
    return "No he podido completar esa consulta ahora mismo.";
  }
}

// ─── identificar_usuario (funciona por teléfono en ambos canales;
//     en Telegram, si aún no conocemos el teléfono, busca por
//     telegram_chat_id vinculado en /perfiles) ───
// Intenta una consulta indexada (rápida); si Firebase responde con error
// porque el índice todavía no está aplicado en las reglas, cae automáticamente
// al escaneo completo de siempre. Nunca rompe — solo es más lento hasta que
// se actualicen las reglas (ver README, ".indexOn" nuevos).
async function buscarPorCampoIndexado(nodo, campo, valor) {
  try {
    const r = await fetch(`${FIREBASE}/${nodo}.json?orderBy="${campo}"&equalTo=${JSON.stringify(valor)}`);
    if (r.ok) return await r.json() || {};
    logError("buscarPorCampoIndexado", `Sin índice todavía en ${nodo}.${campo} (HTTP ${r.status}) — usando escaneo completo`);
  } catch (e) { logError("buscarPorCampoIndexado", e.message); }
  // Respaldo: escaneo completo (el comportamiento de siempre)
  try {
    const r = await fetch(`${FIREBASE}/${nodo}.json`);
    return await r.json() || {};
  } catch { return {}; }
}

async function hIdentificar(identidad) {
  let tel = identidad.tel ? normalizarTel(identidad.tel) : null;

  if (!tel && identidad.canal === "telegram") {
    try {
      const data = await buscarPorCampoIndexado("perfiles", "telegram_chat_id", identidad.chatId);
      for (const k of Object.keys(data)) {
        if (data[k] && data[k].telegram_chat_id === identidad.chatId) { tel = k; break; }
      }
    } catch (e) { logError("hIdentificar_telegram_lookup", e.message); }
  }
  if (!tel) return JSON.stringify({ tipo:"cliente_nuevo", conocido:false });

  try {
    const data = await buscarPorCampoIndexado("clientes_corporativos", "telefono", tel);
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
  } catch (e) { logError("hIdentificar_clientes", e.message); }
  try {
    const data = await buscarPorCampoIndexado("pedidos", "tel", tel);
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
  } catch (e) { logError("hIdentificar_pedidos", e.message); }
  return JSON.stringify({ tipo:"cliente_nuevo", conocido:false });
}

async function hBuscarPedidos(identidad, limite) {
  let tel = identidad.tel ? normalizarTel(identidad.tel) : null;
  if (!tel) return "No tengo un teléfono asociado a esta conversación todavía.";
  const data = await buscarPorCampoIndexado("pedidos", "tel", tel);
  const mios = Object.values(data)
    .filter(p => p && p.tel && normalizarTel(p.tel) === tel)
    .sort((a,b) => (b.ts||0) - (a.ts||0))
    .slice(0, limite);
  if (!mios.length) return "Esta persona no tiene pedidos registrados.";
  return mios.map(p =>
    `Ref ${p.ref}: ${ESTADOS_LEGIBLES[p.estado] || p.estado}. ${p.servicio || ""} · ${p.dir || ""} · ${p.total || ""}`
  ).join("\n");
}

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

async function hAsignarLavanderia(direccion) {
  const coords = await geocodificarAprox(direccion);
  if (!coords) {
    return JSON.stringify({ asignada:null, motivo:"sin_coordenadas", instruccion:"Crea el pedido sin lavandería. Di al cliente: 'Su recogida está registrada. Le confirmamos el horario en breve.'" });
  }
  const conDist = LAVANDERIAS.map(l => ({ ...l, km: distanciaKm(coords.lat, coords.lng, l.lat, l.lng) }))
                             .sort((a,b) => a.km - b.km);
  let ocupacion = {};
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json`);
    const data = await r.json() || {};
    for (const p of Object.values(data)) {
      if (!p || !p.local) continue;
      if (["entregado","cancelado"].includes(p.estado)) continue;
      ocupacion[p.local] = (ocupacion[p.local] || 0) + 1;
    }
  } catch (e) { logError("hAsignarLavanderia_ocupacion", e.message); }
  const dif = conDist[1] ? Math.abs(conDist[0].km - conDist[1].km) : 999;
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

async function hConsultarEstado(ref) {
  const r = await fetch(`${FIREBASE}/pedidos/${ref}.json`);
  const p = await r.json();
  if (!p) return "No encontré ningún pedido con ese código.";
  const estado = ESTADOS_LEGIBLES[p.estado] || p.estado;
  return `Pedido ${ref}: ${estado}. Dirección: ${p.dir || "—"}. Total: ${p.total || "—"}.`;
}

// BUG 3 corregido: estructura idéntica al motor único (mismos campos que
// cliente.html y despacho.html — verificado campo a campo)
async function hCrearPedido(input, identidad, env) {
  const ref = "LV" + Date.now().toString().slice(-6);
  const codigo = String(Math.floor(10 + Math.random() * 90));
  const lav = input.lavanderia || "";
  const pedido = {
    ref,
    tipo: input.tipo || "lavanderia",
    lavanderia: lav,
    local: lav,
    dir: input.dir,
    tel: input.tel || (identidad.tel ? normalizarTel(identidad.tel) : ""),
    nota: input.nota || "",
    servicio: input.servicio,
    total: input.total || "",
    codigo,
    estado: "pendiente",
    ts: Date.now(),
    prendas: input.prendas || {},
    origen: identidad.canal === "telegram" ? "telegram_agente" : "agente_whatsapp",
    telegram_notificado: false // usado por el módulo de notificación a riders (Fase 2/3)
  };
  if (identidad.canal === "telegram") pedido.telegramChatId = identidad.chatId;

  await fetch(`${FIREBASE}/pedidos/${ref}.json`, {
    method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(pedido)
  });
  log("pedido_creado", { ref, canal: identidad.canal, lavanderia_asignada: !!lav });
  await actualizarPerfil(identidad, { direccion_habitual: input.dir, ultimo_servicio: input.servicio, ultimo_pedido: ref, tel: input.tel }, env);

  const aviso = `NUEVO PEDIDO (Lavo Assistant · ${identidad.canal})\nRef: ${ref}\nDir: ${input.dir}\nTel: ${pedido.tel}\nServicio: ${input.servicio}\nLavandería: ${lav || "SIN ASIGNAR — decide despacho"}\nCódigo entrega: ${codigo}`;
  if (MODULOS.WHATSAPP) await enviarWhatsApp(ADMIN_WA, aviso, env);

  return `Pedido creado. Referencia ${ref}, código de entrega ${codigo}.${lav ? "" : " Sin lavandería asignada: lo decidirá el despacho, así que NO menciones ninguna al cliente."}`;
}

async function hDerivar(input, identidad, env) {
  const origenTxt = identidad.canal === "telegram" ? `Telegram (chat ${identidad.chatId})` : `WhatsApp (+${identidad.tel})`;
  const aviso = `ATENCIÓN REQUERIDA (Lavo Assistant)\nMotivo: ${input.motivo}\nDe: ${origenTxt}\n${input.resumen}`;
  log("derivacion_a_jeffrey", { motivo: input.motivo, canal: identidad.canal });

  if (MODULOS.WHATSAPP) await enviarWhatsApp(ADMIN_WA, aviso, env);

  // Fase 4: si Jeffrey tiene Telegram vinculado, además le llega una tarjeta con botones
  if (MODULOS.TELEGRAM_JEFFREY && JEFFREY_TELEGRAM_ID) {
    await enviarDerivacionJeffreyTelegram(input, identidad, env);
  }
  return "Jeffrey ha sido avisado. Dile a la persona que se pondrá en contacto en breve.";
}

// ═══════════════════════════════════════════════════════════════
//  CANAL: WHATSAPP (Fase 0) — mismo comportamiento que v1.0.5
// ═══════════════════════════════════════════════════════════════
async function procesarWhatsApp(from, texto, env) {
  try {
    const identidad = { canal:"whatsapp", tel: from };
    const salida = await procesarConCerebro(identidad, texto, env);
    await enviarWhatsApp(from, salida, env);
  } catch (e) {
    try { await enviarWhatsApp(from, "Disculpe, estamos teniendo un problema técnico. ¿Puede intentarlo en unos minutos?", env); } catch {}
  }
}
async function enviarWhatsApp(to, texto, env) {
  if (!env.D360_API_KEY) { logError("enviarWhatsApp", "D360_API_KEY no configurada"); return; }
  try {
    const r = await fetch(`https://waba-v2.360dialog.io/messages`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "D360-API-KEY": env.D360_API_KEY },
      body: JSON.stringify({ messaging_product:"whatsapp", to, type:"text", text:{ body: texto } })
    });
    if (!r.ok) logError("enviarWhatsApp", `HTTP ${r.status}`);
  } catch (e) { logError("enviarWhatsApp", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  CANAL: TELEGRAM — un solo webhook, cuatro roles + cliente
// ═══════════════════════════════════════════════════════════════
async function procesarTelegram(update, env) {
  try {
    // 1) Botón pulsado (callback_query)
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const rol = await identificarRolTelegram(chatId, env);
      if (rol.tipo === "rider" && MODULOS.TELEGRAM_RIDER) {
        await manejarCallbackRider(chatId, rol.riderKey, cq.data, cq.id, env);
      } else if (rol.tipo === "despacho" && MODULOS.TELEGRAM_DESPACHO) {
        await manejarCallbackDespacho(chatId, cq.data, cq.id, env);
      } else if (rol.tipo === "jeffrey" && MODULOS.TELEGRAM_JEFFREY) {
        await manejarCallbackJeffrey(chatId, cq.data, cq.id, env);
      } else if (cq.data === "cli_recogida" && MODULOS.TELEGRAM_CLIENTE) {
        // El botón del /start se traduce a la MISMA conversación con el cerebro
        // que si el cliente lo hubiera escrito — no es un flujo nuevo, es el mismo.
        await responderCallback(cq.id, "", env);
        await moduloTelegramCliente(chatId, "Quiero solicitar una recogida de lavandería.", env);
      } else if (cq.data === "cli_estado" && MODULOS.TELEGRAM_CLIENTE) {
        await responderCallback(cq.id, "", env);
        await moduloTelegramCliente(chatId, "Quiero consultar el estado de mi pedido.", env);
      } else {
        await responderCallback(cq.id, "", env);
      }
      return;
    }

    const msg = update.message;
    if (!msg) return;
    const chatId = msg.chat.id;

    // 2) Ubicación en vivo (rider) — Fase 2
    if (msg.location && MODULOS.TELEGRAM_RIDER) {
      const rol = await identificarRolTelegram(chatId, env);
      if (rol.tipo === "rider") { await guardarUbicacionRider(rol.riderKey, msg.location, env); return; }
    }

    // 3) Foto (entrega del rider) — Fase 2 (+ Fase 6b si hay visión)
    if (msg.photo && MODULOS.TELEGRAM_RIDER) {
      const rol = await identificarRolTelegram(chatId, env);
      if (rol.tipo === "rider") { await recibirFotoEntrega(chatId, rol.riderKey, msg.photo, env); return; }
    }

    // 4) Texto
    const texto = (msg.text || "").trim();
    if (!texto) return;

    const rol = await identificarRolTelegram(chatId, env);

    if (rol.tipo === "rider" && MODULOS.TELEGRAM_RIDER) {
      return await moduloTelegramRider(chatId, rol.riderKey, texto, env);
    }
    if (rol.tipo === "despacho" && MODULOS.TELEGRAM_DESPACHO) {
      return await moduloTelegramDespacho(chatId, texto, env);
    }
    if (rol.tipo === "jeffrey" && MODULOS.TELEGRAM_JEFFREY) {
      return await moduloTelegramJeffrey(chatId, texto, env);
    }
    if (rol.tipo === "admin" && MODULOS.TELEGRAM_ADMIN) {
      return await moduloTelegramAdmin(chatId, texto, env);
    }

    // Por defecto: cliente → el mismo cerebro que WhatsApp
    if (MODULOS.TELEGRAM_CLIENTE) {
      return await moduloTelegramCliente(chatId, texto, env);
    }
    // Si ni siquiera el módulo de cliente está activo, no hay nada que responder todavía
  } catch (e) { /* silencioso: nunca romper el webhook */ }
}

// ── Identificación de rol por chat_id ──
// DEFENSA EN PROFUNDIDAD: los roles de administración se comprueban PRIMERO
// contra variables de entorno de Cloudflare (imposibles de modificar desde
// fuera). Firebase solo se usa como respaldo, y sus nodos de permisos están
// marcados como no escribibles en firebase-rules.json.
async function identificarRolTelegram(chatId, env) {
  const id = String(chatId);
  try {
    // 1) Jeffrey: constante del código o variable de entorno
    if ((JEFFREY_TELEGRAM_ID && id === String(JEFFREY_TELEGRAM_ID)) ||
        (env.JEFFREY_CHAT_ID && id === String(env.JEFFREY_CHAT_ID))) {
      return { tipo:"jeffrey" };
    }
    // 2) Admin y despacho: listas separadas por comas en variables de entorno
    if (env.ADMIN_CHAT_IDS && env.ADMIN_CHAT_IDS.split(",").map(s => s.trim()).includes(id)) {
      return { tipo:"admin" };
    }
    if (env.DESPACHO_CHAT_IDS && env.DESPACHO_CHAT_IDS.split(",").map(s => s.trim()).includes(id)) {
      return { tipo:"despacho" };
    }
    // 3) Respaldo en Firebase (nodos con .write:false — no auto-inscribibles)
    const rAdmin = await fetch(`${FIREBASE}/admin_staff.json`);
    const admins = await rAdmin.json() || {};
    if (Object.values(admins).some(v => String(v) === String(chatId) || (v && v.chat_id === chatId))) {
      return { tipo:"admin" };
    }
    const rDesp = await fetch(`${FIREBASE}/despacho_staff.json`);
    const desp = await rDesp.json() || {};
    if (Object.values(desp).some(v => String(v) === String(chatId) || (v && v.chat_id === chatId))) {
      return { tipo:"despacho" };
    }
    const rRid = await fetch(`${FIREBASE}/riders_estado.json`);
    const riders = await rRid.json() || {};
    for (const [key, val] of Object.entries(riders)) {
      if (val && val.telegram_chat_id === chatId) return { tipo:"rider", riderKey: key };
    }
  } catch (e) { logError("identificarRolTelegram", e.message); }
  return { tipo:"cliente" };
}

async function enviarTelegram(chatId, texto, env, botones) {
  if (!env.TELEGRAM_TOKEN) { logError("enviarTelegram", "TELEGRAM_TOKEN no configurado"); return; }
  try {
    const body = { chat_id: chatId, text: texto, parse_mode: "Markdown" };
    if (botones) body.reply_markup = { inline_keyboard: botones };
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)
    });
    if (!r.ok) logError("enviarTelegram", `HTTP ${r.status}`, { chatId });
  } catch (e) { logError("enviarTelegram", e.message, { chatId }); }
}
async function responderCallback(callbackQueryId, texto, env) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: texto || "" })
    });
  } catch (e) { logError("responderCallback", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  UTILIDADES (idénticas a v1.0.5)
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
//  LOGS — formato JSON de una línea, pensado para reconstruir una
//  incidencia leyendo solo los logs de Cloudflare (Workers → Logs).
//  Sin datos sensibles completos (teléfonos truncados, sin mensajes
//  completos de cliente) para no dejar rastro innecesario.
// ═══════════════════════════════════════════════════════════════
function log(evento, datos) {
  try { console.log(JSON.stringify({ nivel:"info", evento, ts:new Date().toISOString(), ...(datos||{}) })); } catch {}
}
function logError(contexto, mensaje, extra) {
  try { console.error(JSON.stringify({ nivel:"error", contexto, mensaje:String(mensaje).slice(0,300), ts:new Date().toISOString(), ...(extra||{}) })); } catch {}
}
function logSeguridad(evento, detalle) {
  try { console.warn(JSON.stringify({ nivel:"seguridad", evento, ts:new Date().toISOString(), ...(detalle||{}) })); } catch {}
}

function normalizarTel(t) {
  return String(t || "").replace(/[^0-9]/g, "").replace(/^34/, "").slice(-9);
}
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
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

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 1 · TELEGRAM CLIENTE (usa el mismo cerebro)
// ═══════════════════════════════════════════════════════════════
async function moduloTelegramCliente(chatId, texto, env) {
  if (texto === "/start") {
    await enviarTelegram(chatId,
      "Hola, soy *Lavo Assistant*, el asistente digital oficial de LavoBCN. ¿En qué puedo ayudarle?",
      env,
      [[{ text:"🧺 Solicitar recogida", callback_data:"cli_recogida" }],
       [{ text:"📦 Consultar un pedido", callback_data:"cli_estado" }]]
    );
    return;
  }
  const identidad = { canal:"telegram", chatId };
  const salida = await procesarConCerebro(identidad, texto, env);
  await enviarTelegram(chatId, salida, env);
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 2 · TELEGRAM RIDER (botones deterministas)
//  El cerebro (Claude) SOLO se usa para incidencias en texto libre.
//  Aceptar/rechazar/entregar son instantáneos, sin IA.
// ═══════════════════════════════════════════════════════════════
async function moduloTelegramRider(chatId, riderKey, texto, env) {
  if (texto === "/start" || texto === "/pedidos") {
    return await mostrarPedidosPendientesRider(chatId, riderKey, env);
  }
  if (texto.startsWith("/entregar")) {
    const ref = texto.replace("/entregar", "").trim();
    if (!ref) { await enviarTelegram(chatId, "Escribe /entregar seguido de la referencia, por ejemplo: /entregar LV482913", env); return; }
    return await intentarEntregarPedido(chatId, riderKey, ref, env);
  }
  // Texto libre en modo rider → se trata como posible incidencia (SÍ pasa por el cerebro)
  const identidad = { canal:"telegram", chatId };
  const salida = await procesarConCerebro(identidad,
    `[Mensaje de un rider, posible incidencia] ${texto}`, env);
  await enviarTelegram(chatId, salida, env);
}

// Función única de entrega — la usan tanto el botón como el comando /entregar,
// para no duplicar la misma lógica en dos sitios.
async function intentarEntregarPedido(chatId, riderKey, ref, env) {
  const resultado = await escrituraCondicionada(
    `/pedidos/${ref}`,
    { estado:"entregado", tsEntregado: Date.now(), codigoVerificado:true, riderNombre: riderKey, rider: riderKey },
    (actual) => actual && actual.riderKey === riderKey && actual.estado !== "entregado"
  );
  if (resultado.ok) {
    log("rider_entrega", { ref, riderKey });
    // Libera el pedido activo del rider (queda listo para el siguiente)
    try {
      await fetch(`${FIREBASE}/riders_estado/${riderKey}.json`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ref_activo: null })
      });
    } catch (e) { logError("limpiar_ref_activo", e.message); }
    await enviarTelegram(chatId, `📦 ${ref} marcado como entregado. ¡Gracias!`, env);
  } else {
    await enviarTelegram(chatId, `No he podido marcar ${ref} como entregado (puede que ya estuviera marcado, o no era tuyo). Escribe /pedidos para ver tu situación.`, env);
  }
}

// Antes de aceptar, el rider ve solo la ZONA (calle sin número), no la dirección
// exacta del cliente. Al aceptar recibe la dirección completa. Reduce la exposición
// de datos personales: un rider no puede recopilar direcciones sin prestar servicio.
function zonaAproximada(dir) {
  if (!dir) return "—";
  // Corta en la primera cifra (el número de portal) y limpia separadores sueltos
  const sinNumero = String(dir).split(/\d/)[0].replace(/[,\s·-]+$/, "").trim();
  return sinNumero || "Sant Martí";
}

async function mostrarPedidosPendientesRider(chatId, riderKey, env) {
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json?orderBy="estado"&equalTo="pendiente"`);
    const data = await r.json() || {};
    // Un rider solo ve: los asignados a él, o los que no tienen rider asignado.
    // Nunca los asignados a otro compañero (evita fuga de datos entre riders).
    const pendientes = Object.entries(data).filter(([, p]) =>
      p && (!p.riderKey || p.riderKey === riderKey)
    );
    if (!pendientes.length) {
      await enviarTelegram(chatId, "No hay pedidos disponibles para ti ahora mismo.", env);
      return;
    }
    for (const [ref, p] of pendientes.slice(0, 5)) {
      await enviarTelegram(chatId,
        `📋 *${ref}*\n${p.servicio || p.tipo || ""}\n📍 ${zonaAproximada(p.dir)}`,
        env,
        [[{ text:"✅ Aceptar", callback_data:`ac_${ref}` }, { text:"❌ Rechazar", callback_data:`rc_${ref}` }]]
      );
    }
  } catch (e) { logError("mostrarPedidosPendientesRider", e.message); }
}

// ── ESCRITURA CONDICIONADA (evita que dos riders acepten el mismo pedido) ──
// Firebase soporta ETags: pides el dato con X-Firebase-ETag, y al escribir exiges
// esa misma huella con "if-match". Si alguien más escribió entre medias, la huella
// ya no coincide y Firebase devuelve 412 — la escritura se rechaza sola, sin que
// el código tenga que "llegar antes" que nadie. Es el propio servidor quien decide.
async function escrituraCondicionada(path, payload, condicion) {
  try {
    const rGet = await fetch(`${FIREBASE}${path}.json`, { headers: { "X-Firebase-ETag": "true" } });
    const etag = rGet.headers.get("ETag");
    const actual = await rGet.json();
    if (condicion && !condicion(actual)) return { ok:false, motivo:"condicion_no_cumplida", actual };
    if (!etag) {
      // Sin ETag no hay forma de garantizar la condición — no se escribe a ciegas.
      logError("escrituraCondicionada", "Firebase no devolvió ETag para " + path);
      return { ok:false, motivo:"sin_etag" };
    }
    const rPut = await fetch(`${FIREBASE}${path}.json`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json", "if-match": etag },
      body: JSON.stringify(payload)
    });
    if (rPut.status === 412) return { ok:false, motivo:"ya_modificado", actual };
    if (!rPut.ok) return { ok:false, motivo:"error_http_" + rPut.status };
    return { ok:true };
  } catch (e) {
    logError("escrituraCondicionada", e.message);
    return { ok:false, motivo:"excepcion" };
  }
}

async function manejarCallbackRider(chatId, riderKey, data, callbackQueryId, env) {
  const [accion, ref] = data.split("_");
  if (!ref) return await responderCallback(callbackQueryId, "Acción no reconocida.", env);

  if (accion === "ac") {
    // Solo se acepta si SIGUE pendiente en el momento exacto de escribir.
    const resultado = await escrituraCondicionada(
      `/pedidos/${ref}`,
      { estado:"aceptado", rider: riderKey, riderKey: riderKey },
      (actual) => actual && actual.estado === "pendiente"
    );
    if (resultado.ok) {
      log("rider_acepta", { ref, riderKey });
      // Guarda cuál es su pedido activo → lo usa recibirFotoEntrega para saber
      // a qué pedido asociar la foto (antes se leía este campo y nadie lo escribía).
      try {
        await fetch(`${FIREBASE}/riders_estado/${riderKey}.json`, {
          method:"PATCH", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ ref_activo: ref })
        });
      } catch (e) { logError("guardar_ref_activo", e.message); }
      await responderCallback(callbackQueryId, "Pedido aceptado", env);
      // Al aceptar SÍ recibe la dirección completa (antes solo veía la zona)
      let dirCompleta = "";
      try {
        const rp = await fetch(`${FIREBASE}/pedidos/${ref}.json`);
        const ped = await rp.json();
        dirCompleta = ped?.dir ? `\n📍 ${ped.dir}` : "";
        if (ped?.tel) dirCompleta += `\n📞 ${ped.tel}`;
      } catch (e) { logError("obtener_dir_completa", e.message); }
      await enviarTelegram(chatId,
        `✅ Aceptado ${ref}.${dirCompleta}\n\nCuando estés en camino, comparte tu ubicación en vivo desde el clip 📎.`,
        env,
        [[{ text:"📦 Marcar como entregado", callback_data:`entregar_${ref}` }]]
      );
    } else {
      log("rider_pierde_carrera", { ref, riderKey, motivo: resultado.motivo });
      await responderCallback(callbackQueryId, "Este pedido ya no está disponible", env);
      await enviarTelegram(chatId, `Ese pedido ya fue aceptado por otro compañero justo antes. Escribe /pedidos para ver los que quedan disponibles.`, env);
    }
  }

  if (accion === "rc") {
    // Solo puede rechazar quien lo tenga asignado (o si sigue libre, no hace nada).
    const resultado = await escrituraCondicionada(
      `/pedidos/${ref}`,
      { estado:"pendiente", rider:null, riderKey:null },
      (actual) => actual && actual.riderKey === riderKey
    );
    if (resultado.ok) {
      log("rider_rechaza", { ref, riderKey });
      await responderCallback(callbackQueryId, "Rechazado, vuelve a la cola", env);
    } else {
      await responderCallback(callbackQueryId, "Ese pedido no estaba asignado a ti", env);
    }
  }

  if (accion === "entregar") {
    await responderCallback(callbackQueryId, "Procesando...", env);
    await intentarEntregarPedido(chatId, riderKey, ref, env);
  }
}

// Ubicación en vivo: campos AÑADIDOS a /riders_estado/{riderKey} (no sustituye
// los campos existentes 'estado', 'ts', 'rider' que ya escribe rider.html)
async function guardarUbicacionRider(riderKey, location, env) {
  try {
    await fetch(`${FIREBASE}/riders_estado/${riderKey}.json`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ lat: location.latitude, lng: location.longitude, ubicacion_ts: Date.now() })
    });
  } catch (e) { logError("guardarUbicacionRider", e.message); }
}

// Foto de entrega: se guarda la referencia del archivo de Telegram en el pedido.
// Campo NUEVO y ADITIVO (foto_entrega) — no interfiere con nada existente.
async function recibirFotoEntrega(chatId, riderKey, photos, env) {
  const fileId = photos[photos.length - 1].file_id; // la de mayor resolución
  try {
    const r = await fetch(`${FIREBASE}/riders_estado/${riderKey}.json`);
    const est = await r.json() || {};
    const refActivo = est.ref_activo || null;
    if (refActivo) {
      await fetch(`${FIREBASE}/pedidos/${refActivo}.json`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ foto_entrega_telegram_id: fileId })
      });
    }
    if (MODULOS.INNOVACION_VISION_ENTREGA) {
      const veredicto = await verificarEntregaConVision(fileId, env);
      await enviarTelegram(chatId, veredicto, env);
    } else {
      await enviarTelegram(chatId, "📸 Foto recibida. Gracias.", env);
    }
  } catch (e) { logError("recibirFotoEntrega", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 3 · TELEGRAM DESPACHO (grupo, tiempo real por sondeo)
// ═══════════════════════════════════════════════════════════════
async function moduloTelegramDespacho(chatId, texto, env) {
  if (texto === "/start" || texto === "/pendientes") {
    return await mostrarPendientesDespacho(chatId, env);
  }
  await enviarTelegram(chatId, "Comandos disponibles: /pendientes — pedidos sin asignar ahora mismo, con botones para asignar rider.", env);
}

// Lista los pedidos sin rider y, para cada uno, un botón por cada rider
// vinculado a Telegram — así el botón "Asignar" que ya existía en el código
// (antes nunca se generaba) pasa a tener de verdad quien lo pulse.
async function mostrarPendientesDespacho(chatId, env) {
  try {
    const rp = await fetch(`${FIREBASE}/pedidos.json?orderBy="estado"&equalTo="pendiente"`);
    const pedidos = await rp.json() || {};
    const sinAsignar = Object.entries(pedidos).filter(([, p]) => p && !p.riderKey);
    if (!sinAsignar.length) { await enviarTelegram(chatId, "No hay pedidos sin asignar ahora mismo.", env); return; }

    const rr = await fetch(`${FIREBASE}/riders_estado.json`);
    const riders = await rr.json() || {};
    const ridersConTelegram = Object.entries(riders).filter(([, v]) => v && v.telegram_chat_id);

    for (const [ref, p] of sinAsignar.slice(0, 10)) {
      if (!ridersConTelegram.length) {
        await enviarTelegram(chatId, `📋 *${ref}*\n${p.servicio || p.tipo || ""}\n📍 ${p.dir || "—"}\n\n(Ningún rider tiene Telegram vinculado todavía)`, env);
        continue;
      }
      const botones = ridersConTelegram.map(([riderKey]) => ([{ text:`→ ${riderKey}`, callback_data:`asignar_${ref}_${riderKey}` }]));
      await enviarTelegram(chatId, `📋 *${ref}*\n${p.servicio || p.tipo || ""}\n📍 ${p.dir || "—"}`, env, botones);
    }
  } catch (e) { logError("mostrarPendientesDespacho", e.message); }
}

async function manejarCallbackDespacho(chatId, data, callbackQueryId, env) {
  const [accion, ref, riderKey] = data.split("_");
  if (accion !== "asignar" || !ref || !riderKey) return await responderCallback(callbackQueryId, "", env);

  // Solo asigna si el pedido SIGUE sin rider (evita pisar una asignación ya hecha).
  const resultado = await escrituraCondicionada(
    `/pedidos/${ref}`,
    { riderKey: riderKey },
    (actual) => actual && !actual.riderKey
  );
  if (!resultado.ok) {
    await responderCallback(callbackQueryId, "Ese pedido ya tenía rider asignado", env);
    return;
  }
  log("despacho_asigna", { ref, riderKey });
  await responderCallback(callbackQueryId, `Asignado a ${riderKey}`, env);
  await enviarTelegram(chatId, `✅ ${ref} asignado a ${riderKey}.`, env);

  // Avisa al rider igual que lo haría el sondeo automático — reutiliza el mismo
  // formato de mensaje, no crea un flujo de notificación nuevo.
  try {
    const rrEst = await fetch(`${FIREBASE}/riders_estado/${riderKey}.json`);
    const est = await rrEst.json();
    if (est && est.telegram_chat_id) {
      const rp = await fetch(`${FIREBASE}/pedidos/${ref}.json`);
      const p = await rp.json();
      await enviarTelegram(est.telegram_chat_id,
        `📋 *${ref}*\n${p?.servicio || p?.tipo || ""}\n📍 ${zonaAproximada(p?.dir)}`,
        env,
        [[{ text:"✅ Aceptar", callback_data:`ac_${ref}` }, { text:"❌ Rechazar", callback_data:`rc_${ref}` }]]
      );
    }
  } catch (e) { logError("aviso_rider_tras_asignar", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 4 · TELEGRAM JEFFREY (derivación con contexto)
// ═══════════════════════════════════════════════════════════════
async function enviarDerivacionJeffreyTelegram(input, identidadOrigen, env) {
  const id = "der_" + Date.now();
  try {
    await fetch(`${FIREBASE}/derivaciones/${id}.json`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ ...input, origen: identidadOrigen, estado:"pendiente", ts: Date.now() })
    });
  } catch (e) { logError("enviarDerivacionJeffreyTelegram", e.message); }
  await enviarTelegram(JEFFREY_TELEGRAM_ID,
    `🔔 *Atención requerida*\nMotivo: ${input.motivo}\n${input.resumen}`,
    env,
    [[{ text:"Marcar resuelto", callback_data:`jf_resuelto_${id}` }]]
  );
}
async function moduloTelegramJeffrey(chatId, texto, env) {
  await enviarTelegram(chatId, "Recibido. Las derivaciones llegan automáticamente con botones de acción.", env);
}
async function manejarCallbackJeffrey(chatId, data, callbackQueryId, env) {
  if (data.startsWith("jf_resuelto_")) {
    const id = data.replace("jf_resuelto_", "");
    try {
      await fetch(`${FIREBASE}/derivaciones/${id}.json`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ estado:"resuelto" })
      });
    } catch (e) { logError("manejarCallbackJeffrey", e.message); }
    await responderCallback(callbackQueryId, "Marcado como resuelto", env);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 5 · TELEGRAM ADMIN (comandos de consulta, sin IA)
// ═══════════════════════════════════════════════════════════════
async function moduloTelegramAdmin(chatId, texto, env) {
  if (texto === "/hoy") return await adminHoy(chatId, env);
  if (texto === "/riders") return await adminRiders(chatId, env);
  await enviarTelegram(chatId, "Comandos: /hoy · /riders", env);
}
async function adminHoy(chatId, env) {
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json`);
    const data = await r.json() || {};
    const hoy = new Date().toISOString().slice(0,10);
    const deHoy = Object.values(data).filter(p => p && p.ts && new Date(p.ts).toISOString().slice(0,10) === hoy);
    const porEstado = {};
    deHoy.forEach(p => { porEstado[p.estado] = (porEstado[p.estado]||0)+1; });
    const resumen = Object.entries(porEstado).map(([e,n]) => `${e}: ${n}`).join("\n") || "Sin pedidos hoy";
    await enviarTelegram(chatId, `📊 *Hoy*\nTotal: ${deHoy.length}\n${resumen}`, env);
  } catch { await enviarTelegram(chatId, "No he podido consultar los pedidos.", env); }
}
async function adminRiders(chatId, env) {
  try {
    const r = await fetch(`${FIREBASE}/riders_estado.json`);
    const data = await r.json() || {};
    const lista = Object.entries(data).map(([k,v]) => `${v.rider || k}: ${v.estado || "?"}`).join("\n") || "Sin datos";
    await enviarTelegram(chatId, `🛵 *Riders*\n${lista}`, env);
  } catch { await enviarTelegram(chatId, "No he podido consultar los riders.", env); }
}

// ═══════════════════════════════════════════════════════════════
//  SCHEDULED · Notificación de pedidos pendientes a riders/despacho.
//  ¿Por qué por sondeo y no "push instantáneo"? Un Worker no puede
//  quedarse escuchando Firebase entre peticiones. La forma honesta
//  y correcta de avisar de pedidos creados desde despacho.html o
//  cliente.html (que no pasan por este Worker) es un Cron Trigger
//  que revisa cada minuto. Ver README "Cron Trigger".
// ═══════════════════════════════════════════════════════════════
async function notificarPedidosPendientesTelegram(env) {
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json?orderBy="estado"&equalTo="pendiente"`);
    const data = await r.json() || {};
    const pendientes = Object.entries(data).filter(([, p]) => p && !p.telegram_notificado);
    if (!pendientes.length) return;

    // Se pide UNA sola vez, fuera del bucle (antes se repetía por cada pedido sin asignar).
    let staffDespacho = null;
    if (MODULOS.TELEGRAM_DESPACHO) {
      const rd = await fetch(`${FIREBASE}/despacho_staff.json`);
      staffDespacho = Object.values((await rd.json()) || {});
    }

    let avisados = 0;
    for (const [ref, p] of pendientes) {
      if (p.riderKey && MODULOS.TELEGRAM_RIDER) {
        const rr = await fetch(`${FIREBASE}/riders_estado/${p.riderKey}.json`);
        const rEst = await rr.json();
        if (rEst && rEst.telegram_chat_id) {
          await enviarTelegram(rEst.telegram_chat_id,
            `📋 *${ref}*\n${p.servicio || p.tipo || ""}\n📍 ${zonaAproximada(p.dir)}`,
            env,
            [[{ text:"✅ Aceptar", callback_data:`ac_${ref}` }, { text:"❌ Rechazar", callback_data:`rc_${ref}` }]]
          );
        }
      } else if (staffDespacho && staffDespacho.length) {
        for (const chatId of staffDespacho) {
          await enviarTelegram(chatId, `🆕 Pedido sin asignar: *${ref}*\n📍 ${p.dir || "—"}`, env);
        }
      }
      await fetch(`${FIREBASE}/pedidos/${ref}.json`, {
        method:"PATCH", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegram_notificado: true })
      });
      avisados++;
    }
    log("cron_notificaciones", { pendientes: pendientes.length, avisados });
  } catch (e) { logError("notificarPedidosPendientesTelegram", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 6a · Resumen nocturno automático (Cron Trigger)
// ═══════════════════════════════════════════════════════════════
async function resumenNocturno(env) {
  try {
    const r = await fetch(`${FIREBASE}/pedidos.json`);
    const data = await r.json() || {};
    const hoy = new Date().toISOString().slice(0,10);
    const deHoy = Object.values(data).filter(p => p && p.ts && new Date(p.ts).toISOString().slice(0,10) === hoy);
    const entregados = deHoy.filter(p => p.estado === "entregado").length;
    const pendientes = deHoy.filter(p => p.estado !== "entregado" && p.estado !== "cancelado").length;

    const resumen = `📊 *Resumen del día*\nPedidos totales: ${deHoy.length}\nEntregados: ${entregados}\nEn curso: ${pendientes}`;

    if (MODULOS.WHATSAPP) await enviarWhatsApp(ADMIN_WA, resumen.replace(/\*/g,""), env);
    if (MODULOS.TELEGRAM_JEFFREY && JEFFREY_TELEGRAM_ID) await enviarTelegram(JEFFREY_TELEGRAM_ID, resumen, env);
  } catch (e) { logError("resumenNocturno", e.message); }
}

// ═══════════════════════════════════════════════════════════════
//  MÓDULO — FASE 6b · Verificación de entrega con Claude Vision
// ═══════════════════════════════════════════════════════════════
// Convierte un buffer a base64 EN TROZOS. Hacerlo de golpe con
// String.fromCharCode(...bytes) revienta con "RangeError: Maximum call stack
// size exceeded" en cualquier foto de tamaño normal — lo confirmamos antes de
// corregirlo. 32 KB por trozo es un tamaño seguro muy por debajo del límite.
function bufferABase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32.768
  let binario = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binario);
}

const TAMANO_MAX_FOTO = 8 * 1024 * 1024; // 8 MB — margen amplio sobre una foto de móvil típica

async function verificarEntregaConVision(telegramFileId, env) {
  try {
    const rf = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/getFile?file_id=${telegramFileId}`);
    const fj = await rf.json();
    const filePath = fj?.result?.file_path;
    if (!filePath) { logError("verificarEntregaConVision", "Telegram no devolvió file_path"); return "📸 Foto recibida."; }
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${filePath}`;

    const imgResp = await fetch(fileUrl);
    const buffer = await imgResp.arrayBuffer();
    if (buffer.byteLength > TAMANO_MAX_FOTO) {
      logError("verificarEntregaConVision", `Foto demasiado grande: ${buffer.byteLength} bytes`);
      return "📸 Foto recibida (demasiado grande para verificar automáticamente).";
    }
    const base64 = bufferABase64(buffer);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({
        model:"claude-sonnet-5", max_tokens:100,
        messages:[{ role:"user", content:[
          { type:"image", source:{ type:"base64", media_type:"image/jpeg", data: base64 } },
          { type:"text", text:"¿Esta foto muestra claramente un paquete o prenda entregado (por ejemplo en una puerta, mano o mostrador)? Responde solo 'OK' o 'REVISAR: motivo breve'." }
        ]}]
      })
    });
    const j = await r.json();
    const texto = j?.content?.find(b => b.type === "text")?.text || "OK";
    return texto.startsWith("OK") ? "📸 Entrega verificada. ¡Gracias!" : `📸 Foto recibida. ${texto}`;
  } catch { return "📸 Foto recibida."; }
}
