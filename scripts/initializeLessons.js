// scripts/initializeLessons.js
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');
const { getStorage, ref: sRef, uploadBytes, getDownloadURL } = require('firebase/storage');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const fs = require('fs');
const path = require('path');

// --- Config Firebase desde variables de entorno ---
const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
});

const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Carpeta local de medios:  media/summative/{images|audio}/...
const LOCAL_MEDIA = path.join(__dirname, '..', 'media', 'summative');


// ---------- utilidades de subida ----------
async function uploadFile(localPath, destPath) {
  try {
    if (!localPath || !fs.existsSync(localPath)) return null;
    const buf = fs.readFileSync(localPath);
    const destRef = sRef(storage, destPath);
    await uploadBytes(destRef, buf);
    const url = await getDownloadURL(destRef);
    return url;
  } catch (e) {
    console.error('Error subiendo', localPath, '->', destPath, e.message);
    return null;
  }
}

async function normalizeImage(filename) {
  if (!filename) return null;
  const p = path.join(LOCAL_MEDIA, 'images', filename);
  return await uploadFile(p, `multimedia/summative/images/${path.basename(p)}`);
}
async function normalizeAudio(filename) {
  if (!filename) return null;
  const p = path.join(LOCAL_MEDIA, 'audio', filename);
  return await uploadFile(p, `multimedia/summative/audio/${path.basename(p)}`);
}

// ---------- Construcción de la evaluación sumativa ----------
// NOTA: Cada pregunta incluye "activityType" para permitir mezcla de actividades.
// Ejemplos basados en tu documento: OrdenarSílabas, Imagen-Sonido, Unir Números,
// Memoria, Asociar Imagen-Palabra, Completar Palabra.
const summativeDraft = {
  id: 'summative-001',
  title: 'Evaluación Sumativa',
  description: 'Evaluación final de alfabetización.',
  type: 'Summative',
  active: false,
  media: { image: 'portada.jpg' },
  content: {
    questions: [
      {
        activityType: 'EmparejarLetrasActivity',
        text: 'Relaciona cada letra mayúscula con su minúscula correspondiente',
        audio: 'abecedario.mp3',
        // pares correctos
        pairs: [
          { uppercase: 'A', lowercase: 'a' },
          { uppercase: 'B', lowercase: 'b' }
        ],
        // distractores (lado minúsculas que NO corresponden a A o B)
        options: [
          { lowercase: 'd' },
          { lowercase: 'c' }
        ]
      },
      // --- ORDENAR SÍLABAS (2) ---
      {
        activityType: 'OrdenarSílabasActivity',
        text: 'Ordena las sílabas para formar palabras relacionadas con la familia',
        audio: 'familia.mp3',
        correctAnswer: ['PA', 'PÁ'],
        options: ['PA', 'PÁ', 'MA', 'RE']
      }, // ref de ejemplo en doc: ordenar sílabas:contentReference[oaicite:8]{index=8}
      {
        activityType: 'OrdenarSílabasActivity',
        text: 'Ordena las sílabas para formar palabras relacionadas con la familia',
        audio: 'familia.mp3',
        correctAnswer: ['HI', 'JA'],
        options: ['HI', 'JA', 'PA', 'RE']
      },
      {
        activityType: 'OrdenarSílabasActivity',
        text: 'Ordena las sílabas para formar palabras relacionadas con la familia',
        audio: 'familia.mp3',
        correctAnswer: ['MA', 'MÁ'],
        options: ['MA', 'MÁ', 'PA', 'LO']
      },
      {
        activityType: 'OrdenarSílabasActivity',
        text: 'Ordena las sílabas para formar palabras de alimentos',
        audio: 'alimentos.mp3',
        correctAnswer: ['SO', 'PA'],
        options: ['SO', 'PA', 'SA', 'SO']
      },
      {
        activityType: 'OrdenarSílabasActivity',
        text: 'Ordena las sílabas para formar palabras de alimentos',
        audio: 'alimentos.mp3',
        correctAnswer: ['LE', 'CHE'],
        options: ['LE', 'CHE', 'MA', 'ZA']
      },
      // --- IMAGEN-SONIDO (2) ---
      {
        activityType: 'ImagenSonidoActivity',
        text: '¿Qué animal hace este sonido?',
        audio: 'perro-sonido.mp3',
        correctAnswer: 'perro',
        options: [
          { text: 'Perro', image: 'perro.jpg' },
          { text: 'Gato', image: 'gato.jpg' },
          { text: 'Pájaro', image: 'pajaro.jpg' }
        ]
      }, // ejemplo en doc:contentReference[oaicite:10]{index=10}
      {
        activityType: 'ImagenSonidoActivity',
        text: '¿Qué animal hace este sonido?',
        audio: 'gato-sonido.mp3',
        correctAnswer: 'gato',
        options: [
          { text: 'Perro', image: 'perro.jpg' },
          { text: 'Gato', image: 'gato.jpg' },
          { text: 'Gallina', image: 'gallina.jpg' }
        ]
      }, // ejemplo en doc:contentReference[oaicite:11]{index=11}

      // --- UNIR NÚMEROS (1) ---
      {
        activityType: 'UnirNumerosActivity',
        text: 'Une el número con la cantidad correcta',
        audio: 'une-numero-frutas.mp3',
        pairs: [
          { number: '2', image: '2-manzanas.jpg' },
          { number: '3', image: '3-peras.jpg' },
          { number: '4', image: '4-uvas.jpg' },
          { number: '1', image: '1-naranja.jpg' }
        ],
        options: [
          { number: '1', image: '1-naranja.jpg' },
          { number: '4', image: '4-uvas.jpg' },
          { number: '2', image: '2-manzanas.jpg' },
          { number: '3', image: '3-peras.jpg' }
        ]
      },

      // --- MEMORIA (1) ---
      {
        activityType: 'MemoryGameActivity',
        text: 'Encuentra los pares de objetos del hogar',
        audio: 'encuentra-pares.mp3',
        pairs: [
          { image: 'silla.jpg', audio: 'silla.mp3' },
          { image: 'mesa.jpg', audio: 'mesa.mp3' },
          { image: 'cama.jpg', audio: 'cama.mp3' },
          { image: 'vaso.jpg', audio: 'vaso.mp3' }
        ]
      }, // ejemplo en doc:contentReference[oaicite:13]{index=13}

      // --- ASOCIAR IMAGEN-PALABRA (2) ---
      {
        activityType: 'AsociarImagenPalabraActivity',
        text: 'Selecciona la palabra correcta para la acción',
        image: 'correr.jpg',
        audio: 'accion.mp3',
        correctAnswer: 'correr',
        options: ['correr', 'saltar', 'dormir', 'comer']
      }, // ejemplo en doc (verbos):contentReference[oaicite:14]{index=14}
      {
        activityType: 'AsociarImagenPalabraActivity',
        text: 'Selecciona la palabra correcta para la acción',
        image: 'leer.jpg',
        audio: 'accion.mp3',
        correctAnswer: 'leer',
        options: ['escribir', 'leer', 'hablar', 'escuchar']
      },
      {
        activityType: 'AsociarImagenPalabraActivity',
        text: 'Selecciona la palabra correcta que corresponde al oficio',
        image: 'panadero.jpg',
        audio: 'oficio.mp3',
        correctAnswer: 'panadero',
        options: ['médico', 'panadero', 'carpintero', 'maestro']
      },
      {
        activityType: 'AsociarImagenPalabraActivity',
        text: 'Selecciona la palabra correcta que corresponde al oficio',
        image: 'medico.jpg',
        audio: 'oficio.mp3',
        correctAnswer: 'médico',
        options: ['médico', 'panadero', 'carpintero', 'maestro']
      },

      // --- COMPLETAR PALABRA (2) ---
      {
        activityType: 'CompletarPalabraActivity',
        text: 'Completa: LI_RO',
        audio: 'completar.mp3',
        correctAnswer: 'B',
        options: ['B', 'P', 'M', 'S'],
        fullWord: 'LIBRO',
        image: 'libro.jpg'
      },
      {
        activityType: 'CompletarPalabraActivity',
        text: 'Completa: MO_ILA',
        audio: 'completar.mp3',
        correctAnswer: 'CH',
        options: ['CH', 'LL', 'Ñ', 'RR'],
        fullWord: 'MOCHILA',
        image: 'mochila.jpg'
      },
      {
        activityType: 'CompletarPalabraActivity',
        text: 'Completa: MA_O',
        audio: 'completar.mp3',
        correctAnswer: 'N',
        options: ['N', 'S', 'L', 'P'],
        fullWord: 'MANO',
        image: 'mano.jpg'
      },
      {
        activityType: 'CompletarPalabraActivity',
        text: 'Completa: PIE_',
        audio: 'completar.mp3',
        correctAnswer: 'S',
        options: ['L', 'S', 'N', 'M'],
        fullWord: 'PIES',
        image: 'pies.jpg'
      }
    ]
  },
  createdAt: Date.now()
};

