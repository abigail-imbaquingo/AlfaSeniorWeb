//js/lessons.js
document.addEventListener('DOMContentLoaded', function() {
checkAuth();

  // Cerrar sesión
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
    firebase.auth().signOut().then(() => window.location.href = '/index.html');
    });
}

  // Nombre del admin (tu config lo obtiene de 'admins' si existe)
const user = firebase.auth().currentUser;
if (user) {
    const db = firebase.database();
    db.ref('admins').orderByChild('email').equalTo(user.email).once('value')
    .then(snapshot => snapshot.forEach(child => {
        const admin = child.val();
        document.getElementById('admin-name').textContent = admin?.name || user.email;
    }));
}

  // Cargar evaluación sumativa
loadSummativeLesson();

  // Filtros (aunque hay una sola tarjeta, lo mantengo por si luego hay versiones)
document.getElementById('search-lessons')?.addEventListener('input', filterLessons);
document.getElementById('filter-status')?.addEventListener('change', filterLessons);
});

function loadSummativeLesson() {
const db = firebase.database();
const container = document.getElementById('lessons-container');
if (!container) return;

container.innerHTML = '<p>Cargando evaluación...</p>';

db.ref('lessons/summative').once('value').then(snapshot => {
    container.innerHTML = '';
    const lesson = snapshot.val();

    if (!lesson) {
    container.innerHTML = '<p>No hay evaluación sumativa registrada.</p>';
    return;
    }

    const imagesCount = countImages(lesson);
    const soundsCount = countAudios(lesson);

    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.setAttribute('data-id', lesson.id || 'summative-001');
    card.setAttribute('data-active', lesson.active ? 'true' : 'false');

    card.innerHTML = `
    <div class="lesson-info">
        <h3>${lesson.title || 'Evaluación Sumativa'}</h3>
        <p>${lesson.description || '—'}</p>
        <div class="lesson-meta">
        <span>Imágenes: ${imagesCount}</span>
        <span>Sonidos: ${soundsCount}</span>
        </div>
    </div>
    <div class="lesson-actions">
        <button class="btn btn-preview" id="btn-preview">Vista Previa</button>
        <label class="toggle-switch">
        <input type="checkbox" ${lesson.active ? 'checked' : ''}>
        <span class="slider"></span>
        </label>
    </div>
    `;

    // Toggle único
    const toggle = card.querySelector('input[type="checkbox"]');
    toggle.addEventListener('change', function() {
    updateSummativeStatus(this.checked);
    card.setAttribute('data-active', this.checked ? 'true' : 'false');
    });

    // Preview
    card.querySelector('#btn-preview').addEventListener('click', () => openSummativePreview());

    container.appendChild(card);
}).catch(err => {
    console.error('Error al cargar evaluación:', err);
    container.innerHTML = '<p>Error al cargar la evaluación.</p>';
});
}

function updateSummativeStatus(isActive) {
firebase.database().ref().update({ 'lessons/summative/active': isActive })
    .then(() => showToast(`Evaluación ${isActive ? 'activada' : 'desactivada'} correctamente`))
    .catch(() => showToast('Error al actualizar el estado', 'error'));
}

function openSummativePreview() {
window.open(`lessons-preview.html?id=summative-001`, '_blank');
}

// Helpers de conteo
function countImages(lesson) {
let c = 0;
if (lesson.media?.image) c++;
  // cuenta imágenes en preguntas, opciones y pairs
(lesson.content?.questions || []).forEach(q => {
    if (q.image) c++;
    (q.options || []).forEach(o => { if (o?.image) c++; });
    (q.pairs || []).forEach(p => { if (p?.image) c++; });
});
return c;
}
function countAudios(lesson) {
let c = 0;
if (lesson.media?.audio) c++;
(lesson.content?.questions || []).forEach(q => {
    if (q.audio) c++;
    (q.pairs || []).forEach(p => { if (p?.audio) c++; });
});
return c;
}

function filterLessons() {
const searchTerm = document.getElementById('search-lessons')?.value?.toLowerCase() || '';
const filterStatus = document.getElementById('filter-status')?.value || 'all';

document.querySelectorAll('.lesson-card').forEach(card => {
    const title = card.querySelector('h3').textContent.toLowerCase();
    const description = card.querySelector('p').textContent.toLowerCase();
    const isActive = card.getAttribute('data-active') === 'true';

    const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' ||
    (filterStatus === 'active' && isActive) ||
    (filterStatus === 'inactive' && !isActive);

    card.style.display = (matchesSearch && matchesStatus) ? 'flex' : 'none';
});
}

// Toast simple
function showToast(message, type = 'success') {
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.textContent = message;
document.body.appendChild(toast);
setTimeout(() => toast.remove(), 3000);
}

// Estilos mínimos por si no están en tu CSS
const style = document.createElement('style');
style.textContent = `
.lesson-card { display:flex; justify-content:space-between; align-items:center; background:#fff; padding:1rem; margin-bottom:1rem; border-radius:6px; border:1px solid #eee; }
.lesson-info { flex:1; }
.lesson-meta { margin-top:.5rem; font-size:.85rem; color:#666; }
.lesson-meta span { margin-right:1rem; }
.lesson-actions { display:flex; align-items:center; gap:1rem; }
.toast { position:fixed; bottom:24px; right:24px; background:#22333B; color:#fff; padding:.75rem 1rem; border-radius:6px; z-index:9999; }
.toast.error { background:#c0392b; }
.toggle-switch { position:relative; display:inline-block; width:48px; height:26px; }
.toggle-switch input { opacity:0; width:0; height:0; }
.slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#ccc; transition:.2s; border-radius:26px; }
.slider:before { position:absolute; content:""; height:20px; width:20px; left:3px; bottom:3px; background:#fff; transition:.2s; border-radius:50%; }
input:checked + .slider { background:#5E503F; }
input:checked + .slider:before { transform:translateX(22px); }
`;
document.head.appendChild(style);
