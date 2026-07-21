# CHANGELOG — LavoBCN

## v1.0.0 — 13 julio 2026

Primera versión consolidada. Incluye todos los cambios (CAMBIO 1 al 8), sustituyendo los archivos antiguos.

### Cambios incluidos

| # | Archivo | Qué cambió |
|---|---------|------------|
| CAMBIO 1 | admin.html | Pestaña "🏨 Clientes" para abrir el módulo de clientes desde el panel admin |
| CAMBIO 2 | despacho.html | Persistencia reparada: guarda y recupera en el mismo nodo Firebase (fin de la pérdida de datos tipo 36€) |
| CAMBIO 3 | admin.html | kpi_params ahora se lee de Firebase (mismo nodo donde se escribe) |
| CAMBIO 4 | rider.html | Ruta del icono de notificación corregida (icon-192.png en la raíz) |
| CAMBIO 5 | admin-clientes.html | Sincronización en tiempo real (listener onValue) del módulo de clientes |
| CAMBIO 6 | despacho.html | Firebase autoritativo sobre localStorage para viajes |
| CAMBIO 7 | despacho.html | Despacho en tiempo real (onValue) + autoguardado solo-si-cambia; localStorage solo caché |
| CAMBIO 8 | despacho.html | Anti-ciclo lectura→escritura→lectura (sincronización de firma `_despachoSyncFirma`) |

### Estado de sincronización en tiempo real
- ✅ Personal de Lavandería (admin-clientes.html)
- ✅ Despacho (despacho.html)
- ⬜ Rider, Administración, Cliente (pendientes — siguiente en el plan)

### Verificado
- ✅ Sintaxis de los 6 HTML y módulos JS
- ✅ Inventario completo (0 archivos faltantes)
- ✅ Firebase: escrituras/lecturas en el mismo nodo
- ✅ Tiempo real: despacho y clientes sin recargar

### Pendiente (próximas versiones)
- Rider, Admin y Cliente a tiempo real
- Worker de Cloudflare (números dinámicos WhatsApp) — requiere su código
- Telegram como canal adicional
