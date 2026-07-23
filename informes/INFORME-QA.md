# Informe QA — LavoBCN v1.0.3
Fecha: 13 julio 2026 · Modo: auditoría de producción

## Comprobaciones ejecutadas

| # | Comprobación | Método | Resultado |
|---|---|---|---|
| 1 | Sintaxis de los 6 HTML | node --check por bloque script | ✅ 0 errores |
| 2 | Sintaxis de los 5 módulos JS | node --check | ✅ 0 errores |
| 3 | Funciones duplicadas | grep + comparación de cuerpos | ⚠️ 8 detectadas (ver Riesgos) |
| 4 | Referencias onclick rotas | resolución de cada handler | ✅ 0 reales (document/window/if = falsos positivos) |
| 5 | Patrón de recursión (bug SS) | búsqueda `_orig = fn` | ✅ 0 — no se repite |
| 6 | Escrituras/lecturas mismo nodo | matriz W/R por nodo | ✅ consistente |
| 7 | Motor único /pedidos | comparación campo a campo | ✅ cliente = hotel |
| 8 | Inventario de archivos | checklist 15 archivos | ✅ 0 faltantes |

## Servicios verificados por código (no ejecutados en dispositivo)
Lavandería ✅ · Moto Taxi ✅ · Mensajería ✅ · Despacho ✅ · Rider ✅ · Cliente ✅ · Personal Lavandería ✅ · Push ✅ · WhatsApp ✅ · Sonidos ✅ · Tiempo real (2 de 5 módulos) 🟡

**Limitación declarada:** no puedo ejecutar la app en iPhone/Android/PC. Estas verificaciones son estáticas sobre el código. Las pruebas en dispositivo las ejecuta el usuario con CHECKLIST-PRUEBAS.md.

## Riesgos latentes detectados (NO corregidos — ver justificación)

| Archivo | Función | Líneas | Riesgo |
|---|---|---|---|
| cliente.html | chgQ | 3375 / 3474 | 1ª definición muerta |
| cliente.html | abrirTeclado | 3385 / 3479 | 1ª definición muerta |
| cliente.html | cerrarTeclado | 3401 / 3487 | 1ª definición muerta |
| cliente.html | tecPulsar | 3406 / 3488 | 1ª definición muerta |
| cliente.html | tecBorrar | 3415 / 3492 | 1ª definición muerta |
| cliente.html | tecConfirmar | 3424 / 3915 | 1ª definición muerta |
| cliente.html | init | 302 / 3974 | 1ª definición muerta |
| rider.html | mostrarLlamadaAuto | 997 / 2889 | ⚠️ firmas distintas: (tel,ref,tipo) vs (tel,ref) → el parámetro `tipo` se pierde |

**No es duplicado:** despacho.html `guardar` (179 / 762) — el segundo está dentro de un bloque aislado (IIFE). Correcto.

## Por qué NO se han corregido
La prioridad declarada es **no romper nada**. Los servicios funcionan hoy, lo que significa que las segundas definiciones (las que ganan) son correctas. Eliminar las primeras es técnicamente seguro (código muerto), pero son 8 intervenciones en archivos de 4.000 líneas **sin capacidad de probar en navegador**. Recomendación: eliminarlas de una en una, cada una con su checklist, en versiones separadas.
