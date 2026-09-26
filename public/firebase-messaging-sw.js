importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCdPdvODJlHZsmkhz4GWDKpT7hKmBHJbTM",
    authDomain: "cropoctor.firebaseapp.com",
    projectId: "cropoctor",
    storageBucket: "cropoctor.firebasestorage.app",
    messagingSenderId: "903895269703",
    appId: "1:903895269703:web:ccfd9bfefc4557c15c8c62"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
