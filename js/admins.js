let currentEditingAdminId = null;
document.addEventListener('DOMContentLoaded', function() {
  checkAuth();

  // Cerrar sesión
  document.getElementById('logout-btn').addEventListener('click', function() {
    firebase.auth().signOut().then(() => {
      window.location.href = '/index.html';
    });
  });

    // Mostrar/ocultar formulario
  document.getElementById('show-form-btn').addEventListener('click', function() {
    const formContainer = document.getElementById('admin-form-container');
    formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
    cancelEdit();
  });

  // Cargar nombre del admin actual
  /*const user = firebase.auth().currentUser;
if (user) {
  const db = firebase.database();
  db.ref('admins').orderByChild('email').equalTo(user.email).once('value')
    .then(snapshot => {
      snapshot.forEach(childSnapshot => {
        const admin = childSnapshot.val();
        const adminName = admin.name || user.email;
        document.getElementById('admin-name').textContent = adminName;
      });
    });
}*/

  // Cargar lista de administradores
  loadAdmins();

  // Manejar formulario para agregar/editar admin
  document.getElementById('add-admin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    addAdmin();
  });

  // Agregar evento al botón de cancelar edición
  document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
  
  // Agregar evento al botón de resetear contraseña
  document.getElementById('reset-password-btn').addEventListener('click', resetPassword);

  // Agregar eventos para mostrar/ocultar contraseña
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const input = this.previousElementSibling;
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  });
});

