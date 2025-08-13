document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  
  // Cerrar sesión
  document.getElementById('logout-btn').addEventListener('click', function() {
    firebase.auth().signOut().then(() => {
      window.location.href = '/index.html';
    });
  });
  
  // Cargar datos del admin
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
  
  // Cargar estadísticas
  loadStats();
  loadRecentActivity();
});

function loadStats() {
  const db = firebase.database();
  
  // Usuarios activos (últimos 7 días)
  db.ref('users').orderByChild('lastActivity').startAt(Date.now() - 7 * 24 * 60 * 60 * 1000).once('value')
    .then(snapshot => {
      const activeUsers = snapshot.numChildren();
      document.getElementById('active-users').textContent = activeUsers;
    });
  
  // Promedios
  db.ref('appStats').once('value').then(snapshot => {
    const stats = snapshot.val();
    document.getElementById('completed-lessons').textContent = stats.avgLessonsCompleted.toFixed(1);
    document.getElementById('completed-games').textContent = stats.avgGamesCompleted.toFixed(1);
    document.getElementById('avg-progress').textContent = `${stats.avgProgress.toFixed(1)}%`;
  });
}

function loadRecentActivity() {
  const db = firebase.database();
  const activityList = document.getElementById('recent-activity');
  
  db.ref('users').orderByChild('lastActivity').limitToLast(5).once('value')
    .then(snapshot => {
      activityList.innerHTML = '';
      snapshot.forEach(childSnapshot => {
        const user = childSnapshot.val();
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const lastActivity = new Date(user.lastActivity).toLocaleString();
        
        activityItem.innerHTML = `
          <div>
            <strong>${user.name || user.email}</strong>
            <p>Última actividad: ${lastActivity}</p>
          </div>
          <div>
            <span>Nivel: ${user.progress?.currentLevel || 1}</span>
          </div>
        `;
        
        activityList.appendChild(activityItem);
      });
    });
}