# Lista de pruebas realizadas — v1.0.3

## Ejecutadas por Claude (estáticas, sobre el código)

| Prueba | Resultado |
|---|---|
| Sintaxis 6 HTML | ✅ 0 errores |
| Sintaxis 5 módulos JS | ✅ 0 errores |
| Funciones duplicadas | ⚠️ 8 detectadas, documentadas, no corregidas |
| Patrón de recursión (bug SS) | ✅ no se repite |
| Referencias onclick | ✅ 0 rotas reales |
| Consistencia nodos Firebase (W/R) | ✅ consistente |
| Motor único: campos cliente vs hotel | ✅ idénticos |
| Inventario de archivos | ✅ 15/15 |
| HTTPS en todas las llamadas | ✅ 0 http:// |
| Reglas Firebase | 🔴 abiertas (documentado) |

## NO ejecutadas (fuera de mi alcance — las ejecuta el usuario)

| Prueba | Por qué | Dónde está la checklist |
|---|---|---|
| Push en iPhone real | Requiere dispositivo | CHECKLIST-PRUEBAS.md |
| Push en Android real | Requiere dispositivo | CHECKLIST-PRUEBAS.md |
| Sonido y vibración | Requiere dispositivo | CHECKLIST-PRUEBAS.md |
| WhatsApp entrega real | Requiere red | CHECKLIST-PRUEBAS.md |
| Tiempo real entre dispositivos | Requiere 2 dispositivos | CHECKLIST-PRUEBAS.md |
| Flujo completo de pedido | Requiere operación real | CHECKLIST-PRUEBAS.md |

**Declaración honesta:** ninguna prueba de dispositivo ha sido ejecutada por Claude. No puedo abrir la app, oír un sonido ni tocar una notificación. Todo lo marcado ✅ arriba es verificación estática de código.
