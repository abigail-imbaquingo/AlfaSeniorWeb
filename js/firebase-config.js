// Configuración de Firebase (reemplaza con tus datos reales)
const firebaseConfig = {
  apiKey: "TU-API-KEY",
  authDomain: "TU-AUTH-DOMAIN",
  databaseURL: "https:TU-DATABASE-URL",
  projectId: "alfaseniorweb",
  storageBucket: "TU-STORAGE-BUCKET",
  messagingSenderId: "TU-MESSAGING",
  appId: "TU-APP-ID"
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
