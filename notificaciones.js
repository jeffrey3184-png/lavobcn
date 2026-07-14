/**
 * notificaciones.js — Motor de avisos de LavoBCN (cliente + rider)
 * ───────────────────────────────────────────────────────────────
 * Se añade a cliente.html y rider.html con una línea:
 *   <script defer src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>
 *   <script defer src="notificaciones.js"></script>
 *
 * No bloquea nada: si Firebase o el navegador no soportan push,
 * la app sigue funcionando igual.
 *
 * USO:
 *   LavoNotif.activar('cliente', 'usuario_123')   // o 'rider', 'lavo2001'
 *   LavoNotif.escucharPedido('PED-555', function(estado){ ... })  // estado en vivo
 */

window.LavoNotif = (function () {

  // ⚠️ PEGA AQUÍ tu clave VAPID (Firebase → Configuración → Cloud Messaging → Certificados push web)
  var VAPID_KEY = "BDfLex4qBz_yeSMKFGnur7RCbdgjAVzYGJKfhi4jkBSs5fQ2NbkIRgyJHQQaJ3Uora0pKpyw_xrLljpz_g8UqkQ";

  // URL de tu emisor en Cloudflare (worker notificador). Ej: https://lavo-notificador.tusub.workers.dev
  var EMISOR_URL = "https://lavo-notificador.jeffreelancer31.workers.dev";

  var FIREBASE = "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app";
  var _msg = null;

  function soporta() {
    return ('Notification' in window) && ('serviceWorker' in navigator) &&
           (typeof firebase !== 'undefined') && firebase.messaging &&
           firebase.messaging.isSupported && firebase.messaging.isSupported();
  }

  // Pide permiso, registra el cartero y guarda el token del dispositivo
  
// ── TOAST NO BLOQUEANTE (reemplaza todos los alert de diagnóstico) ──
function toastNotif(msg){
  try{
    var t = document.getElementById('toast');
    if(t){ t.textContent = msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 4500); return; }
    // fallback: div flotante con ✕, sin bloquear el hilo
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:90px;left:16px;right:16px;background:#1e293b;color:#fff;'+
      'font-size:13px;padding:12px 14px;border-radius:12px;z-index:9999;'+
      'border:1px solid #334155;box-shadow:0 4px 20px rgba(0,0,0,.5);';
    var x = document.createElement('div');
    x.textContent = '✕';
    x.style.cssText = 'float:right;cursor:pointer;margin-left:10px;opacity:.6;font-size:16px;';
    x.onclick = function(){ document.body.removeChild(el); };
    el.prepend(x);
    document.body.appendChild(el);
    setTimeout(function(){ if(document.body.contains(el)) document.body.removeChild(el); }, 5000);
  }catch(e){ console.log('[notif]', msg); }
}

async function activar(rol, id) {
    try {
      // Paso 1: ¿el navegador soporta push?
      if (!('Notification' in window)) { toastNotif('DIAG 1: Este navegador no tiene notificaciones. En iPhone abre la app desde el icono instalado, no desde Safari.'); return null; }
      if (!('serviceWorker' in navigator)) { toastNotif('DIAG 2: No hay serviceWorker. Abre la app desde el icono instalado en la pantalla de inicio.'); return null; }
      if (typeof firebase === 'undefined' || !firebase.messaging) { toastNotif('DIAG 3: Firebase Messaging no cargó. Revisa conexión a internet.'); return null; }
      if (firebase.messaging.isSupported && !firebase.messaging.isSupported()) { toastNotif('DIAG 4: Tu iPhone/navegador no soporta push aquí. Necesitas iOS 16.4+ y abrir la app instalada (no Safari).'); return null; }

      // Paso 2: permiso
      var permiso = await Notification.requestPermission();
      if (permiso !== 'granted') { toastNotif('DIAG 5: Permiso = ' + permiso + ' (no concedido).'); return null; }

      // Paso 3: registrar service worker
      var reg;
      try { reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js'); }
      catch (e1) { toastNotif('DIAG 6: Falló registrar el cartero (service worker): ' + e1.message); return null; }

      // Paso 4: obtener token
      _msg = firebase.messaging();
      var token;
      try { token = await _msg.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg }); }
      catch (e2) { toastNotif('DIAG 7: Falló getToken: ' + e2.message); return null; }
      if (!token) { toastNotif('DIAG 8: getToken devolvió vacío (sin error). Suele ser la clave VAPID o el sender ID.'); return null; }

      // Paso 5: guardar en Firebase
      try {
        var r = await fetch(FIREBASE + '/tokens/' + rol + '/' + id + '.json', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, actualizado: new Date().toISOString() })
        });
        if (!r.ok) { toastNotif('DIAG 9: No se pudo guardar en Firebase. Código: ' + r.status); return null; }
      } catch (e3) { toastNotif('DIAG 10: Error guardando en Firebase: ' + e3.message); return null; }

      _msg.onMessage(function (payload) {
        var n = payload.notification || {};
        guardarMensajeRecibido(n.title || 'LavoBCN', n.body || '');
        toast((n.title ? n.title + ' · ' : '') + (n.body || ''));
      });

      setTimeout(function(){ toastNotif('✅ Notificaciones activas'); }, 8000);
      return token;
    } catch (e) {
      toastNotif('DIAG 0: Error inesperado: ' + (e && e.message ? e.message : e));
      return null;
    }
  }

  // Disparar un aviso a otro usuario/rider a través del emisor de Cloudflare
  async function enviar(destino) {
    // destino = { rol, id, title, body, data }  (id opcional: sin id = a todos los de ese rol)
    try {
      await fetch(EMISOR_URL + '/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destino)
      });
    } catch (e) { console.log('Notif enviar() error:', e); }
  }

  // Escuchar el estado de un pedido EN VIVO (app abierta) vía Realtime Database
  function escucharPedido(pedidoId, callback) {
    try {
      if (typeof firebase === 'undefined' || !firebase.database) return;
      firebase.database().ref('pedidos/' + pedidoId + '/estado').on('value', function (snap) {
        var estado = snap.val();
        if (estado) callback(estado);
      });
    } catch (e) { console.log('escucharPedido error:', e); }
  }

  // ── HISTORIAL DE MENSAJES RECIBIDOS (para la bandeja en la app) ──
  var CLAVE_MENSAJES = 'lavobcn_mensajes_recibidos';

  function guardarMensajeRecibido(titulo, cuerpo) {
    try {
      var lista = JSON.parse(localStorage.getItem(CLAVE_MENSAJES) || '[]');
      lista.unshift({ titulo: titulo, cuerpo: cuerpo, ts: Date.now(), leido: false });
      if (lista.length > 50) lista = lista.slice(0, 50); // no crece sin límite
      localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(lista));
    } catch (e) {}
  }

  function obtenerMensajes() {
    try { return JSON.parse(localStorage.getItem(CLAVE_MENSAJES) || '[]'); }
    catch (e) { return []; }
  }

  function contarNoLeidos() {
    try { return obtenerMensajes().filter(function (m) { return !m.leido; }).length; }
    catch (e) { return 0; }
  }

  function marcarTodoLeido() {
    try {
      var lista = obtenerMensajes();
      lista.forEach(function (m) { m.leido = true; });
      localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(lista));
    } catch (e) {}
  }

  // Toast simple (no depende de nada)
  function toast(txt) {
    var t = document.createElement('div');
    t.textContent = '🔔 ' + txt;
    t.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;' +
      'background:#10b981;color:#fff;padding:13px 18px;border-radius:14px;font-weight:700;' +
      'font-size:14px;max-width:90%;box-shadow:0 8px 30px rgba(0,0,0,.4);font-family:inherit;';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 400); }, 4200);
  }

  return { activar: activar, enviar: enviar, escucharPedido: escucharPedido, toast: toast,
    obtenerMensajes: obtenerMensajes, contarNoLeidos: contarNoLeidos, marcarTodoLeido: marcarTodoLeido };
})();
