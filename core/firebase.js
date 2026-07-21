/**
 * ═══════════════════════════════════════════════════════════════
 *  LAVO·BCN — CORE · Conexión Firebase (base compartida)
 *  /core/firebase.js
 * ═══════════════════════════════════════════════════════════════
 *  Base para TODOS los servicios (ClienteService hoy;
 *  PedidoService, ViajeService, etc. en el futuro).
 *  Centraliza la URL y los helpers REST para no repetirlos.
 *
 *  Firebase Realtime Database = única fuente de verdad.
 * ═══════════════════════════════════════════════════════════════
 */

export const FIREBASE_URL = "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app";

/** GET — lee un nodo. Devuelve el dato o null. */
export async function get(ruta) {
  try {
    const r = await fetch(`${FIREBASE_URL}/${ruta}.json`);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

/** PUT — crea o reemplaza un nodo completo. */
export async function put(ruta, datos) {
  try {
    const r = await fetch(`${FIREBASE_URL}/${ruta}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/** PATCH — actualiza solo algunos campos de un nodo. */
export async function patch(ruta, campos) {
  try {
    const r = await fetch(`${FIREBASE_URL}/${ruta}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos)
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/** DELETE — elimina un nodo. */
export async function del(ruta) {
  try {
    const r = await fetch(`${FIREBASE_URL}/${ruta}.json`, { method: "DELETE" });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}
