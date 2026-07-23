# Informe Cloudflare Worker — LavoBCN

## Estado actual
- Endpoints en uso: `POST /enviar` (push FCM) · `POST /whatsapp` (CallMeBot)
- Llamado desde: cliente.html (6), rider.html (4), despacho.html (2)
- Autenticación: ❌ ninguna. Endpoints públicos
- Número de WhatsApp: fijo en el código del Worker

**Limitación de esta auditoría:** no dispongo del código fuente del Worker. Todo lo anterior se deduce de las llamadas de las apps. Para auditarlo por dentro necesito su código.

## Arquitectura objetivo
El Worker pasa de emisor de avisos a **capa de escritura y validación**:

| Endpoint | Función | Valida |
|---|---|---|
| `POST /auth/perfil` | Crea/recupera perfil tras OTP; asigna custom claims | token Firebase |
| `POST /pedidos` | **Crea el pedido** (calcula precio en servidor) | token + rol |
| `PATCH /pedidos/:ref/estado` | Cambia estado | token + que sea el rider asignado |
| `POST /notificar` | Push + WhatsApp + Telegram (unificado) | token de servicio |

Reglas de destino de notificación:
- Pedido sin `riderKey` → todos los riders activos (leídos de `/riders`, no fijos)
- Pedido con `riderKey` → solo ese rider

## Cuotas
Plan gratuito: 100.000 peticiones/día. Solo las **escrituras** pasan por el Worker (las lecturas van directas a Firebase), por lo que el margen es amplio incluso con miles de pedidos.

## Acción requerida del usuario
Facilitar el código actual del Worker para poder auditarlo y extenderlo sin romper `/enviar` y `/whatsapp`, que hoy funcionan.
