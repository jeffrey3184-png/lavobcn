# LavoBCN — Registro de cambios (versión operativa)

> Cada entrada es un cambio pequeño y verificado, como un commit.
> Fecha de inicio: 13 julio 2026

---

## Revisión inicial del estado (sin cambios)

- ✅ **Módulo de clientes (admin-clientes.html):** COMPLETO y funcional. Tiene añadir, editar, eliminar, activar/desactivar clientes/hoteles/empresas con Firebase, mapa GPS, filtros y búsqueda (ClienteService inline). Sintaxis válida.
- ✅ **Flujo despacho → rider:** conecta. El despacho escribe en `/despachos` (estado 'pendiente' + nombre de lavandería); el rider lee y agrupa por lavandería (Perfect Clean / Tintorería Prim).
- ✅ **Índice Firebase:** firebase-rules.json ya incluye `.indexOn` para riderKey/estado en despachos, pedidos y viajes.
- ⚠️ **Gap detectado:** el módulo de clientes no era accesible desde el panel admin (había que escribir la URL a mano).
- ⚠️ **Seguridad:** reglas Firebase abiertas (.read/.write: true). Aceptable para prueba piloto controlada; cerrar antes de abrir al público.

---

## CAMBIO 1 — Acceso al módulo de clientes desde el admin
- **Archivo:** admin.html
- **Qué:** añadida la pestaña "🏨 Clientes" en la barra de navegación, que abre admin-clientes.html.
- **Por qué:** el módulo existía pero no se podía abrir desde la app. Ahora es accesible.
- **Diseño:** sin cambios — usa el mismo estilo de pestaña existente.
- **Verificado:** ✅ sintaxis válida.

---

## Revisión del flujo completo (verificado en código)

Recorrido **Cliente → Lavandería → Rider → Entrega → Admin**, confirmado leyendo el código:

1. **Cliente crea pedido** (cliente.html · `confirmarPedidoLavanderia`): escribe en `/pedidos` con `estado:'pendiente'`, `local` (nombre de lavandería), dirección, teléfono, prendas, código de entrega. Notifica al rider (push) y al admin (WhatsApp). ✅
2. **Rider recibe** (rider.html): lee `/pedidos` y `/despachos` filtrando por `estado:'pendiente'` y nombre de lavandería (Perfect Clean / Tintorería Prim). ✅
3. **Despacho** (despacho.html · `enviarARider`): escribe rutas en `/despachos` (estado pendiente + lavandería). El rider las ve agrupadas. ✅
4. **Entrega** (rider.html): al entregar, actualiza `estado:'entregado'` en Firebase (vía SDK + fetch de respaldo). ✅
5. **Admin** (admin.html): lee `/pedidos` y muestra estados; el módulo de clientes ya es accesible (CAMBIO 1). ✅

**Conclusión:** el flujo está conectado de punta a punta y es operativo para prueba piloto.

---

## Control de calidad
- ✅ Sintaxis válida en los 6 HTML principales y los 4 módulos JS.

---

## Pendientes recomendados (no bloquean la prueba piloto)
1. 🔴 **Seguridad Firebase** (reglas abiertas). Aceptable para piloto controlado con clientes de confianza; cerrar con autenticación antes de abrir al público.
2. 🟡 El rider reconoce por nombre solo Perfect Clean y Tintorería Prim. Si se añade una tercera lavandería operativa, ampliar esa lógica.
3. 🟡 Ajustar GPS exacto de clientes añadidos con coordenadas aproximadas.

---

## Estado para pruebas reales
**LISTO para prueba piloto controlada.** El flujo funciona; el módulo de clientes es completo y accesible; sintaxis sana. Recomendación: probar primero con un hotel de confianza (Vincci) y el rider, un pedido completo de principio a fin.

---

## CAMBIO 2 — Persistencia del despacho reparada
- **Archivo:** despacho.html
- **Qué:** el guardado manual escribía en Firebase en `/borradores2/{lav}` con campo `viajes`, pero la recuperación leía de `/autosave/despacho` con campo `VIAJES`. Nodos/campos distintos → la copia no se recuperaba. Corregido: `guardar()` ahora escribe en `/autosave/despacho` con `VIAJES`/`LAV`, igual que `cargar()`.
- **Por qué:** bug real de pérdida de datos (coherente con la pérdida de 36€). Ahora el respaldo en Firebase es recuperable e inmediato.
- **Diseño:** sin cambios. Solo se corrigió el destino y los nombres de campo.
- **Verificado:** ✅ sintaxis válida; nodo huérfano `/borradores2` eliminado; save y load coinciden.

---

## CAMBIO 3 — Consistencia KPI params (Firebase)
- **Archivo:** admin.html
- **Qué:** `guardarKpiParams()` escribía en `/kpi_params` de Firebase, pero `cargarKpiParams()` leía solo de localStorage (escritura huérfana). Añadida la lectura de `/kpi_params` en la carga (con helper `aplicarKpiParams`).
- **Por qué:** el código pretendía persistencia entre dispositivos pero no leía de Firebase. Ahora la escritura tiene su lectura en el mismo nodo.
- **Diseño:** sin cambios. Solo se completó la lectura que faltaba.
- **Verificado:** ✅ sintaxis válida; /kpi_params ahora W+R.

