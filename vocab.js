/* ============ Brain Champ — Vocabulary: daily words, spaced repetition, Lexicon game ============ */
(function(){
  const E = Engine;
  const V = window.Vocab = {};
  const DECK = window.VOCAB;
  const INTERVALS = [1, 2, 4, 7, 15, 30]; // days until next review by box
  const PER_DAY = 5;
  const G_LEX = 'linear-gradient(135deg,#f43f8e,#7c5cff)';

  V.init = (state) => {
    if (!state.vocab) state.vocab = {};
    const v = state.vocab;
    if (!v.seed) v.seed = Math.floor(Math.random() * 1e9);
    if (!v.order) v.order = E.shuffle(DECK.map((_, i) => i), E.mulberry(v.seed));
    v.intro = v.intro || {};  // dateKey -> [deck indices]
    v.cards = v.cards || {};  // idx -> {box,due,seen,right,wrong}
    v.learned = v.learned || {}; // dateKey -> true once the learn phase is done
  };

  const introduced = (v) => new Set(Object.values(v.intro).flat());

  /* today's five words (stable for the day) */
  V.todayWords = (state, dateKey = E.todayKey()) => {
    V.init(state); const v = state.vocab;
    if (!v.intro[dateKey]) {
      const seen = introduced(v);
      let fresh = v.order.filter(i => !seen.has(i)).slice(0, PER_DAY);
      if (fresh.length < PER_DAY) { // deck exhausted: recycle the weakest words
        const weakest = Object.keys(v.cards).map(Number).filter(i => !fresh.includes(i)).sort((a, b) => (v.cards[a].box - v.cards[b].box)).slice(0, PER_DAY - fresh.length);
        fresh = fresh.concat(weakest);
      }
      v.intro[dateKey] = fresh;
    }
    return v.intro[dateKey].map(i => ({ idx: i, ...DECK[i] }));
  };
  V.isLearnedToday = (state, dateKey = E.todayKey()) => !!(state.vocab && state.vocab.learned && state.vocab.learned[dateKey]);
  V.card = (state, idx) => state.vocab.cards[idx] || { box: 0, due: null, seen: 0, right: 0, wrong: 0 };
  V.record = (state, idx, ok, dateKey = E.todayKey()) => {
    const c = V.card(state, idx); c.seen++;
    if (ok) { c.right++; c.box = Math.min(5, c.box + 1); } else { c.wrong++; c.box = Math.max(0, c.box - 1); }
    c.due = E.addDays(dateKey, INTERVALS[c.box]);
    state.vocab.cards[idx] = c;
  };
  V.due = (state, dateKey = E.todayKey()) => { V.init(state); const v = state.vocab; const today = v.intro[dateKey] || [];
    return Object.keys(v.cards).map(Number).filter(i => !today.includes(i) && v.cards[i].due && v.cards[i].due <= dateKey); };
  V.learnedCount = (state) => { V.init(state); return Object.keys(state.vocab.cards).length; };
  V.masteredCount = (state) => { V.init(state); return Object.values(state.vocab.cards).filter(c => c.box >= 4).length; };
  V.allKnown = (state) => { V.init(state); const v = state.vocab; return [...introduced(v)].map(i => ({ idx: i, ...DECK[i], card: V.card(state, i) })); };

  /* ---- build a quiz question ---- */
  const distractors = (idx, n, field) => E.sample(DECK.map((w, i) => i).filter(i => i !== idx), n).map(i => DECK[i][field]);
  const sentence = (w, blank) => E.esc(w.e).replace(/___(\w*)/g, (m, suffix) => blank ? `<span class="blank"></span>` : `<b>${E.esc(w.w)}${suffix}</b>`);
  V.question = (idx, type) => {
    const w = DECK[idx];
    if (type === 'meaning') return { idx, type, prompt:`<span class="qtype">What does it mean?</span><span class="w">${E.esc(w.w)}</span>`, options: E.shuffle([w.d, ...distractors(idx, 3, 'd')]), answer: w.d };
    if (type === 'word') return { idx, type, prompt:`<span class="qtype">Which word means…</span>${E.esc(w.d)}`, options: E.shuffle([w.w, ...distractors(idx, 3, 'w')]), answer: w.w };
    return { idx, type, prompt:`<span class="qtype">Fill the blank</span>${sentence(w, true)}`, options: E.shuffle([w.w, ...distractors(idx, 3, 'w')]), answer: w.w, reveal: sentence(w, false) };
  };
  V.buildQuiz = (state, mode) => {
    const today = V.todayWords(state).map(w => w.idx);
    const due = V.due(state);
    let list = [];
    if (mode === 'review') { list = E.shuffle(due).slice(0, 10); if (list.length < 6) list = list.concat(E.shuffle(V.allKnown(state).map(w => w.idx).filter(i => !list.includes(i))).slice(0, 6 - list.length)); }
    else { list = today.slice(); const extra = E.shuffle(due).slice(0, 5); list = list.concat(extra);
      if (list.length < 10) { const known = E.shuffle(V.allKnown(state).map(w => w.idx).filter(i => !list.includes(i))); list = list.concat(known.slice(0, 10 - list.length)); }
      if (list.length < 10) { list = list.concat(E.shuffle(today).slice(0, 10 - list.length)); } }
    const types = ['meaning', 'word', 'blank'];
    return E.shuffle(list.map((idx, k) => V.question(idx, types[k % 3])));
  };

  /* ---- Words tab ---- */
  V.renderWordsTab = (root, state, actions) => {
    V.init(state);
    const today = V.todayWords(state), due = V.due(state), learned = V.learnedCount(state), mastered = V.masteredCount(state);
    const learnedToday = V.isLearnedToday(state);
    root.innerHTML = `
      <div class="topline"><div><div class="greet">Vocabulary</div><h1 class="h1">Five words <span class="gradtext">a day</span></h1></div></div>
      <div class="vocabhero">
        <div class="statbox"><b>${learned}</b><span>words learned</span></div>
        <div class="statbox"><b>${mastered}</b><span>mastered</span></div>
        <div class="statbox"><b>${due.length}</b><span>due for review</span></div>
      </div>
      <div class="sectionhdr"><h2 class="h2">Today's words</h2><span class="link">${learnedToday ? 'Learned ✓' : 'New'}</span></div>
      <div class="wordcards">${today.map(w => `<div class="wc" style="--g:${G_LEX}"><div class="w">${E.esc(w.w)}</div><div class="p">${E.esc(w.p)} · ${w.pos}</div><div class="d">${E.esc(w.d)}</div><div class="e">${sentence(w, false)}</div></div>`).join('')}</div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn block g" style="--g:${G_LEX}" id="vLearn">${E.ICONS.play} ${learnedToday ? 'Quiz again' : 'Learn & quiz'}</button>
        ${due.length ? `<button class="btn ghost" id="vReview">Review ${due.length}</button>` : ''}
      </div>
      <div class="sectionhdr"><h2 class="h2">My vocabulary <small>${learned}</small></h2></div>
      <input class="search" id="vSearch" placeholder="Search words…" autocomplete="off">
      <div class="wordlist" id="vList"></div>`;
    const list = E.$('#vList', root);
    const known = V.allKnown(state).sort((a, b) => a.w.localeCompare(b.w));
    const draw = (q = '') => {
      const rows = known.filter(w => !q || w.w.includes(q) || w.d.toLowerCase().includes(q));
      list.innerHTML = rows.length ? rows.map(w => `<button class="wrow" data-i="${w.idx}"><div class="txt"><div class="w">${E.esc(w.w)} <span style="font-weight:500;color:var(--muted);font-size:12px">${E.esc(w.p)}</span></div><div class="d">${E.esc(w.d)}</div><div class="e hidden">${sentence(w, false)}</div></div><div class="mast">${[0,1,2,3,4].map(i => `<i class="${w.card.box > i ? 'on' : ''}"></i>`).join('')}</div></button>`).join('')
        : `<div class="emptystate">${q ? 'No matches.' : 'Words you learn will appear here with a mastery meter.'}</div>`;
    };
    draw();
    E.$('#vSearch', root).addEventListener('input', e => draw(e.target.value.trim().toLowerCase()));
    list.addEventListener('click', e => { const r = e.target.closest('.wrow'); if (!r) return; r.classList.toggle('open'); r.querySelector('.e').classList.toggle('hidden'); E.sfx('tap'); });
    E.$('#vLearn', root).onclick = () => actions.play('lexicon', { mode: learnedToday ? 'quiz' : 'learn' });
    const rv = E.$('#vReview', root); if (rv) rv.onclick = () => actions.play('lexicon', { mode: 'review' });
  };

  /* ---- the Lexicon game ---- */
  Games.register({
    id:'lexicon', name:'Lexicon', category:'vocabulary',
    tagline:'Learn five uncommon words, then prove you know them.',
    par: 750, noLevel: true,
    g: G_LEX, gc:'#f43f8e', gdim:'#3a1a45',
    icon: E.ICONS.words,
    howto: ['Flip through today\'s five new words: meaning, pronunciation, example.','Then a 10-question quiz: pick the meaning, the word, or fill the blank.','Words you miss come back sooner; words you nail come back later.','Your vocabulary grows every single day.'],
    async run(api){
      const state = api.state; V.init(state);
      const mode = (api.opts && api.opts.mode) || (V.isLearnedToday(state) ? 'quiz' : 'learn');
      const today = V.todayWords(state);
      api.controls.innerHTML = '';
      /* ---- learn phase ---- */
      if (mode === 'learn') {
        for (let i = 0; i < today.length; i++) {
          if (api.dead) return;
          const w = today[i];
          api.setProgress(i / (today.length + 10));
          api.prompt.innerHTML = `<div class="big">New word ${i + 1} of ${today.length}</div><div class="sub">Tap the card to flip it</div>`;
          const card = E.h(`<div class="flash" style="--g:${G_LEX};--gc:#f43f8e"><div class="inner">
              <div class="face front"><div class="word">${E.esc(w.w)}</div><div class="pron">${E.esc(w.p)}</div><div class="taphint">tap to see meaning</div></div>
              <div class="face back"><span class="pos">${w.pos}</span><div class="def">${E.esc(w.d)}</div><div class="ex">${sentence(w, false)}</div></div>
            </div></div>`);
          const dots = E.el('div', 'dots', today.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join(''));
          api.arena.innerHTML = ''; api.arena.append(card, dots);
          const nextBtn = E.h(`<button class="btn g block" style="--g:${G_LEX}" disabled>Got it ${E.ICONS.chev}</button>`);
          api.controls.innerHTML = ''; api.controls.appendChild(nextBtn);
          await new Promise(resolve => {
            card.addEventListener('click', () => { card.classList.toggle('flipped'); E.sfx('flip'); E.buzz(6); nextBtn.disabled = false; });
            nextBtn.onclick = () => { E.sfx('tap'); resolve(); };
          });
        }
        if (api.dead) return;
        state.vocab.learned[E.todayKey()] = true; api.save();
        api.prompt.innerHTML = `<div class="big">Quiz time</div><div class="sub">10 questions</div>`;
        api.arena.innerHTML = `<div class="countdown" style="--g:${G_LEX}">Go!</div>`; api.controls.innerHTML = '';
        E.sfx('levelup'); await E.wait(900, api.token);
      }
      /* ---- quiz phase ---- */
      const quiz = V.buildQuiz(state, mode);
      let score = 0, correct = 0; const total = quiz.length; const missed = [];
      for (let q = 0; q < total; q++) {
        if (api.dead) return;
        const Q = quiz[q];
        api.setProgress(mode === 'learn' ? (today.length + q) / (today.length + total) : q / total);
        api.prompt.innerHTML = `<div class="sub">Question ${q + 1} of ${total}</div>`;
        api.arena.innerHTML = `<div class="question" style="--g:${G_LEX}">${Q.prompt}</div>`;
        const opts = E.el('div', 'options'); api.arena.appendChild(opts); api.controls.innerHTML = '';
        const t0 = performance.now();
        const ok = await new Promise(resolve => {
          Q.options.forEach(o => { const b = E.el('button', '', E.esc(o)); b.onclick = () => {
            if (opts.classList.contains('done')) return; opts.classList.add('done');
            const right = o === Q.answer;
            E.$$('button', opts).forEach(x => { if (x.textContent === Q.answer) x.classList.add('good'); else if (x === b) x.classList.add('badf'); else x.classList.add('dim'); });
            if (right) { const pts = 100 + speedBonusMs(performance.now() - t0); score += pts; E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(10); }
            else { E.feedback(api.arena, 'Not quite', false); E.sfx('bad'); E.buzz([30, 30, 30]); }
            if (Q.reveal) { const r = E.el('div', 'sub', Q.reveal); r.style.cssText = 'color:var(--muted);text-align:center;margin-top:12px;font-size:14px;line-height:1.4'; opts.after(r); }
            api.setScore(score);
            setTimeout(() => resolve(right), right ? 650 : 1500);
          }; opts.appendChild(b); });
        });
        if (api.dead) return;
        if (ok) correct++; else missed.push(DECK[Q.idx].w);
        V.record(state, Q.idx, ok); api.save();
      }
      api.setProgress(1);
      api.finish({ score, level: 1, accuracy: correct / total, stats:[{label:'Correct', value:`${correct}/${total}`},{label:'Words learned', value: V.learnedCount(state)}], note: missed.length ? `Review: ${missed.slice(0, 4).join(', ')}` : 'Flawless. Every word stuck.' });
    }
  });
  const speedBonusMs = (ms) => ms < 2500 ? 25 : ms < 5000 ? 10 : 0;
})();
