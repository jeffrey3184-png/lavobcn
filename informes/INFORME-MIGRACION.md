# Informe de Migración — Autenticación y Seguridad

## Principio: reversible y por fases
Ninguna fase se despliega sin que la anterior esté validada en iPhone, Android y PC. Cada fase es reversible volviendo al ZIP anterior.

## Requisitos previos (los ejecuta el usuario, NO se pueden entregar en un ZIP)

| # | Acción | Dónde | Bloquea |
|---|---|---|---|
| P1 | Activar proveedor "Teléfono" en Authentication | Consola Firebase | Todo el login |
| P2 | Añadir `lavobcn.pages.dev` a dominios autorizados | Consola Firebase | Todo el login |
| P3 | Activar plan Blaze (SMS es de pago) | Consola Firebase | Envío de OTP |
| P4 | Configurar límite anti-abuso de SMS | Consola Firebase | Coste |
| P5 | Facilitar código fuente del Worker | Usuario | Fases B, D |
| P6 | Crear proyecto Firebase de PRUEBAS | Consola Firebase | Fase E (obligatorio) |

**Sin P1–P3, un ZIP con phone-login deja la app sin acceso.** Este es el motivo por el que no se entrega hoy.

## Fases

| Fase | Qué | Riesgo | Reversible | Rompe algo |
|---|---|---|---|---|
| **A** | Añadir `clienteUid`/`empresaId` a pedidos nuevos | Muy bajo | Sí | No (campos opcionales) |
| **B** | Worker crea pedidos y calcula precios | Medio | Sí (respaldo 1 semana) | No si mantiene estructura |
| **C** | Phone Auth + OTP (convive con login actual) | Medio | Sí | No durante convivencia |
| **D** | Roles por custom claims | Bajo | Sí | No |
| **E** | 🔴 Cerrar Firebase Rules | **ALTO** | Sí (revertir reglas) | Sí, si A–D no están completas |
| **F** | Niveles de confianza | Bajo | Sí | No (aditivo) |
| **G** | Registro de auditoría | Bajo | Sí | No |

## Compatibilidad con la versión actual

| Elemento | Impacto |
|---|---|
| GPS inteligente (geoRun, dist, geofencing) | **Cero** — cálculo en dispositivo |
| Motor único /pedidos | Se conserva (+2 campos) |
| Estados | Sin cambios |
| Listeners onValue (tiempo real) | **Se conservan** — por eso las lecturas siguen directas |
| Push, WhatsApp, sonido, vibración | Sin cambios |
| Stripe | Mejora (importe calculado en servidor) |
| Diseño visual | Sin cambios salvo la pantalla de login |

## Migración de usuarios existentes
- **Riders (2 personas hoy):** migración trivial, uno a uno.
- **Clientes:** verifican su teléfono una vez. Convivencia de ambos logins 1–2 semanas.
- **Admin/Despacho:** cuenta con rol asignado desde el servidor.

## Recomendación de orden
**Fase 0 (30 min, hoy):** regla temporal en Firebase que bloquee borrado y escritura masiva manteniendo la app operativa. Luego A → B → C → D → E.