// ---------- normalización de URLs (sube a Storage y reemplaza nombres por URLs) ----------
async function processSummativeMedia(lesson) {
  // media de portada
  if (lesson.media) {
    lesson.media.image = await normalizeImage(lesson.media.image);
    lesson.media.audio = await normalizeAudio(lesson.media.audio);
  }
  // preguntas
  if (lesson.content && Array.isArray(lesson.content.questions)) {
    for (const q of lesson.content.questions) {
      // campos comunes
      if (q.image) q.image = await normalizeImage(q.image);
      if (q.audio) q.audio = await normalizeAudio(q.audio);

      // opciones (texto, imagen)
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (opt && opt.image) {
            opt.image = await normalizeImage(opt.image);
          }
        }
      }
      // pairs (memoria / unir números)
      if (Array.isArray(q.pairs)) {
        for (const p of q.pairs) {
          if (p.image) p.image = await normalizeImage(p.image);
          if (p.audio) p.audio = await normalizeAudio(p.audio);
        }
      }
    }
  }
  return lesson;
}

async function main() {
  console.log('🔐 Autenticando...');
  await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
  const cred = await signInWithEmailAndPassword(
    auth,
    process.env.FIREBASE_ADMIN_EMAIL,
    process.env.FIREBASE_ADMIN_PASSWORD
  );
  const uid = cred.user.uid;
  console.log(`✅ Autenticado como UID=${uid} email=${cred.user.email}`);

  // Verificar que este UID sea admin según tus reglas
  const adminSnap = await get(ref(db, 'admins/' + uid));
  if (!adminSnap.exists()) {
    console.error(`⛔ El UID ${uid} no está en /admins. Agrega /admins/${uid} { email, name, uid, createdAt } o inicia sesión con una cuenta que SÍ esté en /admins.`);
    process.exit(1);
  }

  console.log('🧩 Procesando recursos de la evaluación sumativa...');
  const processed = await processSummativeMedia({ ...summativeDraft });

  console.log('🔥 Guardando en Realtime Database -> lessons/summative');
  await set(ref(db, 'lessons/summative'), processed);

  console.log('✅ Listo. Evaluación sumativa creada/actualizada.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
