/* ============ Brain Champ — the games ============ */
(function(){
  const E = Engine;
  const G = window.Games = { list: [], byId: {} };
  G.register = (g) => { G.list.push(g); G.byId[g.id] = g; };

  G.CATEGORIES = {
    memory:     { name:'Memory',     g:'linear-gradient(135deg,#7c5cff,#38b6ff)', icon:E.ICONS.brain },
    attention:  { name:'Attention',  g:'linear-gradient(135deg,#ff5fa2,#ff8a3d)', icon:E.ICONS.eye },
    speed:      { name:'Speed',      g:'linear-gradient(135deg,#19d3a2,#38b6ff)', icon:E.ICONS.bolt },
    math:       { name:'Maths',      g:'linear-gradient(135deg,#ffb347,#ff5fa2)', icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 7h6M8 4v6M13 6l6 6M19 6l-6 6M5 16h6M13 15h6M13 19h6"/></svg>` },
    language:   { name:'Language',   g:'linear-gradient(135deg,#2ee6a6,#0ea5e9)', icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 5v2.5a7 7 0 0 1-4 6.5M6.5 9a7 7 0 0 0 5.5 5"/><path d="M13 20l4-9 4 9M14.5 17h5"/></svg>` },
    vocabulary: { name:'Vocabulary', g:'linear-gradient(135deg,#f43f8e,#7c5cff)', icon:E.ICONS.words }
  };

  const svgIcon = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const range = (n) => Array.from({length:n}, (_,i)=>i);
  const clampLevel = (l) => Math.max(1, Math.min(30, l));

  /* speed-bonus helper */
  const speedBonus = (ms, fast, mid, a, b) => ms < fast ? a : ms < mid ? b : 0;
  const streakRow = (n, max=5) => range(max).map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('');

  /* ======================================================================
     1. SHAPE RECALL — spatial memory (the signature game)
     ====================================================================== */
  G.register({
    id:'shapes', name:'Shape Recall', category:'memory',
    tagline:'Shapes flash onto a grid, then vanish. Remember where, which and in what order.',
    par: 620,
    g:'linear-gradient(135deg,#7c5cff,#c084fc)', gc:'#7c5cff', gdim:'#2a1f55',
    icon: svgIcon(`<rect x="3" y="3" width="7" height="7" rx="2"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="M6.5 14 10 21H3z"/><path d="M17.5 14l3.5 3.5-3.5 3.5-3.5-3.5z"/>`),
    howto: ['Shapes pop onto the grid for a moment, then vanish. Tap every spot where one was.','From level 4: tap where a <b>specific</b> shape was.','From level 12: tap the spots in the <b>order</b> the shapes appeared.','Grids grow to 6×6 and the flash gets shorter. Perfect rounds level you up.'],
    async run(api){
      let level = api.level; const rounds = 5; let score = 0, hits = 0, tries = 0, perfects = 0;
      for (let r = 0; r < rounds; r++) {
        if (api.dead) return;
        api.setProgress(r / rounds);
        const res = await playRound(level, r);
        if (api.dead) return;
        hits += res.hits; tries += res.n; score += res.points; api.setScore(score);
        if (res.hits === res.n) { perfects++; if (level < 30) { level++; E.sfx('levelup'); E.levelToast(api.arena, 'Perfect!', 'Level ' + level); } else E.levelToast(api.arena, 'Perfect!', 'Max level'); }
        else if (res.hits / res.n < 0.5 && level > 1) { level--; E.sfx('leveldown'); E.levelToast(api.arena, 'Tough one', 'Level ' + level); }
        await E.wait(1050, api.token);
      }
      api.setProgress(1);
      api.finish({ score, level, accuracy: hits / tries, stats:[{label:'Shapes found', value:`${hits}/${tries}`},{label:'Perfect rounds', value:`${perfects}/${rounds}`}] });

      function playRound(level, r){ return new Promise(async resolve => {
        // three modes: spots (L1-3) → which shape (L4-11) → tap in order of appearance (L12+)
        const mode = level <= 3 ? 'spots' : level <= 11 ? 'which' : 'order';
        const size = level <= 6 ? 4 : level <= 17 ? 5 : 6;
        const n = Math.min(mode === 'spots' ? 3 + level : mode === 'which' ? 4 + Math.floor((level - 2) / 2) : 5 + Math.floor((level - 10) / 2), size * size - 3, 12);
        const stagger = mode === 'order' ? 420 : 110;
        const showTime = mode === 'order' ? 650 : Math.max(1100, 600 + n * 360 - level * 25);
        api.prompt.innerHTML = `<div class="big">Watch carefully</div><div class="sub">${n} shapes · ${size}×${size}${mode === 'order' ? ' · remember the ORDER' : mode === 'which' ? ' · remember WHICH is where' : ''}</div>`;
        const grid = E.el('div', 'sgrid locked'); grid.style.gridTemplateColumns = `repeat(${size},1fr)`;
        const cells = range(size * size).map(() => { const c = E.el('div', 'cell'); grid.appendChild(c); return c; });
        api.arena.innerHTML = ''; api.arena.appendChild(grid);
        api.controls.innerHTML = '';
        const positions = E.sample(range(size * size), n);
        const names = E.sample(E.SHAPE_NAMES, n);
        const colors = E.shuffle(E.COLORS).concat(E.COLORS).slice(0, n);
        await E.wait(400, api.token); if (api.dead) return;
        positions.forEach((p, i) => { cells[p].innerHTML = E.shapeSVG(names[i], colors[i], { cls:'shp' }); setTimeout(() => { if (api.dead) return; cells[p].classList.add('show'); E.sfx('show'); }, stagger * i); });
        await E.wait(stagger * (n - 1) + showTime, api.token); if (api.dead) return;
        positions.forEach(p => cells[p].classList.remove('show'));
        E.sfx('whoosh');
        await E.wait(380, api.token); if (api.dead) return;
        positions.forEach(p => cells[p].innerHTML = '');

        let hitsR = 0, points = 0, k = 0;
        const order = mode === 'order' ? range(n) : E.shuffle(range(n));
        const tapped = new Set();
        const setPrompt = () => {
          if (mode === 'which') api.prompt.innerHTML = `<div class="big" style="display:flex;align-items:center;gap:12px">Where was <span class="askshape">${E.shapeSVG(names[order[k]], colors[order[k]])}</span>?</div><div class="sub">${k + 1} of ${n}</div>`;
          else if (mode === 'order') api.prompt.innerHTML = `<div class="big">Tap them in order</div><div class="sub">Shape ${k + 1} of ${n}: which appeared ${k === 0 ? 'first' : k === n - 1 ? 'last' : 'next'}?</div>`;
          else api.prompt.innerHTML = `<div class="big">Tap where they were</div><div class="sub">${n - k} left</div>`;
        };
        setPrompt();
        grid.classList.remove('locked');
        const done = async () => {
          grid.classList.add('locked');
          api.prompt.innerHTML = `<div class="big">${hitsR === n ? 'Perfect!' : `${hitsR} of ${n}`}</div><div class="sub">Round ${r + 1} of ${rounds}</div>`;
          positions.forEach((p, i) => { if (!cells[p].classList.contains('hit')) { cells[p].classList.add('reveal'); cells[p].innerHTML = E.shapeSVG(names[i], colors[i]); } });
          await E.wait(800, api.token);
          resolve({ hits: hitsR, n, points });
        };
        cells.forEach((cell, idx) => cell.addEventListener('pointerdown', () => {
          if (tapped.has(idx) || grid.classList.contains('locked')) return;
          tapped.add(idx);
          const correct = mode === 'spots' ? positions.includes(idx) : idx === positions[order[k]];
          if (correct) {
            const i = positions.indexOf(idx);
            cell.classList.add('hit'); cell.innerHTML = E.shapeSVG(names[i], colors[i]);
            hitsR++; points += 20 + 4 * level; E.sfx('good'); E.buzz(10);
          } else {
            cell.classList.add('miss'); E.sfx('bad'); E.buzz([20, 30, 20]); points = Math.max(0, points - 5);
            if (mode !== 'spots') { const target = positions[order[k]]; const i = positions.indexOf(target); const real = cells[target]; real.classList.add('reveal'); real.innerHTML = E.shapeSVG(names[i], colors[i]); tapped.add(target); }
          }
          k++; api.setScore(score + points);
          if (k >= n) done(); else setPrompt();
        }));
      }); }
    }
  });

  /* ======================================================================
     2. ECHO PATH — sequence memory
     ====================================================================== */
  G.register({
    id:'echo', name:'Echo Path', category:'memory',
    tagline:'Watch the pads light up. Repeat the sequence.',
    par: 520,
    g:'linear-gradient(135deg,#38b6ff,#7c5cff)', gc:'#38b6ff', gdim:'#1a2a55',
    icon: svgIcon(`<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" stroke="none" opacity=".9"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" stroke="none" opacity=".5"/><rect x="13" y="13" width="8" height="8" rx="2"/>`),
    howto: ['Pads light up one after another. Tap them back in the same order.','Each correct round adds a step. Sequences start at 4 and the pads speed up.','From level 5 the grid grows to 16 pads. From level 9 alternate rounds must be repeated <b>backwards</b>.','Three lives.'],
    async run(api){
      const level = api.level;
      const PC = ['#ff5c7a','#ffb347','#ffe95a','#2ee6a6','#38b6ff','#7c5cff','#b57bff','#ff8a3d','#4fffd0','#f472b6','#a3e635','#22d3ee','#fb7185','#fcd34d','#34d399','#818cf8'];
      const gridN = level >= 5 ? 4 : 3, padsN = gridN * gridN;
      const startLen = 4 + Math.floor(level / 2);
      let len = startLen, lives = 3, score = 0, maxLen = startLen - 1, round = 0;
      const onMs = Math.max(220, 520 - level * 18), gap = 120;
      api.prompt.innerHTML = `<div class="big">Watch</div><div class="sub">Sequence of ${len}</div>`;
      const pads = E.el('div', 'pads locked'); pads.style.setProperty('--pc', '#fff'); pads.style.gridTemplateColumns = `repeat(${gridN},1fr)`;
      const padEls = range(padsN).map(i => { const p = E.el('button', 'pad'); p.style.setProperty('--pc', PC[i]); pads.appendChild(p); return p; });
      const livesEl = E.el('div', 'lives', '<i></i><i></i><i></i>');
      api.arena.innerHTML = ''; api.arena.appendChild(pads); api.arena.appendChild(livesEl);
      const light = async (i) => { padEls[i].classList.add('lit'); E.sfx('pad', i); await E.wait(onMs, api.token); padEls[i].classList.remove('lit'); await E.wait(gap, api.token); };
      const setLives = () => E.$$('i', livesEl).forEach((d, i) => d.classList.toggle('off', i >= lives));

      while (lives > 0 && round < 8 && !api.dead) {
        api.setProgress(round / 8);
        const seq = []; for (let i = 0; i < len; i++) { let p; do { p = E.randInt(0, padsN - 1); } while (p === seq[i - 1]); seq.push(p); }
        const reverse = level >= 9 && round % 2 === 1; const expected = reverse ? seq.slice().reverse() : seq;
        api.prompt.innerHTML = `<div class="big">Watch</div><div class="sub">Sequence of ${len}${reverse ? ' · you will repeat it BACKWARDS' : ''}</div>`;
        pads.classList.add('locked');
        await E.wait(700, api.token);
        for (const s of seq) { if (api.dead) return; await light(s); }
        api.prompt.innerHTML = `<div class="big">${reverse ? 'Repeat it BACKWARDS' : 'Your turn'}</div><div class="sub">${reverse ? 'Last pad first' : 'Repeat the ' + len + ' steps'}</div>`;
        pads.classList.remove('locked');
        const ok = await new Promise(resolve => {
          let k = 0; const handlers = [];
          const cleanup = () => handlers.forEach(([el, fn]) => el.removeEventListener('pointerdown', fn));
          padEls.forEach((p, i) => { const fn = () => {
            if (pads.classList.contains('locked')) return;
            p.classList.add('lit'); setTimeout(() => p.classList.remove('lit'), 180);
            if (i === expected[k]) { E.sfx('pad', i); E.buzz(8); k++; api.prompt.querySelector('.sub').textContent = `${len - k} to go`; if (k === expected.length) { cleanup(); resolve(true); } }
            else { E.sfx('bad'); E.buzz([30, 40, 30]); cleanup(); resolve(false); }
          }; p.addEventListener('pointerdown', fn); handlers.push([p, fn]); });
        });
        if (api.dead) return;
        pads.classList.add('locked');
        if (ok) { score += len * (12 + 2 * level); maxLen = Math.max(maxLen, len); len++; round++; api.setScore(score); E.sfx('good'); E.levelToast(api.arena, 'Nice!', `+${len - 1} steps remembered`); }
        else { lives--; setLives(); E.levelToast(api.arena, 'Oops', lives ? `${lives} ${lives === 1 ? 'life' : 'lives'} left` : 'Out of lives'); }
        await E.wait(1000, api.token);
      }
      let newLevel = level; const gain = maxLen - startLen;
      if (gain >= 5) newLevel = clampLevel(level + 2); else if (gain >= 3) newLevel = clampLevel(level + 1); else if (maxLen < startLen) newLevel = clampLevel(level - 1);
      api.setProgress(1);
      api.finish({ score, level: newLevel, accuracy: null, stats:[{label:'Longest sequence', value: maxLen > 0 ? maxLen : '—'},{label:'Rounds cleared', value: round}] });
    }
  });

  /* ======================================================================
     3. SPEED MATCH — processing speed / working memory
     ====================================================================== */
  G.register({
    id:'speedmatch', name:'Speed Match', category:'speed',
    tagline:'Does this card match the one before it? Decide fast.',
    par: 700,
    g:'linear-gradient(135deg,#19d3a2,#38b6ff)', gc:'#19d3a2', gdim:'#113a3a',
    icon: svgIcon(`<rect x="3" y="5" width="9" height="14" rx="2"/><rect x="12" y="5" width="9" height="14" rx="2" transform="rotate(8 16.5 12)"/><path d="M6 12l1.5 1.5L10 10"/>`),
    howto: ['A card appears. Does its <b>shape</b> match the previous card?','Tap MATCH or DIFFERENT as fast as you can.','From level 7 you compare with the card <b>two</b> back.','45 seconds. Streaks earn bonus points.'],
    async run(api){
      const level = api.level; const nback = level >= 7 ? 2 : 1;
      const SH = ['circle','square','triangle','star','heart','hexagon'];
      const history = []; let score = 0, correct = 0, wrong = 0, streak = 0, best = 0, t0 = 0;
      api.prompt.innerHTML = `<div class="big">${nback === 1 ? 'Same shape as the previous card?' : 'Same shape as TWO cards back?'}</div><div class="sub">Memorise the first ${nback === 1 ? 'card' : 'two cards'}</div>`;
      const wrap = E.el('div', '', ''); wrap.style.cssText = 'position:relative;display:grid;place-items:center;width:100%';
      api.arena.innerHTML = ''; api.arena.appendChild(wrap);
      const sb = E.el('div', 'streakbar', streakRow(0)); api.arena.appendChild(sb);
      const btns = E.el('div', 'matchbtns', `<button class="no">${E.ICONS.close} Different</button><button class="yes">${E.ICONS.check} Match</button>`);
      const nextBtn = E.el('div', 'controls', `<button class="btn g block">Next card ${E.ICONS.chev}</button>`);
      api.controls.innerHTML = ''; api.controls.appendChild(nextBtn);
      const showCard = () => {
        let shape;
        const ref = history[history.length - nback];
        if (ref && Math.random() < 0.42) shape = ref.shape; else { do { shape = E.pick(SH); } while (ref && shape === ref.shape); }
        const color = level >= 4 ? E.pick(E.COLORS) : '#fff';
        history.push({ shape, color });
        wrap.innerHTML = `<div class="bigcard">${E.shapeSVG(shape, color)}</div>`;
        t0 = performance.now(); E.sfx('pop');
      };
      showCard();
      nextBtn.querySelector('button').onclick = () => {
        showCard();
        if (history.length >= nback + 1) { api.controls.innerHTML = ''; api.controls.appendChild(btns); api.prompt.querySelector('.sub').textContent = 'Go!'; startTimer(); }
        else if (history.length === nback) { /* still memorising */ }
      };
      if (nback === 1) { /* after first card, next tap starts */ }
      let timer;
      const startTimer = () => { timer = E.countdown(45, s => api.setTimer(s), finish, api.token); };
      const answer = (saysMatch) => {
        if (api.dead) return;
        const cur = history[history.length - 1], ref = history[history.length - 1 - nback];
        const isMatch = cur.shape === ref.shape;
        const card = wrap.querySelector('.bigcard');
        const ms = performance.now() - t0;
        if (saysMatch === isMatch) { correct++; streak++; best = Math.max(best, streak); const pts = 50 + (streak >= 3 ? 25 : 0) + speedBonus(ms, 700, 1200, 20, 10); score += pts; card.classList.add('good'); E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(8); }
        else { wrong++; streak = 0; score = Math.max(0, score - 30); card.classList.add('badf'); E.feedback(api.arena, 'Miss', false); E.sfx('bad'); E.buzz([30, 30, 30]); }
        sb.innerHTML = streakRow(Math.min(streak, 5)); api.setScore(score);
        setTimeout(showCard, 160);
      };
      btns.querySelector('.yes').onclick = () => answer(true);
      btns.querySelector('.no').onclick = () => answer(false);
      function finish(){
        if (api.dead) return;
        const total = correct + wrong, acc = total ? correct / total : 0;
        let newLevel = level; if (total >= 15 && acc >= 0.9) newLevel = clampLevel(level + 1); else if (total >= 8 && acc < 0.6) newLevel = clampLevel(level - 1);
        api.finish({ score, level: newLevel, accuracy: acc, stats:[{label:'Correct', value:`${correct}/${total}`},{label:'Best streak', value: best}] });
      }
    }
  });

  /* ======================================================================
     4. COLOUR CLASH — Stroop attention test
     ====================================================================== */
  G.register({
    id:'stroop', name:'Colour Clash', category:'attention',
    tagline:'Tap the ink colour, not the word. Your brain will fight you.',
    par: 650,
    g:'linear-gradient(135deg,#ff5fa2,#ff8a3d)', gc:'#ff5fa2', gdim:'#4a1a35',
    icon: svgIcon(`<circle cx="8" cy="8" r="4.5"/><circle cx="16" cy="8" r="4.5"/><circle cx="12" cy="15" r="4.5"/>`),
    howto: ['A colour word appears, printed in a different colour. Tap the <b>INK</b> colour, ignore the word.','From level 2 the rule flips to <b>WORD</b> and back without warning. Watch the banner.','From level 5 the buttons shuffle after every answer. From level 8 each word has a time limit.','45 seconds, as many as you can.'],
    async run(api){
      const level = api.level;
      const ALL = [{n:'RED',c:'#ff4d6d'},{n:'BLUE',c:'#3b82f6'},{n:'GREEN',c:'#22c55e'},{n:'YELLOW',c:'#facc15'},{n:'PURPLE',c:'#a855f7'},{n:'ORANGE',c:'#fb923c'}];
      const set = ALL.slice(0, level >= 3 ? 6 : 4);
      const limit = level >= 8 ? Math.max(1300, 2600 - (level - 8) * 120) : 0; let itemTimer = null;
      let rule = 'ink', untilSwitch = E.randInt(4, 7), score = 0, correct = 0, wrong = 0, streak = 0, best = 0, t0 = 0, cur;
      api.prompt.innerHTML = `<div class="rule">Tap the INK colour</div>`;
      const wrap = E.el('div', '', ''); wrap.style.cssText = 'display:grid;place-items:center;width:100%;min-height:120px';
      api.arena.innerHTML = ''; api.arena.appendChild(wrap);
      const sb = E.el('div', 'streakbar', streakRow(0)); api.arena.appendChild(sb);
      const btns = E.el('div', 'colorbtns'); btns.style.setProperty('--n', set.length > 4 ? 3 : 2);
      set.forEach(c => { const b = E.el('button', '', c.n); b.style.setProperty('--c', c.c); b.onclick = () => answer(c); btns.appendChild(b); });
      api.controls.innerHTML = ''; api.controls.appendChild(btns);
      const setRule = (r, flash) => { rule = r; const el = api.prompt.querySelector('.rule'); el.textContent = r === 'ink' ? 'Tap the INK colour' : 'Tap the WORD meaning'; if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); E.sfx('levelup'); E.buzz([20, 40, 20]); } };
      const next = () => {
        if (level >= 2 && --untilSwitch <= 0) { untilSwitch = level >= 8 ? E.randInt(2, 4) : E.randInt(3, 6); setRule(rule === 'ink' ? 'word' : 'ink', true); }
        const word = E.pick(set); let ink = Math.random() < (level >= 6 ? 0.15 : 0.25) ? word : E.pick(set.filter(x => x !== word));
        cur = { word, ink };
        wrap.innerHTML = `<div class="stroopword" style="color:${ink.c}">${word.n}</div>${limit ? `<div class="itembar"><i style="animation-duration:${limit}ms"></i></div>` : ''}`;
        if (level >= 5) E.shuffle([...btns.children]).forEach(b => btns.appendChild(b));
        t0 = performance.now();
        if (limit) { clearTimeout(itemTimer); itemTimer = setTimeout(tooSlow, limit); api.token.timers.push(itemTimer); }
      };
      const tooSlow = () => { if (api.dead) return; if (E.paused) { itemTimer = setTimeout(tooSlow, 400); return; } wrong++; streak = 0; score = Math.max(0, score - 20); E.feedback(api.arena, 'Too slow', false); E.sfx('bad'); E.buzz([30, 30, 30]); sb.innerHTML = streakRow(0); api.setScore(score); next(); };
      const answer = (c) => {
        if (api.dead) return; clearTimeout(itemTimer);
        const target = rule === 'ink' ? cur.ink : cur.word; const ms = performance.now() - t0;
        if (c === target) { correct++; streak++; best = Math.max(best, streak); const pts = 40 + (streak >= 4 ? 20 : 0) + speedBonus(ms, 800, 1400, 20, 10); score += pts; E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(8); }
        else { wrong++; streak = 0; score = Math.max(0, score - 20); E.feedback(api.arena, 'Wrong', false); E.sfx('bad'); E.buzz([30, 30, 30]); wrap.firstElementChild.classList.add('badf'); }
        sb.innerHTML = streakRow(Math.min(streak, 5)); api.setScore(score);
        setTimeout(next, 120);
      };
      next();
      E.countdown(45, s => api.setTimer(s), () => {
        if (api.dead) return;
        const total = correct + wrong, acc = total ? correct / total : 0;
        let newLevel = level; if (total >= 18 && acc >= 0.9) newLevel = clampLevel(level + 1); else if (total >= 8 && acc < 0.65) newLevel = clampLevel(level - 1);
        api.finish({ score, level: newLevel, accuracy: acc, stats:[{label:'Correct', value:`${correct}/${total}`},{label:'Best streak', value: best}] });
      }, api.token);
    }
  });

  /* ======================================================================
     5. QUICK SUMS — mental arithmetic
     ====================================================================== */
  G.register({
    id:'sums', name:'Quick Sums', category:'math',
    tagline:'Mental arithmetic against the clock.',
    par: 650,
    g:'linear-gradient(135deg,#ffb347,#ff5fa2)', gc:'#ffb347', gdim:'#4a2a1a',
    icon: svgIcon(`<path d="M5 7h6M8 4v6"/><path d="M13 6l6 6M19 6l-6 6"/><path d="M5 16h6"/><path d="M13 15h6M13 19h6"/>`),
    howto: ['Solve each sum and tap the right answer from three choices.','Answering fast earns a speed bonus.','Harder sums (×, ÷, two steps) unlock as you level up.','45 seconds.'],
    async run(api){
      const level = api.level; let score = 0, correct = 0, wrong = 0, streak = 0, best = 0, t0 = 0, cur;
      api.prompt.innerHTML = `<div class="sub">Tap the answer</div>`;
      const wrap = E.el('div', '', ''); wrap.style.cssText = 'display:grid;place-items:center;width:100%;min-height:120px';
      api.arena.innerHTML = ''; api.arena.appendChild(wrap);
      const sb = E.el('div', 'streakbar', streakRow(0)); api.arena.appendChild(sb);
      const choices = E.el('div', 'choices'); api.controls.innerHTML = ''; api.controls.appendChild(choices);
      const gen = () => {
        const r = Math.random(); let q, a, b, c;
        if (level <= 3) { if (r < .55) { a = E.randInt(2, 15); b = E.randInt(2, 15); q = `${a} + ${b}`; return { q, ans: a + b }; } a = E.randInt(5, 20); b = E.randInt(1, a - 1); return { q:`${a} − ${b}`, ans: a - b }; }
        if (level <= 7) { if (r < .35) { a = E.randInt(8, 50); b = E.randInt(5, 40); return { q:`${a} + ${b}`, ans:a + b }; } if (r < .65) { a = E.randInt(20, 70); b = E.randInt(5, a - 2); return { q:`${a} − ${b}`, ans:a - b }; } a = E.randInt(2, 9); b = E.randInt(2, 10); return { q:`${a} × ${b}`, ans:a * b }; }
        if (level <= 12) { if (r < .3) { a = E.randInt(3, 12); b = E.randInt(3, 12); return { q:`${a} × ${b}`, ans:a * b }; } if (r < .55) { b = E.randInt(2, 12); a = b * E.randInt(2, 12); return { q:`${a} ÷ ${b}`, ans:a / b }; } if (r < .8) { a = E.randInt(25, 99); b = E.randInt(15, 99); return { q:`${a} + ${b}`, ans:a + b }; } a = E.randInt(40, 120); b = E.randInt(10, a - 5); return { q:`${a} − ${b}`, ans:a - b }; }
        if (r < .3) { a = E.randInt(3, 12); b = E.randInt(3, 12); c = E.randInt(5, 40); return { q:`${a} × ${b} + ${c}`, ans:a * b + c }; }
        if (r < .55) { a = E.randInt(4, 15); b = E.randInt(4, 15); c = E.randInt(2, 6); return { q:`(${a} + ${b}) × ${c}`, ans:(a + b) * c }; }
        if (r < .75) { b = E.randInt(3, 15); a = b * E.randInt(3, 15); return { q:`${a} ÷ ${b}`, ans:a / b }; }
        a = E.randInt(12, 25); b = E.randInt(12, 25); return { q:`${a} × ${b}`, ans:a * b };
      };
      const next = () => {
        cur = gen(); wrap.innerHTML = `<div class="mathq">${cur.q} = ?</div>`;
        const opts = new Set([cur.ans]); while (opts.size < 3) { const d = cur.ans + E.pick([-10,-5,-3,-2,-1,1,2,3,5,10,E.randInt(-12,12)]); if (d >= 0 && d !== cur.ans) opts.add(d); }
        choices.innerHTML = ''; E.shuffle([...opts]).forEach(v => { const b = E.el('button', '', v); b.onclick = () => answer(v, b); choices.appendChild(b); });
        t0 = performance.now();
      };
      const answer = (v, b) => {
        if (api.dead) return; const ms = performance.now() - t0;
        if (v === cur.ans) { correct++; streak++; best = Math.max(best, streak); const pts = 40 + (streak >= 3 ? 15 : 0) + speedBonus(ms, 2000, 3500, 25, 10); score += pts; b.classList.add('good'); E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(8); setTimeout(next, 180); }
        else { wrong++; streak = 0; score = Math.max(0, score - 20); b.classList.add('badf'); E.feedback(api.arena, 'Nope', false); E.sfx('bad'); E.buzz([30, 30, 30]); choices.querySelectorAll('button').forEach(x => { if (+x.textContent === cur.ans) x.classList.add('good'); }); setTimeout(next, 700); }
        sb.innerHTML = streakRow(Math.min(streak, 5)); api.setScore(score);
      };
      next();
      E.countdown(45, s => api.setTimer(s), () => {
        if (api.dead) return;
        const total = correct + wrong, acc = total ? correct / total : 0;
        let newLevel = level; if (correct >= 12 && acc >= 0.9) newLevel = clampLevel(level + 1); else if (total >= 6 && acc < 0.6) newLevel = clampLevel(level - 1);
        api.finish({ score, level: newLevel, accuracy: acc, stats:[{label:'Solved', value:`${correct}/${total}`},{label:'Best streak', value: best}] });
      }, api.token);
    }
  });

  /* ======================================================================
     6. NUMBER VAULT — digit span
     ====================================================================== */
  G.register({
    id:'vault', name:'Number Vault', category:'memory',
    tagline:'Digits flash one by one. Type them back.',
    par: 560,
    g:'linear-gradient(135deg,#5b6cff,#38e6ff)', gc:'#5b6cff', gdim:'#1a2050',
    icon: svgIcon(`<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><path d="M12 10v2l1.5 1"/>`),
    howto: ['Digits flash one at a time (starting at 4), then disappear. Type them back.','From level 4 alternate rounds want them <b>backwards</b>.','From level 9 every third round wants them <b>sorted</b> smallest to largest.','Six rounds; perfect rounds level you up, the flashes get faster.'],
    async run(api){
      let level = api.level; const rounds = 6; let score = 0, perfect = 0, digitsRight = 0, digitsTotal = 0;
      for (let r = 0; r < rounds; r++) {
        if (api.dead) return; api.setProgress(r / rounds);
        const len = Math.min(4 + Math.floor(level / 2), 12); const mode = level >= 9 && r % 3 === 2 ? 'sorted' : level >= 4 && r % 2 === 1 ? 'backwards' : 'forward';
        const digits = range(len).map(() => E.randInt(0, 9));
        const target = mode === 'backwards' ? digits.slice().reverse() : mode === 'sorted' ? digits.slice().sort((a, b) => a - b) : digits;
        api.prompt.innerHTML = `<div class="big">Memorise</div><div class="sub">${len} digits${mode === 'backwards' ? ' · you will enter them BACKWARDS' : mode === 'sorted' ? ' · you will enter them SMALLEST to LARGEST' : ''}</div>`;
        api.controls.innerHTML = ''; api.arena.innerHTML = '';
        await E.wait(600, api.token);
        const per = Math.max(320, 640 - level * 20);
        for (const d of digits) { if (api.dead) return; api.arena.innerHTML = `<div class="digitshow">${d}</div>`; E.sfx('tick'); await E.wait(per, api.token); api.arena.innerHTML = ''; await E.wait(130, api.token); }
        if (api.dead) return;
        api.prompt.innerHTML = `<div class="big">${mode === 'backwards' ? 'Enter it BACKWARDS' : mode === 'sorted' ? 'Smallest to largest' : 'Enter the number'}</div><div class="sub">${len} digits</div>`;
        const entry = E.el('div', 'entry', range(len).map((_, i) => `<i class="${i === 0 ? 'cur' : ''}"></i>`).join('')); api.arena.appendChild(entry);
        const pad = E.el('div', 'keypad'); api.arena.appendChild(pad);
        const typed = [];
        const result = await new Promise(resolve => {
          const refresh = () => E.$$('i', entry).forEach((s, i) => { s.textContent = typed[i] ?? ''; s.classList.toggle('cur', i === typed.length); });
          [1,2,3,4,5,6,7,8,9,'⌫',0,'OK'].forEach(k => { const b = E.el('button', typeof k === 'string' ? 'fn' : '', k); b.onclick = () => {
            if (k === '⌫') { typed.pop(); refresh(); E.sfx('tap'); return; }
            if (k === 'OK') { if (typed.length === len) resolve(typed.slice()); return; }
            if (typed.length < len) { typed.push(k); E.sfx('tap'); E.buzz(6); refresh(); if (typed.length === len) setTimeout(() => resolve(typed.slice()), 220); }
          }; pad.appendChild(b); });
        });
        if (api.dead) return;
        pad.style.pointerEvents = 'none';
        let right = 0; E.$$('i', entry).forEach((s, i) => { const ok = result[i] === target[i]; if (ok) right++; s.classList.add(ok ? 'ok' : 'ko'); s.classList.remove('cur'); });
        digitsRight += right; digitsTotal += len;
        score += right * (12 + 3 * level) + (right === len ? 40 : 0); api.setScore(score);
        if (right === len) { perfect++; E.sfx('levelup'); if (level < 30) { level++; E.levelToast(api.arena, 'Perfect!', 'Level ' + level); } else E.levelToast(api.arena, 'Perfect!', ''); }
        else { E.sfx('bad'); const show = E.el('div', 'sub', `It was ${target.join('')}`); show.style.cssText = 'color:var(--muted);margin-top:10px;font-size:14px'; entry.after(show); if (right < len / 2 && level > 1) { level--; E.levelToast(api.arena, 'Not quite', 'Level ' + level); } }
        await E.wait(1400, api.token);
      }
      api.setProgress(1);
      api.finish({ score, level, accuracy: digitsRight / digitsTotal, stats:[{label:'Digits right', value:`${digitsRight}/${digitsTotal}`},{label:'Perfect rounds', value:`${perfect}/${rounds}`}] });
    }
  });

  /* ======================================================================
     7. ODD ONE OUT — visual attention
     ====================================================================== */
  G.register({
    id:'oddone', name:'Odd One Out', category:'attention',
    tagline:'One shape is different. Find it before the clock runs out.',
    par: 600,
    g:'linear-gradient(135deg,#ff7a59,#ffcf5a)', gc:'#ff7a59', gdim:'#4a2a20',
    icon: svgIcon(`<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" stroke="none"/>`),
    howto: ['A grid of identical shapes appears, except one. Tap the odd one.','It may differ in hue, brightness, shape, size or rotation, and the differences shrink as you level up.','Grids grow to 7×7. From level 8 each board has a time limit before it counts as a miss.','45 seconds.'],
    async run(api){
      const level = api.level; let score = 0, correct = 0, wrong = 0, t0 = 0;
      api.prompt.innerHTML = `<div class="big">Find the odd one</div><div class="sub">Tap it</div>`;
      api.controls.innerHTML = '';
      const size = level <= 2 ? 3 : level <= 5 ? 4 : level <= 9 ? 5 : level <= 14 ? 6 : 7;
      const limit = level >= 8 ? Math.max(1800, 4500 - (level - 8) * 250) : 0; let boardTimer = null;
      const next = () => {
        const grid = E.el('div', 'ogrid'); grid.style.gridTemplateColumns = `repeat(${size},1fr)`;
        const base = E.pick(E.SHAPE_NAMES), color = E.pick(E.COLORS);
        let types = ['hue', 'shape']; if (level >= 2) types.push('rotate'); if (level >= 4) types.push('size'); if (level >= 6) types.push('light'); if (level >= 9) types.push('hue', 'light'); if (level >= 12) types = types.filter(t => t !== 'shape');
        const type = E.pick(types), odd = E.randInt(0, size * size - 1);
        let oddSVG;
        if (type === 'hue') { const [h, s, l] = E.hexToHsl(color); const delta = Math.max(6, 30 - level * 1.5) * (Math.random() < .5 ? -1 : 1); oddSVG = E.shapeSVG(base, `hsl(${(h + delta + 360) % 360} ${s}% ${l}%)`); }
        else if (type === 'light') { const [h, s, l] = E.hexToHsl(color); const delta = Math.max(5, 14 - level * 0.5) * (l > 60 ? -1 : 1); oddSVG = E.shapeSVG(base, `hsl(${h} ${s}% ${Math.min(95, Math.max(15, l + delta))}%)`); }
        else if (type === 'shape') { const alt = E.pick(E.SHAPE_NAMES.filter(s => s !== base)); oddSVG = E.shapeSVG(alt, color); }
        else if (type === 'rotate') { oddSVG = E.shapeSVG(base, color, { rotate: level >= 12 ? 10 : level >= 7 ? 15 : 24 }); }
        else { oddSVG = E.shapeSVG(base, color, { scale: level >= 12 ? 0.9 : level >= 7 ? 0.85 : 0.78 }); }
        if (size >= 6) grid.style.gap = '5px';
        const normal = E.shapeSVG(base, color, { rotate: 0 });
        range(size * size).forEach(i => { const c = E.el('div', 'oc', i === odd ? oddSVG : normal); c.addEventListener('pointerdown', () => tap(i === odd, c)); grid.appendChild(c); });
        api.arena.innerHTML = ''; api.arena.appendChild(grid); t0 = performance.now();
        if (limit) { api.prompt.innerHTML = `<div class="big">Find the odd one</div><div class="itembar"><i style="animation-duration:${limit}ms"></i></div>`; clearTimeout(boardTimer); const onBoardTimeout = () => { if (api.dead) return; if (E.paused) { boardTimer = setTimeout(onBoardTimeout, 400); return; } wrong++; score = Math.max(0, score - 10); api.setScore(score); const oddCell = grid.querySelectorAll('.oc')[odd]; if (oddCell) oddCell.classList.add('good'); E.feedback(api.arena, 'Too slow', false); E.sfx('bad'); setTimeout(next, 500); }; boardTimer = setTimeout(onBoardTimeout, limit); api.token.timers.push(boardTimer); }
      };
      const tap = (ok, cell) => {
        if (api.dead) return; const ms = performance.now() - t0; if (ok) clearTimeout(boardTimer);
        if (ok) { correct++; const pts = 45 + speedBonus(ms, 1500, 3000, 25, 10); score += pts; cell.classList.add('good'); E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(8); setTimeout(next, 160); }
        else { wrong++; score = Math.max(0, score - 20); cell.classList.add('badf'); E.sfx('bad'); E.buzz([30, 30, 30]); }
        api.setScore(score);
      };
      next();
      E.countdown(45, s => api.setTimer(s), () => {
        if (api.dead) return;
        const total = correct + wrong, acc = total ? correct / total : 0;
        let newLevel = level; if (correct >= 12 && acc >= 0.85) newLevel = clampLevel(level + 1); else if (correct < 5 || acc < 0.5) newLevel = clampLevel(level - 1);
        api.finish({ score, level: newLevel, accuracy: acc, stats:[{label:'Found', value: correct},{label:'Wrong taps', value: wrong}] });
      }, api.token);
    }
  });

  /* ======================================================================
     8. LETTER MIX — unscramble words
     ====================================================================== */
  G.register({
    id:'scramble', name:'Letter Mix', category:'language',
    tagline:'Unscramble the letters into a real word.',
    par: 520,
    g:'linear-gradient(135deg,#2ee6a6,#0ea5e9)', gc:'#2ee6a6', gdim:'#113a3a',
    icon: svgIcon(`<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="8.5" y="13" width="7" height="7" rx="2"/><path d="M6.5 7.5h.01M17.5 7.5h.01M12 16.5h.01"/>`),
    howto: ['Tap the letter tiles to spell the hidden word.','Tap a filled slot to send that letter back.','Hint reveals the next letter but costs points. Skip is free.','60 seconds.'],
    async run(api){
      const level = api.level; let score = 0, solved = 0, clean = 0, skipped = 0, used = new Set(), cur, hintUsed = false;
      const lenFor = () => level <= 3 ? 4 : level <= 8 ? 5 : level <= 12 ? (Math.random() < .5 ? 5 : 6) : 6;
      api.prompt.innerHTML = `<div class="big">Spell the word</div><div class="sub">Tap the letters in order</div>`;
      const slots = E.el('div', 'slots'), tiles = E.el('div', 'tiles'), hint = E.el('div', 'wordhint');
      api.arena.innerHTML = ''; api.arena.append(slots, tiles, hint);
      const tools = E.el('div', 'wordtools', `<button class="btn ghost sm" data-a="hint">Hint −15</button><button class="btn ghost sm" data-a="clear">Clear</button><button class="btn ghost sm" data-a="skip">Skip</button>`);
      api.controls.innerHTML = ''; api.controls.appendChild(tools);
      let answer = [];
      const render = () => {
        slots.innerHTML = cur.word.split('').map((_, i) => `<i class="${answer[i] != null ? 'filled' : ''}" data-i="${i}">${answer[i] != null ? cur.letters[answer[i]] : ''}</i>`).join('');
        E.$$('button', tiles).forEach((b, i) => b.classList.toggle('used', answer.includes(i)));
      };
      const next = () => {
        let w; const len = lenFor(); const pool = WORDS[len]; let guard = 0; do { w = E.pick(pool); } while (used.has(w) && guard++ < 50); used.add(w);
        let letters; do { letters = E.shuffle(w.split('')); } while (letters.join('') === w);
        cur = { word: w, letters }; answer = []; hintUsed = false; hint.textContent = '';
        tiles.innerHTML = ''; letters.forEach((ch, i) => { const b = E.el('button', '', ch); b.onclick = () => { if (answer.includes(i) || answer.length >= w.length) return; answer.push(i); E.sfx('tap'); E.buzz(6); render(); if (answer.length === w.length) check(); }; tiles.appendChild(b); });
        render();
      };
      slots.addEventListener('click', e => { const s = e.target.closest('i'); if (!s) return; const i = +s.dataset.i; if (answer[i] == null) return; answer.splice(i, 1); E.sfx('tap'); render(); });
      const check = () => {
        const guess = answer.map(i => cur.letters[i]).join('');
        if (guess === cur.word) { solved++; if (!hintUsed) clean++; const pts = 60 + (hintUsed ? 0 : 20) + cur.word.length * 4; score += pts; slots.classList.add('good'); E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(10); api.setScore(score); setTimeout(() => { slots.classList.remove('good'); next(); }, 550); }
        else { slots.classList.add('badf'); E.sfx('bad'); E.buzz([30, 30, 30]); score = Math.max(0, score - 10); api.setScore(score); setTimeout(() => { slots.classList.remove('badf'); answer = []; render(); }, 450); }
      };
      tools.onclick = (e) => { const a = e.target.closest('button')?.dataset.a; if (!a) return;
        if (a === 'clear') { answer = []; render(); E.sfx('tap'); }
        if (a === 'skip') { skipped++; hint.textContent = `It was "${cur.word.toUpperCase()}"`; E.sfx('whoosh'); setTimeout(next, 700); }
        if (a === 'hint') { hintUsed = true; score = Math.max(0, score - 15); api.setScore(score);
          const k = answer.length; const needed = cur.word[k]; const idx = cur.letters.findIndex((ch, i) => ch === needed && !answer.includes(i)); if (idx >= 0) { answer.push(idx); render(); E.sfx('pop'); if (answer.length === cur.word.length) check(); } }
      };
      next();
      E.countdown(60, s => api.setTimer(s), () => {
        if (api.dead) return;
        let newLevel = level; if (clean >= 10) newLevel = clampLevel(level + 2); else if (clean >= 6) newLevel = clampLevel(level + 1); else if (solved <= 2) newLevel = clampLevel(level - 1);
        api.finish({ score, level: newLevel, accuracy: null, stats:[{label:'Words solved', value: solved},{label:'Skipped', value: skipped}] });
      }, api.token);
    }
  });
  /* ======================================================================
     9. WORD FIT — grammar and usage
     ====================================================================== */
  G.register({
    id:'grammar', name:'Word Fit', category:'language',
    tagline:'Fill the gap with the word a careful writer would choose.',
    par: 900,
    g:'linear-gradient(135deg,#0ea5e9,#8b5cf6)', gc:'#0ea5e9', gdim:'#162a4a',
    icon: svgIcon(`<path d="M4 7h16M4 12h6M4 17h10"/><path d="M14 13l2.5 2.5L21 11"/>`),
    howto: ['A sentence has one word missing. Pick the option a careful native speaker would use.','The wrong options are the classic traps: who/whom, lie/lay, fewer/less, affect/effect and worse.','Every answer comes with a one-line explanation, right or wrong.','12 questions. Harder traps unlock as you level up. Questions never repeat until you have seen them all.'],
    async run(api){
      const level = api.level, state = api.state, total = 12; let score = 0, correct = 0, streak = 0, best = 0;
      const bank = window.GRAMMAR;
      state.grammarSeen = state.grammarSeen || [];
      const weights = level <= 4 ? { 1:.5, 2:.4, 3:.1 } : level <= 10 ? { 1:.2, 2:.5, 3:.3 } : { 1:0, 2:.35, 3:.65 };
      const pickSet = () => {
        let unseen = bank.map((q, i) => i).filter(i => !state.grammarSeen.includes(i));
        if (unseen.length < total) { state.grammarSeen = []; unseen = bank.map((q, i) => i); }
        const chosen = [];
        for (let k = 0; k < total; k++) {
          const r = Math.random(); const want = r < weights[1] ? 1 : r < weights[1] + weights[2] ? 2 : 3;
          let pool = unseen.filter(i => !chosen.includes(i) && bank[i].d === want);
          if (!pool.length) pool = unseen.filter(i => !chosen.includes(i));
          chosen.push(E.pick(pool));
        }
        return E.shuffle(chosen);
      };
      const qs = pickSet();
      api.controls.innerHTML = '';
      for (let n = 0; n < total; n++) {
        if (api.dead) return;
        const qi = qs[n], Q = bank[qi];
        api.setProgress(n / total);
        api.prompt.innerHTML = `<div class="sub">Question ${n + 1} of ${total} · ${['','easy','tricky','expert'][Q.d]}</div>`;
        api.arena.innerHTML = `<div class="question" style="--g:${G.byId.grammar.g}"><span class="qtype">Fill the gap</span>${E.esc(Q.s).replace('___', '<span class="blank"></span>')}</div>`;
        const opts = E.el('div', 'options'); api.arena.appendChild(opts);
        const order = E.shuffle(Q.o.map((o, i) => i)); const t0 = performance.now();
        const ok = await new Promise(resolve => {
          order.forEach(oi => { const b = E.el('button', '', E.esc(Q.o[oi])); b.onclick = () => {
            if (opts.classList.contains('done')) return; opts.classList.add('done');
            const right = oi === Q.a; const ms = performance.now() - t0;
            E.$$('button', opts).forEach((x, k) => { const id = order[k]; if (id === Q.a) x.classList.add('good'); else if (x === b) x.classList.add('badf'); else x.classList.add('dim'); });
            if (right) { streak++; best = Math.max(best, streak); const pts = 80 + (streak >= 3 ? 20 : 0) + speedBonus(ms, 4000, 8000, 30, 15); score += pts; E.feedback(api.arena, '+' + pts, true); E.sfx('good'); E.buzz(10); }
            else { streak = 0; E.feedback(api.arena, 'Not quite', false); E.sfx('bad'); E.buzz([30, 30, 30]); }
            api.setScore(score);
            const full = E.el('div', 'sub', `<b style="color:var(--text)">${E.esc(Q.s).replace('___', '<u>' + E.esc(Q.o[Q.a]) + '</u>')}</b><br>${E.esc(Q.x)}`);
            full.style.cssText = 'color:var(--muted);text-align:center;margin-top:14px;font-size:14px;line-height:1.45;padding:0 6px';
            opts.after(full);
            const nb = E.h(`<button class="btn g block" style="--g:${G.byId.grammar.g}">${n + 1 < total ? 'Next' : 'Finish'} ${E.ICONS.chev}</button>`);
            api.controls.innerHTML = ''; api.controls.appendChild(nb);
            nb.onclick = () => { E.sfx('tap'); api.controls.innerHTML = ''; resolve(right); };
          }; opts.appendChild(b); });
        });
        if (api.dead) return;
        if (ok) correct++;
        state.grammarSeen.push(qi); api.save();
      }
      api.setProgress(1);
      let newLevel = level; if (correct >= 12) newLevel = clampLevel(level + 2); else if (correct >= 10) newLevel = clampLevel(level + 1); else if (correct <= 7) newLevel = clampLevel(level - 1);
      api.finish({ score, level: newLevel, accuracy: correct / total, stats:[{label:'Correct', value:`${correct}/${total}`},{label:'Best streak', value: best}], note: correct === total ? 'Flawless. A careful writer.' : `${bank.length - state.grammarSeen.length} questions still unseen` });
    }
  });
})();
