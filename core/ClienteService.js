/**
 * ═══════════════════════════════════════════════════════════════
 *  LAVO·BCN — CORE · ClienteService
 *  /core/ClienteService.js
 * ═══════════════════════════════════════════════════════════════
 *  Capa de servicio: TODA la lógica de negocio de clientes.
 *  Patrón Service Layer. Usa firebase.js. NO conoce presentación
 *  (iconos/colores/textos viven en /config/clientes.config.js).
 *
 *  Molde para futuros: PedidoService, ViajeService, RiderService...
 * ═══════════════════════════════════════════════════════════════
 */

import { get, put, patch, del } from "./firebase.js";

const NODO = "clientes_corporativos";
const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 };

// Genera un id único (timestamp + sufijo aleatorio) para evitar colisiones
// si se crean dos clientes en el mismo milisegundo.
function nuevoId() {
  return "cc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

const ClienteService = {

  /** Lista clientes activos, filtrados y ordenados (prioridad + alfabético). */
  async listar(opciones = {}) {
    const data = (await get(NODO)) || {};
    let lista = Object.keys(data).map(k => data[k]);

    if (!opciones.incluirInactivos) lista = lista.filter(c => c.activo === true);
    if (!opciones.incluirOcasionales) lista = lista.filter(c => c.categoria_registro !== "ocasional");
    if (opciones.tipo && opciones.tipo !== "todos") lista = lista.filter(c => c.tipo === opciones.tipo);

    lista.sort((a, b) => {
      const pa = ORDEN_PRIORIDAD[a.prioridad] ?? 1;
      const pb = ORDEN_PRIORIDAD[b.prioridad] ?? 1;
      return pa - pb || (a.nombre || "").localeCompare(b.nombre || "");
    });
    return lista;
  },

  /** Obtiene un cliente por id. */
  async obtener(id) {
    return await get(`${NODO}/${id}`);
  },

  /** Crea o actualiza un cliente. Conserva fechas/estado/stats previos. */
  async guardar(datos, previo = {}) {
    const id = datos.id || nuevoId();
    const cliente = {
      id,
      nombre: datos.nombre || "",
      empresa: datos.empresa || "",
      tipo: datos.tipo || "otro",
      direccion: datos.direccion || "",
      coordenadas: datos.coordenadas || { lat: 0, lng: 0 },
      telefono: datos.telefono || "",
      persona_contacto: datos.persona_contacto || "",
      email: datos.email || "",
      horario: datos.horario || "",
      zona: datos.zona || "",
      vehiculo_recomendado: datos.vehiculo_recomendado || "moto",
      servicios_disponibles: datos.servicios_disponibles || [],
      estado: previo.estado || "activo",
      observaciones: datos.observaciones || "",
      prioridad: datos.prioridad || "media",
      color_identificativo: datos.color_identificativo || "#3b82f6",
      categoria_registro: datos.categoria_registro || "fijo",
      // Estadísticas (se conservan si ya existían)
      veces_usado: previo.veces_usado || 0,
      ultima_recogida: previo.ultima_recogida || null,
      ultimo_servicio: previo.ultimo_servicio || null,
      fecha_creacion: previo.fecha_creacion || Date.now(),
      fecha_ultima_actualizacion: Date.now(),
      activo: previo.activo !== undefined ? previo.activo : true
    };
    const res = await put(`${NODO}/${id}`, cliente);
    return { ok: res.ok, status: res.status, id, cliente };
  },

  /** Activa/desactiva sin borrar. */
  async toggleActivo(id, nuevoEstado) {
    const res = await patch(`${NODO}/${id}`, { activo: nuevoEstado, fecha_ultima_actualizacion: Date.now() });
    return res.ok;
  },

  /** Elimina definitivamente. */
  async eliminar(id) {
    const res = await del(`${NODO}/${id}`);
    return res.ok;
  },

  /** Busca por nombre, empresa o zona (case-insensitive). */
  async buscar(texto) {
    const t = (texto || "").toLowerCase().trim();
    if (!t) return await this.listar();
    const lista = await this.listar();
    return lista.filter(c =>
      (c.nombre || "").toLowerCase().includes(t) ||
      (c.empresa || "").toLowerCase().includes(t) ||
      (c.zona || "").toLowerCase().includes(t)
    );
  },

  /** Suma +1 al uso y registra última recogida/servicio. Llamar al crear viaje. */
  async incrementarUso(id, servicio) {
    const c = await this.obtener(id);
    if (!c) return false;
    const res = await patch(`${NODO}/${id}`, {
      veces_usado: (c.veces_usado || 0) + 1,
      ultima_recogida: Date.now(),
      ultimo_servicio: servicio || c.ultimo_servicio || null,
      fecha_ultima_actualizacion: Date.now()
    });
    return res.ok;
  },

  /** Clientes ordenados por frecuencia de uso (para favoritos ★). */
  async masUtilizados(limite = 5) {
    const lista = await this.listar();
    return lista
      .filter(c => (c.veces_usado || 0) > 0)
      .sort((a, b) => (b.veces_usado || 0) - (a.veces_usado || 0))
      .slice(0, limite);
  }
};

export default ClienteService;
