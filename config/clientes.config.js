/**
 * ═══════════════════════════════════════════════════════════════
 *  LAVO·BCN — CONFIG · Presentación de Clientes
 *  /config/clientes.config.js
 * ═══════════════════════════════════════════════════════════════
 *  SOLO configuración visual: iconos, colores, textos, opciones.
 *  NO contiene lógica de datos ni acceso a Firebase.
 *  Lo consume la INTERFAZ (despacho, admin), nunca el servicio.
 * ═══════════════════════════════════════════════════════════════
 */

// Tipos de cliente (icono + nombre visible)
export const TIPOS = [
  { id: "lavanderia",  nombre: "Lavandería",  icono: "🧺" },
  { id: "hotel",       nombre: "Hotel",       icono: "🏨" },
  { id: "empresa",     nombre: "Empresa",     icono: "🏢" },
  { id: "clinica",     nombre: "Clínica",     icono: "🏥" },
  { id: "restaurante", nombre: "Restaurante", icono: "🍽️" },
  { id: "comercio",    nombre: "Comercio",    icono: "🏪" },
  { id: "residencia",  nombre: "Residencia",  icono: "🏡" },
  { id: "hospital",    nombre: "Hospital",    icono: "🚑" },
  { id: "otro",        nombre: "Otro",        icono: "📦" }
];

// Servicios disponibles (id + nombre visible)
export const SERVICIOS = [
  { id: "lavanderia", nombre: "Lavandería" },
  { id: "mototaxi",   nombre: "Moto Taxi" },
  { id: "mensajeria", nombre: "Mensajería" },
  { id: "paqueteria", nombre: "Paquetería" },
  { id: "recogidas",  nombre: "Recogidas" },
  { id: "entregas",   nombre: "Entregas" },
  { id: "especiales", nombre: "Servicios especiales" }
];

// Prioridades (con color y peso de orden)
export const PRIORIDADES = [
  { id: "alta",  nombre: "Alta",  icono: "⭐", orden: 0 },
  { id: "media", nombre: "Media", icono: "",   orden: 1 },
  { id: "baja",  nombre: "Baja",  icono: "",   orden: 2 }
];

// Vehículos recomendados
export const VEHICULOS = [
  { id: "moto",  nombre: "Moto",  icono: "🏍️" },
  { id: "patin", nombre: "Patín", icono: "🛴" },
  { id: "auto",  nombre: "Coche", icono: "🚗" },
  { id: "bici",  nombre: "Bici",  icono: "🚲" }
];

// Categoría de registro
export const CATEGORIAS = [
  { id: "fijo",      nombre: "Cliente fijo" },
  { id: "ocasional", nombre: "Cliente ocasional" }
];

// Colores sugeridos por tipo (para el color_identificativo por defecto)
export const COLORES_TIPO = {
  lavanderia: "#3b82f6",
  hotel:      "#059669",
  empresa:    "#8b5cf6",
  clinica:    "#06b6d4",
  restaurante:"#f59e0b",
  comercio:   "#d4af37",
  residencia: "#ec4899",
  hospital:   "#ef4444",
  otro:       "#64748b"
};

// Helpers de presentación (para la UI)
export function iconoTipo(tipoId) {
  const t = TIPOS.find(x => x.id === tipoId);
  return t ? t.icono : "📦";
}
export function nombreTipo(tipoId) {
  const t = TIPOS.find(x => x.id === tipoId);
  return t ? t.nombre : "Otro";
}
export function colorTipo(tipoId) {
  return COLORES_TIPO[tipoId] || "#3b82f6";
}
export function nombreServicio(srvId) {
  const s = SERVICIOS.find(x => x.id === srvId);
  return s ? s.nombre : srvId;
}
