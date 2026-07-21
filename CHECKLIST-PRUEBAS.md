# ✅ Checklist de Pruebas — LavoBCN (Modo QA)

> Cada cambio añade su bloque de pruebas. Ejecuta en **iPhone, Android y PC**.
> Marca: ✅ pasa · ❌ falla · ⚠️ limitación de plataforma.

---

## CAMBIO 6 — Despacho: Firebase autoritativo sobre localStorage (viajes)

**Qué se cambió:** el despacho ya no se queda con los viajes viejos de localStorage; si Firebase tiene viajes más nuevos del mismo día y lavandería, esos mandan.

**Archivo responsable:** despacho.html · función `cargar()`

### Pruebas

| # | Prueba | Cómo hacerla | Resultado esperado |
|---|--------|--------------|--------------------|
| 1 | Sincronización entre dispositivos | En PC, abre el despacho y añade 2 viajes a una lavandería. En iPhone/Android, abre el mismo despacho (misma lavandería, mismo día). | En el 2º dispositivo aparecen los viajes con el aviso "✅ N viajes sincronizados". |
| 2 | localStorage no impone datos viejos | En iPhone, deja 1 viaje. En PC, cambia a 3 viajes. Vuelve al iPhone y recarga. | El iPhone muestra los 3 viajes (Firebase gana por ser más nuevo), no el 1 viejo. |
| 3 | Arranque sin conexión | Pon el móvil en modo avión y abre el despacho. | Se ven los últimos viajes locales (arranque rápido), sin errores. |
| 4 | Mismo día / misma lavandería | Cambia de lavandería en el selector. | No se mezclan viajes de otra lavandería ni de otro día. |

### Cómo interpretar un fallo
- **Si en la prueba 2 gana el dato viejo** → el navegador cachea la versión antigua del archivo. Solución: abre con `?v=NÚMERO` nuevo, o borra caché. Si persiste tras subir el archivo, revisar `cargar()` en despacho.html.
- **Si no aparece nada en el 2º dispositivo (prueba 1)** → puede ser distinta lavandería/día, o sin internet. Verifica que ambos usen la misma lavandería y haya conexión.
- **Si da error o pantalla en blanco** → revisar consola del navegador; archivo responsable: despacho.html.

### Plataformas
- **PC (Chrome/Edge):** debe pasar 1–4.
- **Android (Chrome):** debe pasar 1–4.
- **iPhone (Safari/PWA):** debe pasar 1–4. *(No hay limitación de iOS en esta función: es solo lectura de datos.)*

---

## FASE 1 · PASO 2 — Despacho en tiempo real (onValue)

**Qué se cambió:** el despacho ahora usa un listener `onValue` sobre `/autosave/despacho`. Los viajes/rutas se actualizan solos entre dispositivos. El autoguardado ya no escribe cada 3 s (solo cuando cambia). localStorage es solo caché offline.

**Archivo responsable:** despacho.html

### Pruebas (iPhone · Android · PC)

| # | Prueba | Cómo hacerla | Resultado esperado |
|---|--------|--------------|--------------------|
| 1 | Viaje aparece al instante | Abre el despacho en 2 dispositivos (misma lavandería). En el A, añade un viaje. | En el B aparece **en 1–2 s sin recargar**. |
| 2 | Eliminar se propaga | En el A, quita un viaje. | En el B desaparece solo. |
| 3 | Cambio de vehículo/estado | En A, marca un viaje como enviado. | En B se refleja el cambio. |
| 4 | Sin conexión (caché) | Modo avión en un dispositivo, abre el despacho. | Se ven los últimos viajes (caché), sin error. Al volver la conexión, se sincroniza. |
| 5 | No hay parpadeo | Deja el despacho abierto sin tocar nada 1 min. | La lista no parpadea ni se recarga sola (el autosave ya no escribe cada 3 s). |
| 6 | Misma lavandería/día | En A cambia a Tintorería Prim y añade viaje. En B (en Perfect Clean). | El viaje de Prim NO aparece en la vista de Perfect Clean (no se mezclan). |

### Cómo interpretar un fallo
- **No aparece en el 2º dispositivo (prueba 1):** revisa que ambos tengan internet y la MISMA lavandería seleccionada. Si sigue, abre con `?v=` nuevo (caché vieja del archivo). Archivo: despacho.html.
- **Aparece con mucho retraso (>5 s):** conexión lenta, o el SDK de Firebase no cargó (mira si hay internet al abrir). Respaldo: sigue funcionando el guardado, pero sin vivo.
- **Parpadea o se recarga sola (prueba 5):** el autosave viejo seguía activo → confirma que subiste la versión nueva de despacho.html.
- **Se mezclan lavanderías (prueba 6):** error en el filtro `d.LAV !== LAV`; archivo despacho.html, función `escucharDespachoTiempoReal`.

### Limitaciones de plataforma
- **Ninguna específica de iOS** en esta función: onValue de Firebase funciona igual en Safari, Chrome y PC. Requiere internet (es tiempo real).

### Cómo comprobar que un viaje creado en un dispositivo aparece en los demás sin recargar
1. Abre `lavobcn.pages.dev/despacho.html?v=NUEVO` en el **PC** y en el **móvil** a la vez, ambos en Perfect Clean.
2. En el PC, añade un cliente/viaje y pulsa Recoger o Llevar.
3. **Sin tocar el móvil**, mira su pantalla: el viaje debe aparecer en la lista en 1–2 segundos.
4. Repite al revés (crea en el móvil, mira el PC).
5. Si aparece solo, sin recargar → ✅ tiempo real confirmado.

---

## CAMBIO 8 — Prueba anti-ciclo y anti-escrituras innecesarias (Despacho)

**Objetivo:** demostrar que (a) no hay escrituras cada 3 s sin cambios, y (b) no hay bucle lectura→escritura→lectura.

### Prueba A — Sin escrituras en reposo (PC, con herramientas de desarrollador)
1. Abre el despacho en PC (Chrome) → F12 → pestaña **Network** (Red), filtra por "autosave".
2. Deja el despacho quieto 30 segundos sin tocar nada.
3. **Esperado:** 0 peticiones PUT a `autosave/despacho` en reposo. (Antes salía una cada 3 s.)
4. Ahora añade un viaje. **Esperado:** aparece 1 PUT solo al añadir.
5. **Fallo si:** ves PUT cada 3 s sin tocar nada → no se subió la versión nueva (revisar `_ultimaFirmaAS`).

### Prueba B — Sin bucle entre dispositivos (iPhone/Android + PC)
1. Abre el despacho en 2 dispositivos, misma lavandería.
2. En el PC → F12 → Network filtro "autosave". En el A, añade un viaje.
3. **Esperado:** en A, 1 PUT (el cambio). En B, el viaje aparece y **NO** genera un PUT de vuelta (gracias a `_despachoSyncFirma`). La actividad se estabiliza; no hay PUT en cadena infinita.
4. **Fallo si:** ves PUT rebotando sin parar entre A y B → revisar el sincronizador de firma.

### Cómo interpretar
- **Reposo con PUT cada 3 s** → la comparación `_ultimaFirmaAS` no está activa (archivo viejo).
- **PUT en cadena infinita** → el listener está reescribiendo; revisar `_despachoSyncFirma` en despacho.html.
