//js/lesson-preview.js
(() => {
  const state = {
    lesson: null,
    questions: [],
    current: 0,
    answers: [],
    results: [],
    checked: []
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadSummativeForPreview();
    document.getElementById('close-preview')?.addEventListener('click', () => window.close());
    document.getElementById('btn-prev')?.addEventListener('click', onPrev);
    document.getElementById('btn-next')?.addEventListener('click', onNext);
    document.getElementById('btn-check')?.addEventListener('click', onCheckCurrent);
    document.getElementById('btn-submit')?.addEventListener('click', onSubmitAll);
    document.getElementById('btn-restart')?.addEventListener('click', onRestart);
    injectStyles();
  });

  function loadSummativeForPreview() {
    const db = firebase.database();
    const ref = db.ref('lessons/summative');

    ref.once('value').then(snapshot => {
      const lesson = snapshot.val();
      const titleEl = document.getElementById('lesson-title');
      const contentEl = document.getElementById('lesson-content');

      if (!lesson) { titleEl.textContent = 'Error: Evaluación no encontrada'; return; }

      state.lesson = lesson;
      state.questions = Array.isArray(lesson.content?.questions) ? lesson.content.questions : [];
      state.current = 0;
      state.answers = new Array(state.questions.length).fill(null);
      state.results = new Array(state.questions.length).fill(null);
      state.checked = new Array(state.questions.length).fill(false);

      titleEl.textContent = lesson.title || 'Evaluación Sumativa';
      contentEl.innerHTML = '';

      const info = document.createElement('div');
      info.innerHTML = `
        <p><strong>Descripción:</strong> ${lesson.description || '—'}</p>
        <p><strong>Estado:</strong> ${lesson.active ? 'Activa' : 'Inactiva'}</p>
        <hr/>
      `;
      contentEl.appendChild(info);

      if (lesson.media) {
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'lesson-media';
        if (lesson.media.image) mediaDiv.innerHTML += `<img src="${lesson.media.image}" alt="Imagen" class="hero-img">`;
        if (lesson.media.audio) mediaDiv.innerHTML += `
          <audio controls class="hero-audio">
            <source src="${lesson.media.audio}" type="audio/mpeg">
          </audio>`;
        contentEl.appendChild(mediaDiv);
      }

      const qWrap = document.createElement('div');
      qWrap.id = 'question-wrap';
      contentEl.appendChild(qWrap);

      renderCurrentQuestion();
      updateProgressText();
    }).catch(err => {
      console.error('Error al cargar evaluación:', err);
      document.getElementById('lesson-title').textContent = 'Error al cargar la evaluación';
      document.getElementById('lesson-content').innerHTML = `<p>${err.message}</p>`;
    });
  }

  /* ---- navegación ---- */
  function onPrev(){ if(state.current>0){ state.current--; renderCurrentQuestion(); updateProgressText(); } }
  function onNext(){ if(state.current<state.questions.length-1){ state.current++; renderCurrentQuestion(); updateProgressText(); } }
  function onCheckCurrent(){
    const ok = checkQuestion(state.current);
    showToast(ok ? '✔ Correcto' : '✖ Incorrecto', ok ? 'success' : 'error');
    state.checked[state.current]=true; state.results[state.current]=ok; markQuestionFeedback(ok);
  }
  function onSubmitAll(){
    let correct=0;
    for(let i=0;i<state.questions.length;i++){ const r=checkQuestion(i); state.checked[i]=true; state.results[i]=r; if(r) correct++; }
    const score = Math.round((correct/state.questions.length)*100);
    showSummary(correct, state.questions.length, score);
  }
  function onRestart(){
    state.current=0;
    state.answers = new Array(state.questions.length).fill(null);
    state.results = new Array(state.questions.length).fill(null);
    state.checked = new Array(state.questions.length).fill(false);
    document.getElementById('result-summary').style.display='none';
    renderCurrentQuestion(); updateProgressText(); showToast('Reiniciado','info');
  }
  function updateProgressText(){ const el=document.getElementById('progress-text'); if(el) el.textContent=`Pregunta ${state.current+1} de ${state.questions.length}`; }

  /* ---- render principal ---- */
  function renderCurrentQuestion() {
    const q = state.questions[state.current];
    const wrap = document.getElementById('question-wrap');
    wrap.innerHTML = '';

    const block = document.createElement('div');
    block.className = 'question-block';

    const heading = document.createElement('h3');
    heading.textContent = `Pregunta ${state.current + 1}${q.text ? `: ${q.text}` : ''}`;
    block.appendChild(heading);

    const type = q.activityType || state.lesson.type || 'Unknown';
    const imageHandledInside = ['AsociarImagenPalabraActivity','CompletarPalabraActivity'].includes(type);

    if (q.audio) {
      block.innerHTML += `
        <audio controls class="q-audio">
          <source src="${q.audio}" type="audio/mpeg">
        </audio>`;
    }
    if (q.image && !imageHandledInside) {
      block.innerHTML += `<img src="${q.image}" alt="Imagen" class="q-image">`;
    }

    const inter = document.createElement('div');
    inter.className = 'interaction';
    block.appendChild(inter);

    const feedback = document.createElement('div');
    feedback.id = 'feedback';
    block.appendChild(feedback);

    wrap.appendChild(block);

    switch (type) {
      case 'OrdenarSílabasActivity':       renderSyllables(q, inter); break;
      case 'ImagenSonidoActivity':         renderImageSound(q, inter); break;
      case 'UnirNumerosActivity':          renderNumberMatch(q, inter); break;
      case 'MemoryGameActivity':           renderMemory(q, inter); break;
      case 'AsociarImagenPalabraActivity': renderImageWord(q, inter); break;
      case 'CompletarPalabraActivity':     renderCompleteWord(q, inter); break;
      case 'EmparejarLetrasActivity':      renderLetterMatch(q, inter); break;   // <--- NUEVO
      default:
        inter.innerHTML = `<pre>${JSON.stringify(q, null, 2)}</pre>`;
    }

    if (state.checked[state.current] === true) {
      markQuestionFeedback(state.results[state.current] === true);
    }
  }

  function markQuestionFeedback(ok){
    const fb=document.getElementById('feedback');
    if(!fb) return;
    fb.textContent = ok ? '¡Correcto!' : 'Revisa tu respuesta e intenta de nuevo.';
    fb.className = ok ? 'feedback ok' : 'feedback ko';
  }

  function showSummary(correct,total,score){
    const box=document.getElementById('result-summary');
    box.style.display='block';
    box.innerHTML = `
      <div class="summary-card">
        <h4>Resultados</h4>
        <p><strong>Aciertos:</strong> ${correct} / ${total}</p>
        <p><strong>Puntaje:</strong> ${score}%</p>
      </div>`;
    window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
  }

  /* ---- validadores ---- */
  function checkQuestion(idx){
    const q=state.questions[idx];
    const ans=state.answers[idx];
    const type=q.activityType || state.lesson.type || 'Unknown';

    switch(type){
      case 'OrdenarSílabasActivity':
        if(!Array.isArray(ans)||!Array.isArray(q.correctAnswer)) return false;
        if(ans.length!==q.correctAnswer.length) return false;
        return ans.every((v,i)=> normalize(v)===normalize(q.correctAnswer[i]));
      case 'ImagenSonidoActivity':
      case 'AsociarImagenPalabraActivity':
      case 'CompletarPalabraActivity':
        if(typeof ans!=='string'||!q.correctAnswer) return false;
        return normalize(ans)===normalize(q.correctAnswer);
      case 'UnirNumerosActivity':
        if(!Array.isArray(ans)||!Array.isArray(q.pairs)) return false;
        if(ans.length!==q.pairs.length) return false;
        {
          const need=q.pairs.map(p=>`${p.number}|${p.image}`).sort();
          const got =ans.map(p=>`${p.number}|${p.image}`).sort();
          return JSON.stringify(need)===JSON.stringify(got);
        }
      case 'MemoryGameActivity':
        if(!ans || typeof ans.matched!=='number') return false;
        return ans.matched>=(q.pairs?.length||0);
      case 'EmparejarLetrasActivity':  // <--- NUEVO
        if(!Array.isArray(ans)||!Array.isArray(q.pairs)) return false;
        if(ans.length!==q.pairs.length) return false;
        {
          const need=q.pairs.map(p=>`${p.uppercase}|${p.lowercase}`).sort();
          const got =ans.map(p=>`${p.uppercase}|${p.lowercase}`).sort();
          return JSON.stringify(need)===JSON.stringify(got);
        }
      default:
        return false;
    }
  }

  function normalize(s){
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }

  /* ---- renderizadores ---- */
  function renderSyllables(q, container) {
    const selected = Array.isArray(state.answers[state.current]) ? [...state.answers[state.current]] : [];
    const pool = [...(q.options || [])];
    selected.forEach(s => { const i=pool.findIndex(x=>x===s); if(i>=0) pool.splice(i,1); });

    container.innerHTML = `
      <div class="syllables">
        <div class="pool" id="syll-pool"></div>
        <div class="selected" id="syll-selected"></div>
      </div>
      <p class="hint">Toca para agregar/quitar. Deben quedar en orden.</p>`;

    const poolEl = container.querySelector('#syll-pool');
    const selEl  = container.querySelector('#syll-selected');

    function draw(){
      poolEl.innerHTML = pool.map(s=>`<span class="chip" data-v="${s}">${s}</span>`).join('');
      selEl.innerHTML  = selected.map((s,i)=>`<span class="chip selected-chip" data-idx="${i}">${s}</span>`).join('');

      poolEl.querySelectorAll('.chip').forEach(ch=>{
        ch.addEventListener('click',()=>{
          const v=ch.getAttribute('data-v'); const idx=pool.indexOf(v);
          if(idx>=0){ pool.splice(idx,1); selected.push(v); state.answers[state.current]=[...selected]; draw(); }
        });
      });
      selEl.querySelectorAll('.chip').forEach(ch=>{
        ch.addEventListener('click',()=>{
          const pos=parseInt(ch.getAttribute('data-idx'),10); const v=selected[pos];
          selected.splice(pos,1); pool.push(v); state.answers[state.current]=[...selected]; draw();
        });
      });
    }
    draw();
  }

  function renderImageSound(q, container){
    const sel = typeof state.answers[state.current]==='string' ? state.answers[state.current] : null;
    const opts=(q.options||[]).map(o=>`
      <button class="option-card ${sel && normalize(sel)===normalize(o.text)?'selected':''}" data-t="${o.text}">
        ${o.image?`<img src="${o.image}" alt="${o.text}" class="opt-img">`:''}
        <span>${o.text}</span>
      </button>`).join('');
    container.innerHTML = `<div class="options-grid">${opts}</div>`;
    container.querySelectorAll('.option-card').forEach(b=>{
      b.addEventListener('click',()=>{ const t=b.getAttribute('data-t'); state.answers[state.current]=t;
        container.querySelectorAll('.option-card').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); });
    });
  }

  function renderNumberMatch(q, container){
    const currentPairs = Array.isArray(state.answers[state.current]) ? [...state.answers[state.current]] : [];
    const imagesAll = [
      ...(q.pairs||[]).map(p=>({number:p.number,image:p.image,correct:true})),
      ...(q.options||[]).map(o=>({number:o.number,image:o.image,correct:false}))
    ];
    const numbers = Array.from(new Set((q.pairs||[]).map(p=>p.number)));

    container.innerHTML = `
      <div class="match-wrap">
        <div class="col"><h4>Números</h4><div id="num-col" class="list"></div></div>
        <div class="col"><h4>Imágenes</h4><div id="img-col" class="grid"></div></div>
      </div>
      <div class="pairs-out"><h4>Pares seleccionados</h4><div id="pairs-sel" class="pairs"></div></div>
      <p class="hint">Primero elige un número y luego una imagen.</p>`;

    const numCol=container.querySelector('#num-col');
    const imgCol=container.querySelector('#img-col');
    const out=container.querySelector('#pairs-sel');
    let activeNumber=null;

    function draw(){
      numCol.innerHTML = numbers.map(n=>`<button class="num-btn ${activeNumber===n?'active':''}" data-n="${n}">${n}</button>`).join('');
      imgCol.innerHTML = imagesAll.map((im,idx)=>`
        <button class="img-btn" data-idx="${idx}" title="n=${im.number||'-'}">
          ${im.image?`<img src="${im.image}" alt="img">`:`<span>img</span>`}
        </button>`).join('');
      out.innerHTML = currentPairs.map((p,i)=>`
        <div class="pair"><span class="tag">${p.number}</span><img src="${p.image}" alt="pair"><button class="rm" data-i="${i}">×</button></div>`).join('');

      numCol.querySelectorAll('.num-btn').forEach(b=> b.addEventListener('click',()=>{ activeNumber=b.getAttribute('data-n'); draw(); }));
      imgCol.querySelectorAll('.img-btn').forEach(b=> b.addEventListener('click',()=>{
        if(!activeNumber){ showToast('Selecciona primero un número','info'); return; }
        const idx=parseInt(b.getAttribute('data-idx'),10); const chosen=imagesAll[idx];
        const exists=currentPairs.find(p=>p.number===activeNumber);
        if(exists){ exists.image=chosen.image; } else { currentPairs.push({number:activeNumber,image:chosen.image}); }
        state.answers[state.current]=[...currentPairs]; activeNumber=null; draw();
      }));
      out.querySelectorAll('.rm').forEach(x=> x.addEventListener('click',()=>{ const i=parseInt(x.getAttribute('data-i'),10); currentPairs.splice(i,1); state.answers[state.current]=[...currentPairs]; draw(); }));
    }
    draw();
  }

  function renderMemory(q, container){
    const base=(q.pairs||[]).map((p,i)=>({key:`k${i}`,image:p.image,audio:p.audio}));
    const cards=shuffle([...base,...base].map((c,i)=>({...c,id:i})));
    let first=null, second=null, locked=false, matchedCount=0;
    const matched=new Set();
    if(state.answers[state.current]?.matched) matchedCount=state.answers[state.current].matched;

    container.innerHTML=`<div id="mem-grid" class="mem-grid"></div>`;
    const grid=container.querySelector('#mem-grid');

    cards.forEach(card=>{
      const tile=document.createElement('button');
      tile.className='mem-card'; tile.setAttribute('data-id',card.id);
      tile.innerHTML=`<span class="back">?</span><img class="front" src="${card.image}" alt="card">`;
      grid.appendChild(tile);

      tile.addEventListener('click',()=>{
        if(locked||matched.has(card.id)) return;
        tile.classList.add('flip');
        if(!first){ first=card; }
        else if(!second && card.id!==first.id){
          second=card; locked=true;
          if(second.key===first.key){
            matched.add(first.id); matched.add(second.id); matchedCount++; state.answers[state.current]={matched:matchedCount};
            locked=false; first=null; second=null;
          }else{
            setTimeout(()=>{ grid.querySelector(`[data-id="${first.id}"]`)?.classList.remove('flip'); grid.querySelector(`[data-id="${second.id}"]`)?.classList.remove('flip'); first=null; second=null; locked=false; },700);
          }
        }
      });
    });
  }

  function renderImageWord(q, container){
    const sel=typeof state.answers[state.current]==='string'?state.answers[state.current]:null;
    container.innerHTML = `
      <div class="img-word">
        ${q.image?`<img src="${q.image}" class="q-image">`:''}
        <div class="options-grid">
          ${(q.options||[]).map(t=>`<button class="option-card ${sel && normalize(sel)===normalize(t)?'selected':''}" data-t="${t}">${t}</button>`).join('')}
        </div>
      </div>`;
    container.querySelectorAll('.option-card').forEach(b=> b.addEventListener('click',()=>{ const t=b.getAttribute('data-t'); state.answers[state.current]=t; container.querySelectorAll('.option-card').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); }));
  }

  function renderCompleteWord(q, container){
    const sel=typeof state.answers[state.current]==='string'?state.answers[state.current]:null;
    const display=(q.text||'').replace(/_/g,'___');
    container.innerHTML = `
      <div class="complete-word">
        ${q.image?`<img src="${q.image}" class="q-image">`:''}
        <p class="cw-text">${display}</p>
        <div class="options-grid">
          ${(q.options||[]).map(t=>`<button class="option-card ${sel && normalize(sel)===normalize(t)?'selected':''}" data-t="${t}">${t}</button>`).join('')}
        </div>
        ${q.fullWord?`<p class="cw-full">Palabra: <strong>${q.fullWord}</strong></p>`:''}
      </div>`;
    container.querySelectorAll('.option-card').forEach(b=> b.addEventListener('click',()=>{ const t=b.getAttribute('data-t'); state.answers[state.current]=t; container.querySelectorAll('.option-card').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); }));
  }

  // NUEVO: Emparejar Letras (MAYÚSCULA ↔ minúscula)
  function renderLetterMatch(q, container){
    const currentPairs = Array.isArray(state.answers[state.current]) ? [...state.answers[state.current]] : [];
    const uppercases = Array.from(new Set((q.pairs||[]).map(p=>p.uppercase)));
    const lowercasePool = [ ...(q.pairs||[]).map(p=>p.lowercase), ...((q.options||[]).map(o=>o.lowercase)) ];

    container.innerHTML = `
      <div class="match-wrap">
        <div class="col"><h4>Mayúsculas</h4><div id="up-col" class="list"></div></div>
        <div class="col"><h4>Minúsculas</h4><div id="low-col" class="list"></div></div>
      </div>
      <div class="pairs-out"><h4>Pares seleccionados</h4><div id="pairs-sel" class="pairs"></div></div>
      <p class="hint">Primero elige una mayúscula y luego su minúscula correspondiente.</p>`;

    const upCol=container.querySelector('#up-col');
    const lowCol=container.querySelector('#low-col');
    const out=container.querySelector('#pairs-sel');

    let activeUpper=null;

    function draw(){
      upCol.innerHTML = uppercases.map(U=>`<button class="num-btn ${activeUpper===U?'active':''}" data-u="${U}">${U}</button>`).join('');
      lowCol.innerHTML = lowercasePool.map((l,idx)=>`<button class="num-btn" data-l="${l}" data-idx="${idx}">${l}</button>`).join('');
      out.innerHTML = currentPairs.map((p,i)=>`<div class="pair"><span class="tag">${p.uppercase}</span><span class="tag">${p.lowercase}</span><button class="rm" data-i="${i}">×</button></div>`).join('');

      upCol.querySelectorAll('.num-btn').forEach(b=> b.addEventListener('click',()=>{ activeUpper=b.getAttribute('data-u'); draw(); }));
      lowCol.querySelectorAll('.num-btn').forEach(b=> b.addEventListener('click',()=>{
        if(!activeUpper){ showToast('Selecciona primero la mayúscula','info'); return; }
        const lower=b.getAttribute('data-l');
        const exists=currentPairs.find(p=>p.uppercase===activeUpper);
        if(exists){ exists.lowercase=lower; } else { currentPairs.push({uppercase:activeUpper, lowercase:lower}); }
        state.answers[state.current]=[...currentPairs]; activeUpper=null; draw();
      }));
      out.querySelectorAll('.rm').forEach(x=> x.addEventListener('click',()=>{ const i=parseInt(x.getAttribute('data-i'),10); currentPairs.splice(i,1); state.answers[state.current]=[...currentPairs]; draw(); }));
    }
    draw();
  }

  /* ---- utils ---- */
  function shuffle(a){ const arr=[...a]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
  function showToast(message,type='success'){ const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=message; document.body.appendChild(t); setTimeout(()=>t.remove(),2000); }

  function injectStyles(){
    const css=`
      header{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
      main{max-width:960px;margin:0 auto;padding:1rem;}
      .hero-img{max-width:100%;height:auto;border-radius:10px;margin:.5rem 0 1rem;}
      .hero-audio{width:100%;margin:.5rem 0 1rem;}
      #progress-bar{margin:.5rem 0 1rem;font-weight:600;}
      #nav-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem;}
      #nav-toolbar button{padding:.5rem .8rem;border-radius:8px;border:1px solid #ddd;cursor:pointer;}
      #result-summary .summary-card{margin-top:1rem;padding:1rem;border:1px solid #eee;border-radius:10px;background:#fafafa;}
      .question-block{background:#fff;border:1px solid #eee;border-radius:10px;padding:1rem;}
      .q-audio{width:100%;margin:.5rem 0 1rem;}
      .q-image{max-width:280px;height:auto;border-radius:8px;margin:.5rem 0;display:block;}
      .interaction{margin-top:.5rem;}
      .feedback{margin-top:.75rem;padding:.5rem .75rem;border-radius:8px;}
      .feedback.ok{background:#e8f7ee;color:#1b5e20;}
      .feedback.ko{background:#fdecea;color:#c62828;}
      .options-grid{display:flex;gap:.5rem;flex-wrap:wrap;}
      .option-card{display:inline-flex;align-items:center;gap:.5rem;border:1px solid #ddd;padding:.5rem .75rem;border-radius:8px;background:#fff;cursor:pointer;}
      .option-card.selected{outline:2px solid #5E503F;}
      .opt-img{width:64px;height:64px;object-fit:cover;border-radius:6px;}
      .syllables{display:flex;gap:1rem;}
      .pool,.selected{flex:1;display:flex;gap:.5rem;flex-wrap:wrap;min-height:48px;padding:.5rem;border:1px dashed #ddd;border-radius:8px;background:#fafafa;}
      .chip{display:inline-block;padding:.35rem .6rem;background:#fff;border:1px solid #ddd;border-radius:6px;cursor:pointer;}
      .selected-chip{background:#f0f0ff;border-color:#bdbdfd;}
      .match-wrap{display:flex;gap:1rem;}
      .col{flex:1;}
      .list{display:flex;gap:.5rem;flex-wrap:wrap;}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.5rem;}
      .num-btn{padding:.5rem .75rem;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;}
      .num-btn.active{outline:2px solid #5E503F;}
      .img-btn{padding:0;border:1px solid #ddd;background:#fff;border-radius:8px;overflow:hidden;cursor:pointer;}
      .img-btn img{display:block;width:100%;height:100px;object-fit:cover;}
      .pairs{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;}
      .pair{display:flex;align-items:center;gap:.5rem;border:1px solid #ddd;padding:.25rem .5rem;border-radius:8px;background:#fff;}
      .pair img{width:56px;height:56px;object-fit:cover;border-radius:6px;}
      .pair .tag{background:#eef;padding:.1rem .4rem;border-radius:6px;}
      .pair .rm{border:none;background:#f44336;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;}
      .mem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:.5rem;}
      .mem-card{position:relative;perspective:700px;border:none;background:transparent;padding:0;cursor:pointer;}
      .mem-card img.front{width:100%;height:90px;object-fit:cover;border-radius:8px;transform:rotateY(180deg);backface-visibility:hidden;transition:transform .25s;}
      .mem-card .back{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#eee;border-radius:8px;font-weight:bold;transition:transform .25s;backface-visibility:hidden;}
      .mem-card.flip .back{transform:rotateY(180deg);}
      .mem-card.flip img.front{transform:rotateY(0deg);}
      .toast{position:fixed;bottom:20px;right:20px;background:#22333B;color:#fff;padding:.6rem .9rem;border-radius:8px;z-index:9999;}
      .toast.error{background:#c62828;}
      .toast.info{background:#5e503f;}
      .hint{color:#666;font-size:.9rem;margin-top:.5rem;}
    `;
    const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  }
})();