function loadAdmins() {
  const db = firebase.database();
  const adminsTable = document.getElementById('admins-table-body');
  const currentUser = firebase.auth().currentUser;

  if (!adminsTable) {
    console.error('No se encontró el elemento admins-table-body');
    return;
  }

  db.ref('admins').on('value', snapshot => {
    adminsTable.innerHTML = '';
    
    if (!snapshot.exists()) {
      adminsTable.innerHTML = '<tr><td colspan="5">No hay administradores registrados</td></tr>';
      return;
    }
    
    snapshot.forEach(childSnapshot => {
      const admin = childSnapshot.val();
      const date = new Date(parseInt(admin.createdAt)).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${admin.name}</td>
        <td>${admin.email}</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-edit btn-sm" data-id="${childSnapshot.key}">Editar</button>
          <button class="btn btn-danger btn-sm delete-admin" data-id="${childSnapshot.key}">Eliminar</button>
        </td>
      `;
      
      if (currentUser && childSnapshot.key === currentUser.uid) {
        row.querySelector('.delete-admin').disabled = true;
        row.querySelector('.delete-admin').textContent = 'Actual';
      }
      
      adminsTable.appendChild(row);
    });
    // Agregar eventos a los botones de editar
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', function() {
        const adminId = this.getAttribute('data-id');
        startEditAdmin(adminId);
      });
    });
    // Agregar eventos a los botones de eliminar
    document.querySelectorAll('.delete-admin').forEach(btn => {
      btn.addEventListener('click', function() {
        const adminId = this.getAttribute('data-id');
        deleteAdmin(adminId);
      });
    });
  });
}
function startEditAdmin(adminId) {
  const db = firebase.database();
  currentEditingAdminId = adminId;
    document.getElementById('admin-form-container').style.display = 'block';
  
  db.ref(`admins/${adminId}`).once('value').then(snapshot => {
    const admin = snapshot.val();
    
    // Llenar el formulario con los datos existentes
    document.getElementById('admin-email').value = admin.email;
    document.getElementById('admin-name-input').value = admin.name;
    document.getElementById('admin-password').disabled = true;
    document.getElementById('admin-password-confirm').disabled = true;
    
    // Cambiar el texto del botón
    document.getElementById('submit-admin-btn').textContent = 'Actualizar Administrador';
    document.getElementById('reset-password-btn').style.display = 'inline-block';
    
    // Habilitar el campo de email para edición
    document.getElementById('admin-email').disabled = false;
  });
}

function cancelEdit() {
  currentEditingAdminId = null;
  
  // Limpiar el formulario
  document.getElementById('add-admin-form').reset();
  
  // Restaurar el formulario a su estado original
  document.getElementById('submit-admin-btn').textContent = 'Agregar Administrador';
  document.getElementById('reset-password-btn').style.display = 'none';
}

function addAdmin() {
  const email = document.getElementById('admin-email').value.trim();
  const name = document.getElementById('admin-name-input').value.trim();
  const password = document.getElementById('admin-password').value;
  const passwordConfirm = document.getElementById('admin-password-confirm').value;
  const messageDiv = document.getElementById('admin-message');

  if (!messageDiv) {
    console.error('No se encontró el elemento admin-message');
    return;
  }

  // Validación básica
  if (!email || !name) {
    showMessage('Por favor complete todos los campos', 'error');
    return;
  }

  // Validar contraseña solo si es nuevo usuario o se está cambiando
  if (!currentEditingAdminId && (!password || !passwordConfirm)) {
    showMessage('Por favor ingrese y confirme la contraseña', 'error');
    return;
  }

  if (password && password.length < 6) {
    showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    showMessage('Las contraseñas no coinciden', 'error');
    return;
  }

  if (currentEditingAdminId) {
    // Modo edición - actualizar datos
    updateAdmin(currentEditingAdminId, email, name, password);
  } else {
    // Modo creación - crear nuevo usuario
    createNewAdmin(email, name, password);
  }
}

// Sustituye createNewAdmin por esta:
async function createNewAdmin(email, name, password) {
  showMessage('Creando administrador...', 'info');

  // reutiliza si ya existe, o crea una app secundaria
  let secondary = firebase.apps.find(a => a.name === 'secondary');
  if (!secondary) secondary = firebase.initializeApp(firebase.app().options, 'secondary');

  try {
    // que NO persista la sesión secundaria
    await secondary.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

    // crea el usuario EN LA APP SECUNDARIA (¡tu sesión principal no cambia!)
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // ficha del admin en Realtime Database con la app principal (tu sesión actual)
    await firebase.database().ref(`admins/${uid}`).set({
      uid,
      email,
      name,
      createdAt: Date.now()
    });

    showMessage('Administrador creado exitosamente', 'success');
    document.getElementById('add-admin-form').reset();
  } catch (error) {
    handleAuthError(error);
  } finally {
    // cierra la app secundaria para no dejar sesiones colgando
    try { await secondary.delete(); } catch (_) {}
  }
}


function updateAdmin(adminId, newEmail, newName, newPassword) {
  showMessage('Actualizando administrador...', 'info');
  
  // Actualizar datos en Realtime Database
  const updates = {
    [`admins/${adminId}/email`]: newEmail,
    [`admins/${adminId}/name`]: newName
  };
  
  firebase.database().ref().update(updates)
    .then(() => {
      // Si se proporcionó una nueva contraseña, actualizarla
      if (newPassword) {
        return firebase.auth().updateUser(adminId, {
          email: newEmail,
          password: newPassword
        });
      } else {
        // Solo actualizar el email si no hay cambio de contraseña
        return firebase.auth().updateUser(adminId, {
          email: newEmail
        });
      }
    })
    .then(() => {
      showMessage('Administrador actualizado exitosamente', 'success');
      cancelEdit();
    })
    .catch((error) => {
      handleAuthError(error);
    });
}

function resetPassword() {
  if (!currentEditingAdminId) return;
  
  const email = document.getElementById('admin-email').value;
  
  if (!confirm(`¿Está seguro que desea resetear la contraseña de ${email}? Se enviará un correo para restablecerla.`)) {
    return;
  }
  
  showMessage('Enviando correo de reseteo...', 'info');
  
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      showMessage('Correo para resetear contraseña enviado exitosamente', 'success');
    })
    .catch((error) => {
      handleAuthError(error);
    });
}

async function deleteAdmin(adminId) {
  if (!confirm('¿Está seguro de eliminar este administrador?')) return;
  
  try {
    // 1. Primero eliminar de Realtime Database
    await firebase.database().ref(`admins/${adminId}`).remove();
    
    // 2. Obtener el token de acceso actual
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) throw new Error('No autenticado');
    
    const token = await currentUser.getIdToken();
    
    // 3. Eliminar de Authentication usando la API REST de Firebase
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: token,
        localId: adminId
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Error al eliminar de Auth');
    }
    
    showMessage('Administrador eliminado completamente', 'success');
  } catch (error) {
    console.error("Error completo:", error);
    showMessage(`Error: ${error.message}`, 'error');
  }
}

function handleAuthError(error) {
  console.error("Error completo:", error);
  
  let errorMessage = 'Error: ';
  switch(error.code) {
    case 'auth/email-already-in-use':
      errorMessage += 'El correo ya está registrado';
      break;
    case 'auth/invalid-email':
      errorMessage += 'Correo electrónico inválido';
      break;
    case 'auth/weak-password':
      errorMessage += 'Contraseña demasiado débil';
      break;
    case 'auth/user-not-found':
      errorMessage += 'Usuario no encontrado';
      break;
    case 'auth/requires-recent-login':
      errorMessage += 'Esta operación requiere autenticación reciente. Por favor cierre sesión y vuelva a ingresar.';
      break;
    default:
      errorMessage += error.message;
  }
  
  showMessage(errorMessage, 'error');
  
  // Limpiar usuario si falló la creación
  if (!currentEditingAdminId && firebase.auth().currentUser) {
    firebase.auth().currentUser.delete().catch(deleteError => {
      console.error("Error al limpiar usuario:", deleteError);
    });
  }
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('admin-message');
  if (!messageDiv) {
    console.error('No se encontró el elemento admin-message');
    return;
  }
  
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  
  // Limpiar el mensaje después de 5 segundos
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
  }, 5000);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}