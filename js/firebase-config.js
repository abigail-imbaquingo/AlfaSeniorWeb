// Configuración de Firebase (reemplaza con tus datos reales)
const firebaseConfig = {
  apiKey: "AIzaSyBSAfT9VpHqhWxOGC1zFscEGxsdPNnpk7M",
  authDomain: "alfaseniorweb.firebaseapp.com",
  databaseURL: "https://alfaseniorweb-default-rtdb.firebaseio.com/",
  projectId: "alfaseniorweb",
  storageBucket: "alfaseniorweb.firebasestorage.app",
  messagingSenderId: "525547541495",
  appId: "1:525547541495:web:2524997b3316ce537094f2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Función para verificar autenticación
function checkAuth() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      if (!window.location.pathname.includes('/index.html')) {
        window.location.href = '/index.html';
      }
    } else {
      const db = firebase.database();
      db.ref('admins').orderByChild('email').equalTo(user.email).once('value')
        .then(snapshot => {
          if (!snapshot.exists()) {
            auth.signOut().then(() => {
              window.location.href = '/index.html';
            });
          } else {
            // Obtener el nombre del admin
            snapshot.forEach(childSnapshot => {
              const admin = childSnapshot.val();
              const adminName = admin.name || user.email;
              document.getElementById('admin-name').textContent = adminName;
            });
          }
        });
    }
  });
}