document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    // Cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', function () {
        firebase.auth().signOut().then(() => {
            window.location.href = '/index.html';
        });
    });

    // Cargar nombre del admin
const user = firebase.auth().currentUser;
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
}

    // Cargar usuarios
    loadUsers();

    // Configurar filtros
    document.getElementById('search-users').addEventListener('input', filterUsers);
    document.getElementById('filter-level').addEventListener('change', filterUsers);
});

function loadUsers() {
    const db = firebase.database();
    const usersTable = document.getElementById('users-table-body');

    db.ref('users').on('value', snapshot => {
        usersTable.innerHTML = '';

        snapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            const lastActivity = user.lastActivity ? new Date(user.lastActivity).toLocaleString() : 'Nunca';
            const progress = user.progress || {};

            const row = document.createElement('tr');
            row.innerHTML = `
        <td>${user.name || 'Sin nombre'}</td>
        <td>${user.email}</td>
        <td>${progress.currentLevel || 1}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress.percentComplete || 0}%"></div>
          </div>
          ${progress.percentComplete || 0}%
        </td>
        <td>${lastActivity}</td>
      `;

            usersTable.appendChild(row);
        });
    });
}

function filterUsers() {
    const searchTerm = document.getElementById('search-users').value.toLowerCase();
    const filterLevel = document.getElementById('filter-level').value;

    const rows = document.querySelectorAll('#users-table-body tr');

    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        const level = row.cells[2].textContent;

        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesLevel = filterLevel === 'all' || level === filterLevel;

        if (matchesSearch && matchesLevel) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}