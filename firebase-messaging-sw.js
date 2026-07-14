// firebase-messaging-sw.js — LavoBCN
// Maneja las notificaciones push cuando la app está cerrada o en segundo plano.
// Debe vivir en la RAÍZ del sitio (mismo nivel que rider.html, cliente.html).

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDaopojkUpu7kQ2-H8yEaGJ21SqUZI9I1w",
  authDomain: "lavobcn.firebaseapp.com",
  databaseURL: "https://lavobcn-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lavobcn",
  storageBucket: "lavobcn.firebasestorage.app",
  messagingSenderId: "749157836989",
  appId: "1:749157836989:web:c1052afdfab2b6aca0afd4"
});

const messaging = firebase.messaging();

// Cuando llega un push y la app NO está en primer plano: mostrar la notificación del sistema
messaging.onBackgroundMessage(function(payload) {
  var n = payload.notification || {};
  var titulo = n.title || 'LavoBCN';
  var opciones = {
    body: n.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [400, 200, 400, 200, 400],
    requireInteraction: true,
    tag: 'lavobcn-pedido',
    data: { url: self.registration.scope + 'rider.html' }
  };
  self.registration.showNotification(titulo, opciones);
});

// Al tocar la notificación: enfocar rider.html o abrir si no está
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var urlDestino = (event.notification.data && event.notification.data.url) || '/rider.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.url.indexOf('rider') !== -1 && 'focus' in c) {
          c.postMessage({ tipo: 'NUEVO_PEDIDO' }); // avisa a la pestaña rider que revise
          c.focus();
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(urlDestino);
    })
  );
});
