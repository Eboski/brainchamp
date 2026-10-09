/* ============ Brain Champ — app shell: state, screens, daily workout flow ============ */
(function(){
  const E = Engine, G = Games;
  const KEY = 'brainchamp.v1';
  const DAILY_COUNT = 7;

  /* ---------------- state ---------------- */
  const defaults = () => ({ settings:{ sound:true, haptics:true, name:'' }, levels:{}, best:{}, history:{}, cat:{}, vocab:null, created: E.todayKey(), bpiHist:{} });
  let state;
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.settings) return Object.assign(defaults(), s); } catch(e){} return defaults(); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} };
  state = load(); E.settings = state.settings; Vocab.init(state); save();

  const level = (id) => state.levels[id] || 1;
  const game = (id) => G.byId[id];
  const cat = (id) => G.CATEGORIES[game(id).category];

  /* ---------------- daily plan ---------------- */
  const planFor = (dateKey) => {
    const d = E.dayIndex(dateKey), rand = E.mulberry(d * 7919 + 13);
    const mem = [['shapes','echo'],['shapes','vault'],['echo','vault']][d % 3];
    const att = ['stroop','oddone'][d % 2];
    let list = E.shuffle([mem[0], mem[1], att, 'speedmatch', 'sums', 'scramble'], rand);
    if (list.includes('shapes')) { list = ['shapes', ...list.filter(x => x !== 'shapes')]; }
    list.push('lexicon');
    return list;
  };
  const today = () => E.todayKey();
  const dayRec = (k = today()) => { if (!state.history[k]) state.history[k] = { games:{}, free:{}, complete:false, total:0 }; return state.history[k]; };
  const doneToday = () => { const r = state.history[today()]; return r ? Object.keys(r.games).length : 0; };
  const nextDailyGame = () => planFor(today()).find(id => !(state.history[today()] && state.history[today()].games[id]));
  const streak = () => { let n = 0, k = today(); if (!(state.history[k] && state.history[k].complete)) k = E.addDays(k, -1); while (state.history[k] && state.history[k].complete) { n++; k = E.addDays(k, -1); } return n; };
  const bpi = () => { const vals = Object.values(state.cat); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0; };
  const norm = (id, score) => Math.min(1000, Math.round(score / game(id).par * 500));

  const record = (id, result, daily) => {
    const g = game(id);
    if (!g.noLevel) state.levels[id] = result.level;
    const isBest = !state.best[id] || result.score > state.best[id];
    if (isBest) state.best[id] = result.score;
    const n = norm(id, result.score), c = g.category;
    state.cat[c] = state.cat[c] == null ? n : Math.round(state.cat[c] * 0.7 + n * 0.3);
    const rec = dayRec();
    const entry = { score: result.score, level: result.level, stars: E.stars(result.score, g.par), t: Date.now() };
    if (daily) rec.games[id] = entry; else rec.free[id] = Math.max(rec.free[id] || 0, result.score);
    rec.total = Object.values(rec.games).reduce((a, b) => a + b.score, 0);
    let justCompleted = false;
    if (daily && !rec.complete && planFor(today()).every(x => rec.games[x])) { rec.complete = true; justCompleted = true; }
    state.bpiHist[today()] = bpi();
    save();
    return { isBest, justCompleted };
  };

  /* ---------------- routing ---------------- */
  const app = E.$('#app');
  let tab = 'home';
  const tabs = { home: renderHome, train: renderTrain, words: renderWords, stats: renderStats };
  E.$$('.tab').forEach(b => { b.querySelector('.tabicon').innerHTML = E.ICONS[b.dataset.icon || b.dataset.tab] || E.ICONS[b.querySelector('.tabicon').dataset.icon]; b.onclick = () => { E.sfx('tap'); go(b.dataset.tab); }; });
  function go(t){ tab = t; E.$$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); app.innerHTML = ''; const s = E.el('div', 'screen'); app.appendChild(s); tabs[t](s); window.scrollTo(0, 0); }

  const greeting = () => { const h = new Date().getHours(); const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; return state.settings.name ? `${g}, ${E.esc(state.settings.name)}` : g; };
  const gameTile = (id, i, rec) => { const g = game(id), c = cat(id), done = rec && rec.games[id];
    return `<button class="gcard ${done ? 'done' : ''} ${!done && nextDailyGame() === id ? 'next' : ''}" data-play="${id}" style="--g:${g.g};--gc:${g.gc};--gc2:${g.gc}">
      <div class="tile">${g.icon}</div>
      <div class="info"><div class="name">${g.name}</div><div class="meta"><span class="cat">${c.name}</span>${g.noLevel ? '' : `· Level ${level(id)}`}</div></div>
      <div class="right">${done ? `<b>${done.score}</b><span class="done">${E.ICONS.check}</span>` : `<span class="numbadge">${i + 1}</span>`}</div></button>`; };

  /* ---------------- HOME ---------------- */
  function renderHome(root){
    const plan = planFor(today()), rec = state.history[today()], done = doneToday(), complete = rec && rec.complete;
    const pct = done / plan.length, R = 50, C = 2 * Math.PI * R;
    const st = streak(), index = bpi();
    const days = Array.from({ length: 7 }, (_, i) => E.addDays(today(), i - 6));
    root.innerHTML = `
      <div class="topline"><div><div class="greet">${greeting()}</div><h1 class="h1">${complete ? 'Workout <span class="gradtext">complete</span>' : done ? 'Keep <span class="gradtext">going</span>' : 'Daily <span class="gradtext">workout</span>'}</h1></div>
        <button class="iconbtn" id="settingsBtn" aria-label="Settings">${E.ICONS.gear}</button></div>
      <div class="card glow hero">
        <div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset=".55" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs>
          <circle class="track" cx="60" cy="60" r="${R}" fill="none" stroke-width="10"/><circle class="fill" cx="60" cy="60" r="${R}" fill="none" stroke-width="10" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div class="center"><b>${done}/${plan.length}</b><span>games</span></div></div>
        <div class="herotext"><div class="t">${E.fmtDate(today()).split(',')[0]}'s session</div>
          <div class="s">${complete ? `Brilliant. ${rec.total} points today. Come back tomorrow for a fresh set.` : done ? `${plan.length - done} games left. Pick up where you stopped.` : `${plan.length} games, about 8 minutes. Memory, attention, speed, maths, language and five new words.`}</div></div>
        <button class="btn" id="startBtn">${complete ? E.ICONS.refresh + ' Free play' : done ? E.ICONS.play + ' Continue workout' : E.ICONS.play + ' Start workout'}</button>
      </div>
      <div class="chips"><span class="chip fire">${E.ICONS.flame.replace('<svg', '<svg width="16" height="16"')} ${st} day streak</span><span class="chip"><i class="dot"></i> Brain Index ${index}</span><span class="chip">${Vocab.learnedCount(state)} words learned</span></div>
      <div class="sectionhdr"><h2 class="h2">This week</h2></div>
      <div class="dayslist">${days.map(k => { const r = state.history[k]; const d = E.keyToDate(k); return `<div class="daypill ${r && r.complete ? 'done' : ''} ${k === today() ? 'today' : ''}">${d.toLocaleDateString(undefined, { weekday:'short' })}<b>${d.getDate()}</b></div>`; }).join('')}</div>
      <div class="sectionhdr"><h2 class="h2">Today's games</h2><span class="link">${complete ? 'All done' : `${done}/${plan.length}`}</span></div>
      <div class="wlist">${plan.map((id, i) => gameTile(id, i, rec)).join('')}</div>`;
    requestAnimationFrame(() => setTimeout(() => { const f = root.querySelector('.ring .fill'); if (f) f.style.strokeDashoffset = C * (1 - pct); }, 50));
    E.$('#startBtn', root).onclick = () => { E.sfx('tap'); if (complete) go('train'); else startDaily(); };
    E.$('#settingsBtn', root).onclick = openSettings;
    root.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { const id = b.dataset.play; E.sfx('tap'); if (rec && rec.games[id]) { playGame(id, { daily:false }); } else startDaily(id); });
  }

  /* ---------------- TRAIN (free play) ---------------- */
  function renderTrain(root){
    const cats = Object.keys(G.CATEGORIES);
    root.innerHTML = `<div class="topline"><div><div class="greet">Free play</div><h1 class="h1">All <span class="gradtext">games</span></h1></div></div>
      ${cats.map(c => { const list = G.list.filter(g => g.category === c); if (!list.length) return ''; return `<div class="sectionhdr"><h2 class="h2">${G.CATEGORIES[c].name}</h2></div><div class="ggrid">${list.map(g => `<button class="gtile" data-play="${g.id}" style="--g:${g.g};--gc:${g.gc}">${g.noLevel ? '' : `<span class="glvl">Lv ${level(g.id)}</span>`}${g.icon}<div><div class="gname">${g.name}</div><div class="gcat">${state.best[g.id] ? 'Best ' + state.best[g.id] : g.tagline.split('.')[0]}</div></div></button>`).join('')}</div>`; }).join('')}`;
    root.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { E.sfx('tap'); playGame(b.dataset.play, { daily:false }); });
  }

  /* ---------------- WORDS ---------------- */
  function renderWords(root){ Vocab.renderWordsTab(root, state, { play: (id, opts) => playGame(id, { daily:false, ...opts }) }); }

  /* ---------------- STATS ---------------- */
  function renderStats(root){
    const cats = Object.keys(G.CATEGORIES), index = bpi();
    const keys = Object.keys(state.bpiHist).sort(); const prev = keys.length > 1 ? state.bpiHist[keys[keys.length - 2]] : null; const delta = prev == null ? null : index - prev;
    const days14 = Array.from({ length: 14 }, (_, i) => E.addDays(today(), i - 13));
    const max = Math.max(1, ...days14.map(k => (state.history[k] && state.history[k].total) || 0));
    const sessions = Object.values(state.history).filter(r => r.complete).length;
    const heatDays = Array.from({ length: 35 }, (_, i) => E.addDays(today(), i - 34));
    const firstDow = (E.keyToDate(heatDays[0]).getDay() + 6) % 7;
    const radar = (() => { const n = cats.length, cx = 100, cy = 100, R = 78; const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
      const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${cats.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" stroke="rgba(255,255,255,.1)"/>`).join('');
      const axes = cats.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.1)"/>`; }).join('');
      const vals = cats.map((c, i) => pt(i, R * Math.max(0.04, (state.cat[c] || 0) / 1000)));
      const labels = cats.map((c, i) => { const [x, y] = pt(i, R + 16); return `<text x="${x}" y="${y}" font-size="9" fill="rgba(246,247,253,.65)" text-anchor="middle" dominant-baseline="middle" font-weight="600">${G.CATEGORIES[c].name}</text>`; }).join('');
      return `<svg class="radar" viewBox="-18 -14 236 228"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff5fa2"/></linearGradient></defs>${rings}${axes}<polygon points="${vals.map(p => p.join(',')).join(' ')}" fill="url(#rg)" fill-opacity=".45" stroke="url(#rg)" stroke-width="2"/>${vals.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#fff"/>`).join('')}${labels}</svg>`; })();
    root.innerHTML = `<div class="topline"><div><div class="greet">Progress</div><h1 class="h1">Your <span class="gradtext">brain</span></h1></div></div>
      <div class="card"><div class="bpi"><div><div class="lbl">Brain Index</div><div class="num">${index}</div>${delta == null ? `<div class="delta" style="color:var(--muted)">Complete workouts to grow it</div>` : `<div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} since last session</div>`}</div><div class="radarwrap">${radar}</div></div></div>
      <div class="sectionhdr"><h2 class="h2">By category</h2></div>
      <div class="card cats">${cats.map(c => `<div class="catrow" style="--g:${G.CATEGORIES[c].g}"><div class="ic">${G.CATEGORIES[c].icon}</div><div class="nm">${G.CATEGORIES[c].name}</div><div class="bar"><i data-w="${(state.cat[c] || 0) / 10}"></i></div><div class="v">${state.cat[c] || '—'}</div></div>`).join('')}</div>
      <div class="sectionhdr"><h2 class="h2">Last 14 days</h2><span class="link">${sessions} sessions</span></div>
      <div class="card"><div class="bars">${days14.map(k => { const t = (state.history[k] && state.history[k].total) || 0; return `<div class="b ${k === today() ? 'today' : ''}"><i class="${t ? '' : 'empty'}" data-h="${Math.max(3, t / max * 100)}"></i><span>${E.keyToDate(k).getDate()}</span></div>`; }).join('')}</div></div>
      <div class="sectionhdr"><h2 class="h2">Consistency</h2><span class="link">${streak()} day streak</span></div>
      <div class="card"><div class="heatlabels">${['M','T','W','T','F','S','S'].map(d => `<span>${d}</span>`).join('')}</div><div class="heat">${'<i style="visibility:hidden"></i>'.repeat(firstDow)}${heatDays.map(k => { const r = state.history[k]; const n = r ? Object.keys(r.games).length + Object.keys(r.free).length : 0; const lvl = !n ? '' : r.complete ? 'l3' : n >= 3 ? 'l2' : 'l1'; return `<i class="${lvl} ${k === today() ? 'today' : ''}"></i>`; }).join('')}</div></div>
      <div class="sectionhdr"><h2 class="h2">Personal bests</h2></div>
      <div class="bestlist">${G.list.map(g => `<div class="bestrow" style="--g:${g.g}"><div class="ic">${g.icon}</div><div class="n">${g.name}<small>${g.noLevel ? G.CATEGORIES[g.category].name : 'Level ' + level(g.id)}</small></div><b>${state.best[g.id] || '—'}</b></div>`).join('')}</div>`;
    requestAnimationFrame(() => setTimeout(() => { root.querySelectorAll('[data-w]').forEach(i => i.style.width = i.dataset.w + '%'); root.querySelectorAll('[data-h]').forEach(i => i.style.height = i.dataset.h + '%'); }, 60));
  }

  /* ---------------- SETTINGS ---------------- */
  function openSettings(){
    const ov = E.$('#overlay'); ov.classList.remove('hidden');
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    ov.innerHTML = `<div class="sheet"><div class="grab"></div><h3>Settings</h3>
      <div class="setrow"><div class="l">Your name<small>For the greeting</small></div><input class="nameinput" id="nameIn" value="${E.esc(state.settings.name)}" placeholder="Name" maxlength="20"></div>
      <div class="setrow"><div class="l">Sound effects<small>Synthesised blips and chimes</small></div><button class="switch ${state.settings.sound ? 'on' : ''}" data-s="sound"></button></div>
      <div class="setrow"><div class="l">Haptics<small>Vibration on taps (Android)</small></div><button class="switch ${state.settings.haptics ? 'on' : ''}" data-s="haptics"></button></div>
      ${standalone ? '' : `<div class="installbox" style="margin-top:14px"><b>Install on your phone</b><br>${ios ? 'In Safari tap the Share button, then <b>Add to Home Screen</b>.' : 'Open the browser menu (⋮) and tap <b>Install app</b> or <b>Add to Home screen</b>.'} It then opens full-screen like a native app and works offline.</div>`}
      <div class="setrow" style="margin-top:8px"><div class="l">Reset all progress<small>Levels, scores, vocabulary. Cannot be undone.</small></div><button class="textbtn" id="resetBtn">Reset</button></div>
      <button class="btn ghost block" id="closeSheet" style="margin-top:12px">Done</button></div>`;
    ov.onclick = e => { if (e.target === ov) close(); };
    const close = () => { ov.classList.add('hidden'); ov.innerHTML = ''; save(); go(tab); };
    E.$('#closeSheet').onclick = close;
    E.$('#nameIn').oninput = e => { state.settings.name = e.target.value.trim(); };
    E.$$('.switch', ov).forEach(s => s.onclick = () => { state.settings[s.dataset.s] = !state.settings[s.dataset.s]; s.classList.toggle('on'); E.settings = state.settings; E.sfx('tap'); E.buzz(10); save(); });
    E.$('#resetBtn').onclick = () => { if (confirm('Reset ALL progress? This cannot be undone.')) { const name = state.settings.name; state = defaults(); state.settings.name = name; E.settings = state.settings; Vocab.init(state); save(); close(); E.toast('Progress reset'); } };
  }

  /* ---------------- GAME FLOW ---------------- */
  function startDaily(fromId){ const id = fromId || nextDailyGame(); if (!id) return; playGame(id, { daily:true }); }

  function playGame(id, opts){
    const g = game(id); const lvl = level(id); opts = { ...opts, fromLevel: lvl };
    document.body.classList.add('ingame');
    const intro = E.h(`<div class="intro" style="--g:${g.g};--gc:${g.gc};--gdim:${g.gdim}">
      <button class="iconbtn closex" aria-label="Close">${E.ICONS.close}</button>
      <div class="art"><div class="orb">${g.icon}</div></div>
      <div class="cat">${G.CATEGORIES[g.category].name}${opts.daily ? ` · Game ${planFor(today()).indexOf(id) + 1} of ${DAILY_COUNT}` : ''}</div>
      <h1>${g.name}</h1><div class="tag">${g.tagline}</div>
      <ul class="howto">${g.howto.map((h, i) => `<li><i>${i + 1}</i><span>${h}</span></li>`).join('')}</ul>
      <div class="lvlrow"><div>${g.noLevel ? `Words learned <b>${Vocab.learnedCount(state)}</b>` : `Level <b>${lvl}</b>`}</div><div class="best">Best <b>${state.best[id] || '—'}</b></div></div>
      <button class="btn big block g">${E.ICONS.play} Start</button></div>`);
    document.body.appendChild(intro);
    intro.querySelector('.closex').onclick = () => { E.sfx('tap'); intro.remove(); exitGame(); };
    intro.querySelector('.btn').onclick = () => { E.sfx('tap'); intro.remove(); runStage(id, lvl, opts); };
  }

  function exitGame(){ document.body.classList.remove('ingame'); go(tab); }

  async function runStage(id, lvl, opts){
    const g = game(id);
    const stage = E.h(`<div class="stage" style="--g:${g.g};--gc:${g.gc};--gdim:${g.gdim}">
      <div class="hud"><button class="iconbtn" data-x aria-label="Quit">${E.ICONS.close}</button><div class="title">${g.name}<small>${g.noLevel ? G.CATEGORIES[g.category].name : 'Level ' + lvl}</small></div><div class="pill timer hidden">0:45</div><div class="pill score">0</div></div>
      <div class="progress"><i></i></div><div class="prompt"></div><div class="arena"></div><div class="controls"></div></div>`);
    document.body.appendChild(stage);
    const token = E.token();
    const api = {
      level: lvl, state, opts, save, token, get dead(){ return token.dead; },
      prompt: stage.querySelector('.prompt'), arena: stage.querySelector('.arena'), controls: stage.querySelector('.controls'),
      setScore: n => { stage.querySelector('.score').textContent = n; },
      setProgress: f => { stage.querySelector('.progress i').style.width = (f * 100) + '%'; },
      setTimer: s => { const t = stage.querySelector('.timer'); if (s == null) { t.classList.add('hidden'); return; } t.classList.remove('hidden'); t.textContent = `0:${String(Math.max(0, s)).padStart(2, '0')}`; t.classList.toggle('low', s <= 5); if (s <= 5 && s > 0) E.sfx('tick'); },
      finish: (result) => { if (token.dead) return; token.kill(); stage.remove(); showResult(id, result, opts); }
    };
    stage.querySelector('[data-x]').onclick = () => { E.sfx('tap'); token.kill(); stage.remove(); exitGame(); };
    // countdown
    for (const n of [3, 2, 1]) { api.arena.innerHTML = `<div class="countdown">${n}</div>`; E.sfx('tick'); await E.wait(650, token); if (token.dead) return; }
    api.arena.innerHTML = '';
    try { await g.run(api); } catch (err) { console.error(err); if (!token.dead) { token.kill(); stage.remove(); E.toast('Something went wrong, try again'); exitGame(); } }
  }

  function showResult(id, result, opts){
    const g = game(id); const prev = opts.fromLevel || 1;
    const { isBest, justCompleted } = record(id, result, !!opts.daily);
    const stars = E.stars(result.score, g.par);
    const nextId = opts.daily ? nextDailyGame() : null;
    const lvlClass = result.level > prev ? 'up' : result.level < prev ? 'down' : '';
    const lvlText = result.level > prev ? '▲ Level up → ' + result.level : result.level < prev ? '▼ Down to level ' + result.level : 'Level ' + result.level + ' · steady';
    const r = E.h(`<div class="result" style="--g:${g.g};--gc:${g.gc};--gdim:${g.gdim}">
      <div class="label">${g.name}</div>
      ${isBest && result.score > 0 ? '<div class="newbest">New personal best</div>' : ''}
      <div class="score" data-n="${result.score}">0</div>
      <div class="verdict">${E.verdict(stars)}</div>
      <div class="sub">${result.note || (result.accuracy != null ? `${Math.round(result.accuracy * 100)}% accuracy` : '')}</div>
      <div class="stars">${[1,2,3].map(i => E.ICONS.star.replace('<svg', `<svg class="${i <= stars ? 'on' : ''}"`)).join('')}</div>
      ${g.noLevel ? '' : `<div class="levelchange ${lvlClass}">${lvlText}</div>`}
      <div class="summary">${result.stats.map(s => `<div class="row"><b>${s.value}</b><span>${s.label}</span></div>`).join('')}</div>
      <div class="actions">${opts.daily ? (nextId ? `<button class="btn ghost" data-a="home">Home</button><button class="btn g" data-a="next">Next game ${E.ICONS.chev}</button>` : `<button class="btn g block" data-a="summary">See today's results ${E.ICONS.chev}</button>`) : `<button class="btn ghost" data-a="home">Done</button><button class="btn g" data-a="again">${E.ICONS.refresh} Play again</button>`}</div></div>`);
    document.body.appendChild(r);
    // count-up + stars
    const sc = r.querySelector('.score'); const target = result.score; const t0 = performance.now();
    (function tick(t){ const p = Math.min(1, (t - t0) / 900); sc.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })(t0);
    r.querySelectorAll('.stars svg').forEach((s, i) => setTimeout(() => { s.classList.add('show'); if (s.classList.contains('on')) E.sfx('pop'); }, 500 + i * 180));
    E.sfx(stars >= 2 ? 'complete' : 'good'); E.buzz(stars >= 2 ? [20, 40, 20, 40, 60] : 20);
    r.onclick = e => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; E.sfx('tap'); r.remove();
      if (a === 'next') playGame(nextId, { daily:true });
      else if (a === 'again') playGame(id, opts);
      else if (a === 'summary') showDailySummary(justCompleted);
      else exitGame(); };
  }

  function showDailySummary(celebrate){
    const rec = dayRec(); const plan = planFor(today());
    const r = E.h(`<div class="result" style="--g:var(--accent);--gdim:#2a1f55">
      <div class="finalwrap"><div class="label">Daily workout complete</div><div class="score" data-n="${rec.total}">${rec.total}</div><div class="verdict">${streak()} day streak ${E.ICONS.flame.replace('<svg', '<svg width="20" height="20" style="display:inline;vertical-align:-3px;color:#ffb347"')}</div><div class="sub">Brain Index ${bpi()} · ${Vocab.learnedCount(state)} words in your vocabulary</div>
      <div class="finallist">${plan.map(id => { const g = game(id), e = rec.games[id]; return `<div class="fr" style="--g:${g.g}"><div class="ic">${g.icon}</div><div class="n">${g.name}</div><div style="color:var(--gold);display:flex">${'★'.repeat(e.stars)}<span style="color:rgba(255,255,255,.2)">${'★'.repeat(3 - e.stars)}</span></div><b>${e.score}</b></div>`; }).join('')}</div>
      <button class="btn big block" data-a="home">Done for today ${E.ICONS.check}</button></div></div>`);
    document.body.appendChild(r);
    if (celebrate) { E.confetti(2600); E.sfx('complete'); E.buzz([30, 50, 30, 50, 100]); }
    r.querySelector('[data-a]').onclick = () => { E.sfx('tap'); r.remove(); exitGame(); };
  }

  /* ---------------- boot ---------------- */
  go('home');
  // keep the day fresh if the app stays open past midnight
  let lastDay = today(); setInterval(() => { if (today() !== lastDay) { lastDay = today(); if (!document.body.classList.contains('ingame')) go(tab); } }, 30000);
  // iOS: block double-tap zoom in game areas
  let lastTouch = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouch < 300) e.preventDefault(); lastTouch = now; }, { passive:false });
})();
