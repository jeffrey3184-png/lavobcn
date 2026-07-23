/**
 * lavo-notificador — Emisor de notificaciones push (Cloudflare Worker)
 * ───────────────────────────────────────────────────────────────────
 * Recibe una petición y envía la notificación a los móviles correctos
 * usando la API oficial FCM HTTP v1 de Google.
 *
 * Endpoint:  POST /enviar
 * Body:      { rol:"rider"|"cliente", id?:"lavo2001", title, body, data? }
 *            - con id  → avisa a ese dispositivo
 *            - sin id  → avisa a TODOS los de ese rol (ej: todos los riders)
 *   o bien:  { tokens:["..."], title, body, data? }
 *
 * SECRETO necesario en Cloudflare:
 *   FCM_SERVICE_ACCOUNT  → el JSON completo de la cuenta de servicio
 *                          (Firebase → Config → Cuentas de servicio → Generar clave privada)
 */

const PROJECT_ID = "lavobcn";
const FIREBASE = "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app";

// ── Utilidades base64url ──
function b64url(buf) {
  let s = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToBuf(str) { return new TextEncoder().encode(str); }

// Convierte la private key PEM (PKCS#8) a ArrayBuffer
function pemToBuf(pem) {
  const limpio = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                    .replace(/-----END PRIVATE KEY-----/, '')
                    .replace(/\s/g, '');
  const bin = atob(limpio);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Genera un token OAuth2 de Google a partir de la cuenta de servicio
async function getAccessToken(sa) {
  const ahora = Math.floor(Date.now() / 1000);
  const header = b64url(strToBuf(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(strToBuf(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600
  })));
  const unsigned = header + "." + claim;

  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBuf(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, strToBuf(unsigned));
  const jwt = unsigned + "." + b64url(sig);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error("OAuth falló: " + JSON.stringify(json));
  return json.access_token;
}

// Resuelve los tokens de destino desde Firebase
async function resolverTokens(body) {
  if (Array.isArray(body.tokens)) return body.tokens.filter(Boolean);
  if (!body.rol) return [];
  if (body.id) {
    const r = await fetch(`${FIREBASE}/tokens/${body.rol}/${body.id}.json`);
    const v = await r.json();
    return v && v.token ? [v.token] : [];
  }
  // Sin id → todos los de ese rol
  const r = await fetch(`${FIREBASE}/tokens/${body.rol}.json`);
  const v = await r.json() || {};
  return Object.values(v).map(x => x && x.token).filter(Boolean);
}

// Envía una notificación a un token concreto
async function enviarUno(accessToken, token, title, body, data) {
  const payload = {
    message: {
      token: token,
      notification: { title: title, body: body },
      data: data || {},
      webpush: {
        fcm_options: { link: (data && data.url) || "/" },
        notification: { icon: "/icon-192.png" }
      }
    }
  };
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (resp.ok) return { ok: true };
  const textoError = await resp.text().catch(() => "sin detalle");
  return { ok: false, error: textoError };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // ── ENDPOINT WhatsApp via CallMeBot ──────────────────────────────
    // POST /whatsapp  { text: "mensaje" }
    // Requiere secreto CALLMEBOT_APIKEY en Cloudflare Worker
    if (url.pathname === "/whatsapp" && request.method === "POST") {
      try {
        const body = await request.json();
        const texto = body.text || "";
        const apikey = env.CALLMEBOT_APIKEY || "APIKEY";
        const phone = "34661041439";
        const cbUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(texto)}&apikey=${apikey}`;
        const r = await fetch(cbUrl);
        const ok = r.status === 200;
        return new Response(JSON.stringify({ ok, status: r.status }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/enviar" && request.method === "POST") {
      try {
        if (!env.FCM_SERVICE_ACCOUNT) throw new Error("Falta el secreto FCM_SERVICE_ACCOUNT");
        const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
        const body = await request.json();

        const tokens = await resolverTokens(body);
        if (tokens.length === 0)
          return new Response(JSON.stringify({ ok: false, error: "Sin destinatarios" }),
            { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

        const accessToken = await getAccessToken(sa);
        let enviados = 0;
        let erroresVistos = [];
        for (const t of tokens) {
          const r = await enviarUno(accessToken, t, body.title || "LavoBCN", body.body || "", body.data);
          if (r.ok) enviados++;
          else erroresVistos.push(r.error);
        }
        return new Response(JSON.stringify({ ok: true, enviados, total: tokens.length, errores: erroresVistos }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // Prueba rápida: abre /test en el navegador y envía un aviso a tus clientes
    if (url.pathname === "/test") {
      try {
        if (!env.FCM_SERVICE_ACCOUNT) throw new Error("Falta el secreto FCM_SERVICE_ACCOUNT");
        const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
        const rol = url.searchParams.get("rol") || "cliente";
        const tokens = await resolverTokens({ rol: rol });
        if (!tokens.length) return new Response("Sin dispositivos registrados como " + rol + ".", { headers: cors });
        const at = await getAccessToken(sa);
        let n = 0;
        let erroresVistos = [];
        for (const t of tokens) {
          const r = await enviarUno(at, t, "LavoBCN 🎉", "¡Tus notificaciones funcionan!", {});
          if (r.ok) n++;
          else erroresVistos.push(r.error);
        }
        let texto = "Enviado a " + n + " de " + tokens.length + " móvil(es). Mira tu pantalla 📲";
        if (erroresVistos.length) texto += "\n\nMotivo del fallo: " + erroresVistos.join(" | ");
        return new Response(texto, { headers: cors });
      } catch (e) {
        return new Response("Error: " + String(e), { status: 500, headers: cors });
      }
    }

    // Aviso personalizado por enlace: /avisar?rol=rider&t=Titulo&m=Mensaje
    // o para un cliente: /avisar?rol=cliente&id=34...&t=Titulo&m=Mensaje
    if (url.pathname === "/avisar") {
      try {
        if (!env.FCM_SERVICE_ACCOUNT) throw new Error("Falta el secreto FCM_SERVICE_ACCOUNT");
        const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
        const rol = url.searchParams.get("rol") || "rider";
        const id = url.searchParams.get("id") || "";
        const titulo = url.searchParams.get("t") || "LavoBCN";
        const mensaje = url.searchParams.get("m") || "";
        const filtro = id ? { rol: rol, id: id } : { rol: rol };
        const tokens = await resolverTokens(filtro);
        if (!tokens.length) return new Response("Sin dispositivos para " + rol + (id ? " " + id : ""), { headers: cors });
        const at = await getAccessToken(sa);
        let n = 0;
        let erroresVistos = [];
        for (const t of tokens) {
          const r = await enviarUno(at, t, titulo, mensaje, {});
          if (r.ok) n++; else erroresVistos.push(r.error);
        }
        let texto = "Enviado a " + n + " de " + tokens.length + " dispositivo(s).";
        if (erroresVistos.length) texto += " Motivo: " + erroresVistos.join(" | ");
        return new Response(texto, { headers: cors });
      } catch (e) {
        return new Response("Error: " + String(e), { status: 500, headers: cors });
      }
    }

    return new Response("LAVO Notificador activo. POST /enviar", { headers: cors });
  }
};
