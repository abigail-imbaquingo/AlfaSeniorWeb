document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('login-error');
  
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Verificar si es admin
        const db = firebase.database();
        db.ref('admins').orderByChild('email').equalTo(email).once('value')
          .then(snapshot => {
            if (snapshot.exists()) {
              // Es admin, redirigir al dashboard
              window.location.href = 'dashboard.html';
            } else {
              // No es admin, cerrar sesión
              firebase.auth().signOut();
              errorMessage.textContent = 'No tienes permisos de administrador';
            }
          });
      })
      .catch((error) => {
        errorMessage.textContent = error.message;
      });
  });
});