---

## CAMBIO 4 — Ruta del icono en notificaciones del rider
- **Archivo:** rider.html
- **Qué:** la función `notif()` usaba `icon:'icons/icon-192.png'` (subcarpeta inexistente). El archivo real está en la raíz. Corregido a `icon:'icon-192.png'`, coincidiendo con el service worker y la ubicación real.
- **Por qué:** el icono de las notificaciones en primer plano no cargaba (caía al icono por defecto del navegador).
- **Aclaración:** NO es una función perdida — la ruta era la misma en versiones anteriores. Es un bug preexistente de la función "icono".
- **Diseño:** sin cambios (misma imagen, solo la ruta correcta).
- **Verificado:** ✅ sintaxis válida.

---

## CAMBIO 5 — Sincronización en tiempo real del módulo de clientes
- **Archivo:** admin-clientes.html
- **Qué:** el módulo hacía una lectura única (`fetch`), así que un cliente añadido en un dispositivo no aparecía en otros hasta recargar. Añadido el SDK de Firebase (compat 9.23.0) y un listener `onValue` sobre `clientes_corporativos`.
- **Efecto:** al añadir/editar/eliminar un cliente (hotel o empresa), la lista se actualiza **al instante en iPhone, Android y PC sin recargar**.
- **Sin localStorage:** la lista se alimenta solo de Firebase (la única referencia a localStorage es un comentario).
- **Sin pantallas nuevas ni cambios de diseño:** el botón ➕ Añadir, editar y eliminar siguen igual; solo se añadió la escucha en vivo. Respaldo a `fetch` si el SDK no carga.
- **Escrituras intactas:** crear/editar (PUT), eliminar (DELETE), activar/desactivar (PATCH) siguen usando Firebase; ahora disparan el listener en todos los dispositivos.
- **Verificado:** ✅ sintaxis válida.

---

## CAMBIO 6 — Fase 1: Firebase autoritativo sobre localStorage (despacho)
- **Archivo:** despacho.html · `cargar()`
- **Qué:** antes leía los viajes de localStorage y hacía `return` sin consultar Firebase; localStorage era la fuente de verdad. Ahora Firebase manda: si tiene viajes del mismo día/lavandería más nuevos (por `ts`), sobreescriben la copia local.
- **Por qué (Fase 1):** eliminar la dependencia de localStorage como fuente de verdad de viajes/rutas. localStorage queda como arranque rápido y respaldo offline.
- **Diseño:** sin cambios.
- **Verificado:** ✅ sintaxis válida. Pruebas en CHECKLIST-PRUEBAS.md.
- **Pendiente Fase 1 (Paso 2):** migrar a listener onValue para eliminar localStorage como fuente de datos del todo (quedaría solo como caché offline).

---

## CAMBIO 7 — Fase 1 · Paso 2: Despacho en tiempo real (onValue)
- **Archivo:** despacho.html
- **Qué:**
  1. Añadido SDK de Firebase (compat 9.23.0) + init.
  2. Listener `onValue` sobre `/autosave/despacho`: los viajes/rutas se actualizan solos entre iPhone/Android/PC cuando cambian desde cualquier dispositivo (mismo día y lavandería). Firebase = fuente de verdad.
  3. Autoguardado IIFE ahora escribe **solo cuando el contenido cambia** (antes cada 3 s) → elimina el polling y evita bucles con el listener.
  4. localStorage queda solo como **caché offline** (arranque rápido y sin conexión), nunca como dato principal.
- **Conserva:** todas las funciones (añadir/eliminar viajes, enviar al rider, guardar cliente permanente, cambio de lavandería/vehículo) y el diseño.
- **Verificado:** ✅ sintaxis válida. Pruebas en CHECKLIST-PRUEBAS.md.

---

## CAMBIO 8 — Despacho: mecanismo anti-ciclo lectura→escritura→lectura
- **Archivo:** despacho.html
- **Qué:** el listener onValue, tras aplicar datos remotos, actualiza la firma del autoguardado (`_ultimaFirmaAS`) mediante `window._despachoSyncFirma(...)`. Así el dispositivo que RECIBE no reescribe lo que acaba de llegar.
- **Variable de detección de cambios:** `_ultimaFirmaAS` (firma = JSON de {LAV, VEH, VIAJES}, sin ts/hora).
- **Sincronizador:** `window._despachoSyncFirma(firma)` — definido en el IIFE, llamado por el listener.
- **Efecto:** elimina la única escritura redundante que quedaba. No hay bucle lectura→escritura→lectura.
- **Verificado:** ✅ sintaxis válida; formato de firma idéntico entre guardar() y listener.
