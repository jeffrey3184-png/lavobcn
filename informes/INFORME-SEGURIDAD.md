# Informe de Seguridad — LavoBCN v1.0.3

## Estado actual (crítico)

| Área | Estado | Detalle |
|---|---|---|
| Firebase Rules | 🔴 CRÍTICO | `.read: true` / `.write: true` en raíz. Base de datos pública |
| Credenciales | 🔴 | `rider.html:1057` objeto CREDS con 20 usuarios en texto plano; cliente.html clave literal |
| Sesiones | 🔴 | `localStorage = '1'` — falsificable en 5 segundos |
| Autenticación admin | 🟡 | SHA-256 sin salt, validado en navegador |
| Aislamiento de datos | 🔴 | rider.html:1542/1572 descargan `/pedidos.json` completo (datos personales de todos) |
| Endpoints Worker | 🔴 | `/enviar` y `/whatsapp` sin cabecera de autorización |
| HTTPS/TLS | ✅ | 100% del tráfico cifrado, 0 llamadas http:// |
| Precios | 🔴 | Calculados en el navegador → manipulables |
| Stripe | 🟡 | `pk_live_` en front es correcto. **Verificar que `sk_live_` NO esté en ningún archivo ni repo** |

## Exposición RGPD
Datos personales (nombre, teléfono, dirección) de clientes reales accesibles sin control. Incumple arts. 5.1.f y 32 RGPD. Con hoteles como clientes, el riesgo pasa a ser contractual.

## Puntuación
Seguridad 12/100 · Privacidad 8/100 · Preparación empresarial 10/100

## Acción inmediata recomendada (antes de cualquier desarrollo)
Aplicar en la consola de Firebase una regla temporal que impida borrado y escritura masiva, manteniendo la app operativa. Es un torniquete, no la solución.
