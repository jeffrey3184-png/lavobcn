# Informe Firebase Rules — LavoBCN

## Reglas actuales (producción)
```json
{ "rules": { ".read": true, ".write": true, ... } }
```
Acceso total sin restricción. Los `.indexOn` (estado, riderKey, tipo, ts) están bien definidos y se conservan.

## Reglas objetivo (diseño — requiere Phone Auth activo)
```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "pedidos": {
      ".indexOn": ["estado","riderKey","tipo","ts","clienteUid","empresaId"],
      "$ref": {
        ".read": "auth != null && (
                   data.child('clienteUid').val() === auth.uid ||
                   data.child('riderKey').val() === auth.token.riderKey ||
                   (auth.token.rol === 'rider' && data.child('estado').val() === 'pendiente') ||
                   (auth.token.rol === 'empresa' && data.child('empresaId').val() === auth.token.empresaId) ||
                   auth.token.rol === 'admin')",
        ".write": false
      }
    },

    "usuarios": {
      "$uid": { ".read": "auth.uid === $uid || auth.token.rol === 'admin'", ".write": false }
    },

    "clientes_corporativos": {
      ".read": "auth != null && (auth.token.rol === 'admin' || auth.token.rol === 'despacho')",
      ".write": false
    }
  }
}
```

## Principios
1. `.write: false` en todo → **solo el Worker escribe** (usa Admin SDK, se salta las reglas).
2. Las lecturas siguen siendo directas → **el tiempo real (onValue) se conserva**.
3. El rol viaja en el token como custom claim, no en el navegador.

## Requisito bloqueante
Las reglas necesitan que **cada pedido tenga `clienteUid` y `empresaId`**. Hoy no existen. Sin ese campo no hay filtrado posible. Es la Fase A del plan de migración.

## Riesgo de aplicación
🔴 ALTO. Activar estas reglas sin las fases previas completadas deja la app sin datos de golpe. **Obligatorio probar en un proyecto Firebase de pruebas antes de producción.**
