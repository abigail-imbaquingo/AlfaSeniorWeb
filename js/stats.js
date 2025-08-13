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

    // Cargar estadísticas
    loadGeneralStats();
    loadLevelStats();
    loadActivityStats();
});

function loadGeneralStats() {
    const db = firebase.database();

    // Total de usuarios
    db.ref('users').once('value').then(snapshot => {
        document.getElementById('total-users').textContent = snapshot.numChildren();
    });

    // Estadísticas generales
    db.ref('appStats').once('value').then(snapshot => {
        const stats = snapshot.val();
        document.getElementById('total-lessons').textContent = Math.round(stats.avgLessonsCompleted * stats.activeUsers);
        document.getElementById('total-games').textContent = Math.round(stats.avgGamesCompleted * stats.activeUsers);
        document.getElementById('avg-progress').textContent = `${stats.avgProgress.toFixed(1)}%`;
    });
}

function loadLevelStats() {
    const db = firebase.database();
    const levelChartCtx = document.getElementById('level-chart').getContext('2d');

    // Obtener distribución por niveles
    db.ref('users').once('value').then(snapshot => {
        const levelCounts = [0, 0, 0, 0, 0, 0, 0]; // Para niveles 1-7

        snapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            const level = user.progress?.currentLevel || 1;
            if (level >= 1 && level <= 7) {
                levelCounts[level - 1]++;
            }
        });

        // Crear gráfico
        new Chart(levelChartCtx, {
            type: 'bar',
            data: {
                labels: ['Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5', 'Nivel 6', 'Nivel 7'],
                datasets: [{
                    label: 'Usuarios por nivel',
                    data: levelCounts,
                    backgroundColor: '#22333B',
                    borderColor: '#0A0908',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de usuarios'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Niveles'
                        }
                    }
                }
            }
        });
    });
}

function loadActivityStats() {
    const db = firebase.database();
    const activityChartCtx = document.getElementById('activity-chart').getContext('2d');

    // Obtener actividad mensual (ejemplo simplificado)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const last6Months = months.slice(currentMonth - 5, currentMonth + 1);

    // Datos de ejemplo (en una implementación real, consultarías la base de datos)
    const activityData = last6Months.map((_, i) => Math.floor(Math.random() * 50) + 20);

    // Crear gráfico
    new Chart(activityChartCtx, {
        type: 'line',
        data: {
            labels: last6Months,
            datasets: [{
                label: 'Sesiones activas',
                data: activityData,
                backgroundColor: 'rgba(34, 51, 59, 0.2)',
                borderColor: '#22333B',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sesiones'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Meses'
                    }
                }
            }
        }
    });
}