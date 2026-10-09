/* ============ Brain Champ — shared engine: DOM, random, shapes, icons, sound, haptics, timers ============ */
(function(){
  const E = window.Engine = {};
  E.settings = { sound:true, haptics:true };

  /* ---- DOM ---- */
  E.$ = (s, root=document) => root.querySelector(s);
  E.$$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  E.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  E.el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  E.esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---- random ---- */
  E.mulberry = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  E.shuffle = (arr, rand=Math.random) => { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j = Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  E.pick = (arr, rand=Math.random) => arr[Math.floor(rand()*arr.length)];
  E.randInt = (a, b, rand=Math.random) => a + Math.floor(rand()*(b-a+1));
  E.sample = (arr, n, rand=Math.random) => E.shuffle(arr, rand).slice(0, n);

  /* ---- dates ---- */
  E.todayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  E.keyToDate = (k) => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
  E.dayIndex = (k=E.todayKey()) => Math.floor(E.keyToDate(k).getTime() / 86400000 + 0.5);
  E.addDays = (k, n) => { const d = E.keyToDate(k); d.setDate(d.getDate()+n); return E.todayKey(d); };
  E.fmtDate = (k) => E.keyToDate(k).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });

  /* ---- palette ---- */
  E.COLORS = ['#ff5c7a','#ffb347','#2ee6a6','#38b6ff','#b57bff','#ffe95a','#ff8a3d','#4fffd0'];
  E.hexToHsl = (hex) => { let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2; if(mx!==mn){const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); switch(mx){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;} h*=60;} return [h,s*100,l*100]; };

  /* ---- shapes (viewBox 0 0 100 100) ---- */
  const starPts = (cx,cy,R,r,n) => { let p=[]; for(let i=0;i<n*2;i++){ const a=Math.PI/n*i - Math.PI/2; const rad=i%2?r:R; p.push((cx+Math.cos(a)*rad).toFixed(1)+','+(cy+Math.sin(a)*rad).toFixed(1)); } return p.join(' '); };
  const polyPts = (cx,cy,R,n,rot=-90) => { let p=[]; for(let i=0;i<n;i++){ const a=(rot+360/n*i)*Math.PI/180; p.push((cx+Math.cos(a)*R).toFixed(1)+','+(cy+Math.sin(a)*R).toFixed(1)); } return p.join(' '); };
  E.SHAPES = {
    circle:   (c) => `<circle cx="50" cy="50" r="40" fill="${c}"/>`,
    square:   (c) => `<rect x="12" y="12" width="76" height="76" rx="14" fill="${c}"/>`,
    triangle: (c) => `<path d="M50 10 L92 84 Q94 90 86 90 L14 90 Q6 90 8 84 Z" fill="${c}"/>`,
    diamond:  (c) => `<path d="M50 6 L94 50 L50 94 L6 50 Z" fill="${c}" stroke="${c}" stroke-width="10" stroke-linejoin="round"/>`,
    star:     (c) => `<polygon points="${starPts(50,52,46,20,5)}" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`,
    hexagon:  (c) => `<polygon points="${polyPts(50,50,44,6,0)}" fill="${c}" stroke="${c}" stroke-width="8" stroke-linejoin="round"/>`,
    heart:    (c) => `<path d="M50 88 C20 66 6 50 6 32 A20 20 0 0 1 50 22 A20 20 0 0 1 94 32 C94 50 80 66 50 88 Z" fill="${c}"/>`,
    cross:    (c) => `<path d="M34 8 h32 v26 h26 v32 h-26 v26 h-32 v-26 h-26 v-32 h26 z" fill="${c}" stroke="${c}" stroke-width="8" stroke-linejoin="round"/>`,
    pentagon: (c) => `<polygon points="${polyPts(50,53,46,5)}" fill="${c}" stroke="${c}" stroke-width="8" stroke-linejoin="round"/>`,
    moon:     (c) => `<path d="M62 8 A42 42 0 1 0 92 66 A32 32 0 0 1 62 8 Z" fill="${c}"/>`,
    drop:     (c) => `<path d="M50 6 C50 6 14 46 14 64 A36 36 0 0 0 86 64 C86 46 50 6 50 6 Z" fill="${c}"/>`,
    bolt:     (c) => `<path d="M58 4 L18 56 L46 56 L38 96 L82 40 L54 40 Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`
  };
  E.SHAPE_NAMES = Object.keys(E.SHAPES);
  E.shapeSVG = (name, color, opts={}) => {
    const rot = opts.rotate || 0, scale = opts.scale || 1, cls = opts.cls ? ` class="${opts.cls}"` : '';
    const inner = (E.SHAPES[name] || E.SHAPES.circle)(color);
    const tf = (rot || scale !== 1) ? ` transform="rotate(${rot} 50 50) translate(50 50) scale(${scale}) translate(-50 -50)"` : '';
    return `<svg${cls} viewBox="0 0 100 100" aria-hidden="true"><g${tf}>${inner}</g></svg>`;
  };

  /* ---- UI icons ---- */
  const I = E.ICONS = {};
  const sw = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  I.home   = `<svg viewBox="0 0 24 24" ${sw}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/></svg>`;
  I.train  = `<svg viewBox="0 0 24 24" ${sw}><path d="M4 9v6M20 9v6M7 7v10M17 7v10M7 12h10"/></svg>`;
  I.words  = `<svg viewBox="0 0 24 24" ${sw}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>`;
  I.stats  = `<svg viewBox="0 0 24 24" ${sw}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`;
  I.gear   = `<svg viewBox="0 0 24 24" ${sw}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;
  I.close  = `<svg viewBox="0 0 24 24" ${sw}><path d="M6 6l12 12M18 6 6 18"/></svg>`;
  I.check  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>`;
  I.star   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.2 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  I.flame  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 4-2 5.5-3.5 7.5C7 11.5 6 13.3 6 15.5A6 6 0 0 0 18 15.5c0-3-1.5-5-3-6.5 0 2-1 3-2 3.5.5-3-1-6-1-10.5z"/></svg>`;
  I.play   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>`;
  I.back   = `<svg viewBox="0 0 24 24" ${sw}><path d="M15 5l-7 7 7 7"/></svg>`;
  I.chev   = `<svg viewBox="0 0 24 24" ${sw}><path d="M9 5l7 7-7 7"/></svg>`;
  I.bolt   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`;
  I.trophy = `<svg viewBox="0 0 24 24" ${sw}><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3"/></svg>`;
  I.refresh= `<svg viewBox="0 0 24 24" ${sw}><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>`;
  I.info   = `<svg viewBox="0 0 24 24" ${sw}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`;
  I.brain  = `<svg viewBox="0 0 24 24" ${sw}><path d="M9.5 3A3 3 0 0 0 6.6 5.2 3 3 0 0 0 4.3 9.4 3.2 3.2 0 0 0 4.6 15 3 3 0 0 0 8.2 20 3 3 0 0 0 12 18V5.5A2.5 2.5 0 0 0 9.5 3z"/><path d="M14.5 3a3 3 0 0 1 2.9 2.2 3 3 0 0 1 2.3 4.2 3.2 3.2 0 0 1-.3 5.6 3 3 0 0 1-3.6 5A3 3 0 0 1 12 18V5.5A2.5 2.5 0 0 1 14.5 3z"/></svg>`;
  I.sparkle= `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9.5l-5.7 1.9L12 17l-1.8-5.6L4.5 9.5l5.7-1.9z"/><path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>`;
  I.eye    = `<svg viewBox="0 0 24 24" ${sw}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  I.volume = `<svg viewBox="0 0 24 24" ${sw}><path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>`;
  I.vibrate= `<svg viewBox="0 0 24 24" ${sw}><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 8v8M20 8v8M1.5 10v4M22.5 10v4"/></svg>`;
  I.download=`<svg viewBox="0 0 24 24" ${sw}><path d="M12 4v11M7 10l5 5 5-5M4 19h16"/></svg>`;
  I.share  = `<svg viewBox="0 0 24 24" ${sw}><path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/></svg>`;

  /* ---- sound (WebAudio synth) ---- */
  let ctx = null;
  const ensure = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  document.addEventListener('pointerdown', () => { if (E.settings.sound) ensure(); }, { passive:true });
  const tone = (f, t, dur, type='sine', vol=.18, slide=0) => {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, c.currentTime + t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), c.currentTime + t + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + dur);
    o.connect(g).connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + dur + .05);
  };
  const SFX = {
    tap:     () => tone(520, 0, .07, 'triangle', .12),
    pop:     () => { tone(660, 0, .09, 'sine', .14, 240); },
    show:    () => { tone(880, 0, .12, 'sine', .1, 120); },
    good:    () => { tone(660, 0, .1, 'triangle', .14); tone(990, .09, .14, 'triangle', .14); },
    bad:     () => { tone(220, 0, .18, 'sawtooth', .09, -80); },
    tick:    () => tone(1200, 0, .04, 'square', .05),
    levelup: () => { [523,659,784,1046].forEach((f,i)=>tone(f, i*.09, .16, 'triangle', .14)); },
    leveldown:() => { tone(400, 0, .15, 'triangle', .1); tone(300, .14, .2, 'triangle', .1); },
    complete:() => { [523,659,784,1046,1318].forEach((f,i)=>tone(f, i*.11, .3, 'sine', .14)); tone(1568, .55, .6, 'sine', .1); },
    flip:    () => tone(700, 0, .08, 'sine', .08, 200),
    whoosh:  () => tone(300, 0, .2, 'sine', .06, 500),
    pad:     (i) => tone([262,294,330,349,392,440,494,523,587][i % 9], 0, .32, 'sine', .16)
  };
  E.sfx = (name, arg) => { if (!E.settings.sound) return; try { SFX[name] && SFX[name](arg); } catch(e){} };

  /* ---- haptics ---- */
  E.buzz = (p=12) => { if (!E.settings.haptics) return; try { navigator.vibrate && navigator.vibrate(p); } catch(e){} };

  /* ---- time helpers ---- */
  E.wait = (ms, token) => new Promise(res => { const id = setTimeout(res, ms); if (token) token.timers.push(id); });
  E.token = () => ({ dead:false, timers:[], kill(){ this.dead = true; this.timers.forEach(clearTimeout); this.intervals && this.intervals.forEach(clearInterval); } , intervals:[] });
  E.countdown = (seconds, onTick, onEnd, token) => {
    let left = seconds; onTick(left);
    const id = setInterval(() => { if (token && token.dead) { clearInterval(id); return; } left--; onTick(left); if (left <= 0) { clearInterval(id); onEnd(); } }, 1000);
    if (token) token.intervals.push(id);
    return { stop(){ clearInterval(id); }, get left(){ return left; } };
  };

  /* ---- toast ---- */
  let toastT;
  E.toast = (msg, ms=1800) => { const t = E.$('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };

  /* ---- floating feedback inside an arena ---- */
  E.feedback = (parent, text, good=true) => { const f = E.el('div', 'feedback ' + (good ? 'good' : 'bad'), text); parent.appendChild(f); setTimeout(() => f.remove(), 750); };
  E.levelToast = (parent, title, sub) => { const d = E.el('div', 'toastlvl', `${title}<small>${sub||''}</small>`); parent.appendChild(d); setTimeout(() => d.remove(), 1050); };

  /* ---- confetti ---- */
  E.confetti = (duration=2200) => {
    const cv = E.$('#confetti'); const c = cv.getContext('2d');
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; c.scale(devicePixelRatio, devicePixelRatio);
    const cols = ['#7c5cff','#ff5fa2','#ffb347','#2ee6a6','#38b6ff','#ffe95a','#fff'];
    const P = Array.from({length:140}, () => ({ x: innerWidth/2 + (Math.random()-.5)*120, y: innerHeight*0.45, vx:(Math.random()-.5)*14, vy:-(Math.random()*14+6), r: Math.random()*6+4, c: E.pick(cols), a: Math.random()*Math.PI, va:(Math.random()-.5)*.3, sq: Math.random()>.5 }));
    const t0 = performance.now();
    (function frame(t){ const dt = t - t0; c.clearRect(0,0,innerWidth,innerHeight);
      P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.a += p.va; c.save(); c.translate(p.x,p.y); c.rotate(p.a); c.fillStyle = p.c; c.globalAlpha = Math.max(0, 1 - dt/duration); if (p.sq) c.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6); else { c.beginPath(); c.arc(0,0,p.r/2,0,7); c.fill(); } c.restore(); });
      if (dt < duration) requestAnimationFrame(frame); else c.clearRect(0,0,innerWidth,innerHeight);
    })(t0);
  };

  /* ---- score → stars (0..3) relative to a par ---- */
  E.stars = (score, par) => score >= par*1.25 ? 3 : score >= par*0.8 ? 2 : score >= par*0.4 ? 1 : 0;
  E.verdict = (stars) => ['Keep training','Solid effort','Great work!','Outstanding!'][stars];
})();
