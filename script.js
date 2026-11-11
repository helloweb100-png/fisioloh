/* =====================================================================
   FISIOLOH · "La Columna Viva" — script.js
   - El número de WhatsApp vive SOLO en esta constante (formato 52 + 10 dígitos).
   - Todo es mejora progresiva: sin JS (o si este archivo falla) la página se ve completa.
   ===================================================================== */
const WHATSAPP_NUMERO = "5215561605834";

(() => {
  'use strict';
  window.__fisioOK = true;

  /* ---------- Utilidades ---------- */
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mq = q => window.matchMedia(q);
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const fino = mq('(pointer: fine)');
  const TIENE_WA = /^\d{10,15}$/.test(WHATSAPP_NUMERO);
  const wa = texto => `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
  const seguro = fn => { try { fn(); } catch (e) { /* una mejora que falla no debe romper el resto */ } };
  const sv = (el, k, v) => { if (!el) return; const key = '_' + k; if (el[key] === v) return; el[key] = v; el.style.setProperty(k, v); };

  /* ---------- Estado global ---------- */
  let sy = 0, vw = innerWidth, vh = innerHeight;
  let lenis = null;
  let heroP = 0, alinP = 0, camP = 0;
  const M = { pin: false, servTrack: 0, docH: 1, secs: [] };
  const ptr = { nx: 0, ny: 0, ax: 0, ay: 0, x: -9999, y: -9999 };
  const lienzos = [];

  const heroEl = $('#inicio'), alinEl = $('#por-que'), camEl = $('#camara'), servEl = $('#servicios'), pisEl = $('#pisada');
  const hdr = $('#hdr'), progMovil = $('#progMovil'), colProg = $('#colProg'), heroVis = $('#heroVis');
  const secs = $$('main > section[data-nombre]');

  /* =====================================================================
     WhatsApp (todos los CTA y el formulario usan wa())
     ===================================================================== */
  function iniciarWA() {
    $$('[data-wa]').forEach(el => {
      if (TIENE_WA) {
        el.href = wa(el.dataset.wa);
        el.target = '_blank';
        el.rel = 'noopener';
      } else if (el.id === 'fab') {
        el.hidden = true;
      }
    });
    if (!TIENE_WA) {
      const b = $('#btnEnviar'); if (b) b.hidden = true;
      const m = $('#microForm'); if (m) m.textContent = 'Por ahora, llámanos al 55 6160 5834 para agendar tu valoración.';
    }
    const globo = $('#fabGlobo'), cerrar = $('#fabCerrar');
    if (TIENE_WA && globo) {
      setTimeout(() => { globo.hidden = false; setTimeout(() => { globo.hidden = true; }, 7000); }, 6000);
      cerrar && cerrar.addEventListener('click', () => { globo.hidden = true; });
    }
    const anio = $('#anio'); if (anio) anio.textContent = new Date().getFullYear();
  }

  /* =====================================================================
     Estado "abierto ahora" (hora de Ciudad de México)
     ===================================================================== */
  const HORARIO = { 0: null, 1: [9, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20], 6: [9, 18] };
  const fmtHora = h => `${h % 12 || 12}:00 ${h >= 12 ? 'p. m.' : 'a. m.'}`;
  function ahoraMX() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[g('weekday')], dec: (+g('hour') % 24) + (+g('minute')) / 60 };
  }
  function estadoAhora() {
    const { dia, dec } = ahoraMX();
    const hoy = HORARIO[dia];
    if (hoy && dec >= hoy[0] && dec < hoy[1]) return { abierto: true, dia, dec, hoy, txt: `Abierto ahora · cierra a las ${fmtHora(hoy[1])}` };
    if (hoy && dec < hoy[0]) return { abierto: false, dia, dec, hoy, txt: `Cerrado · abrimos hoy a las ${fmtHora(hoy[0])}` };
    let n = (dia + 1) % 7, add = 1;
    while (!HORARIO[n]) { n = (n + 1) % 7; add++; }
    const cuando = add === 1 ? 'mañana' : (n === 1 ? 'el lunes' : 'el próximo día hábil');
    return { abierto: false, dia, dec, hoy, txt: `Cerrado · abrimos ${cuando} a las ${fmtHora(HORARIO[n][0])}` };
  }
  function iniciarEstado() {
    const pintar = () => {
      const e = estadoAhora();
      $$('[data-estado]').forEach(el => {
        el.classList.toggle('abierto', e.abierto);
        const t = $('.est-txt', el); if (t) t.textContent = e.txt;
      });
      $$('.horarios [data-dias]').forEach(r => r.classList.toggle('hoy', r.dataset.dias.split(',').includes(String(e.dia))));
      const tramo = $('#bdTramo'), ahora = $('#bdAhora');
      if (tramo && ahora) {
        const h = e.hoy;
        tramo.style.setProperty('--w', (h ? ((h[1] - 9) / 11) * 100 : 0) + '%');
        if (e.abierto) { ahora.hidden = false; ahora.style.setProperty('--x', clamp((e.dec - 9) / 11) * 100 + '%'); } else { ahora.hidden = true; }
      }
    };
    pintar();
    setInterval(pintar, 60000);
  }

  /* =====================================================================
     Cargador (≤ 2.3 s; el CSS lo oculta igual a los 3 s si esto falla)
     ===================================================================== */
  function iniciarLoader() {
    const loader = $('#loader');
    const entrar = () => doc.classList.add('hero-go');
    if (!loader) { entrar(); return; }
    const num = $('#ldNum'), puntos = $('#ldPuntos');
    const dur = reduce.matches ? 500 : 1400;
    let t0 = null, terminado = false;
    const fin = () => {
      if (terminado) return; terminado = true;
      if (num) num.textContent = '100';
      loader.classList.add('sale');
      setTimeout(entrar, 380);
      setTimeout(() => loader.classList.add('fuera'), 850);
    };
    const paso = t => {
      if (terminado) return;
      if (t0 === null) t0 = t;
      const p = clamp((t - t0) / dur);
      const e = easeIO(p);
      if (num) num.textContent = String(Math.round(e * 100)).padStart(2, '0');
      if (puntos) puntos.style.setProperty('--spin', (720 * (1 - e)).toFixed(1) + 'deg');
      if (p < 1) requestAnimationFrame(paso); else fin();
    };
    requestAnimationFrame(paso);
    setTimeout(fin, 1900);          // respaldo si rAF se pausa
    setTimeout(entrar, 2700);       // respaldo de la entrada del hero
  }

  /* =====================================================================
     Header + menú móvil
     ===================================================================== */
  function iniciarMenu() {
    const burger = $('#burger'), menu = $('#menu');
    if (!burger || !menu) return;
    menu.setAttribute('data-lenis-prevent', '');
    const set = abrir => {
      doc.classList.toggle('menu-open', abrir);
      doc.classList.toggle('lb-open', abrir);
      burger.setAttribute('aria-expanded', String(abrir));
      burger.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!abrir));
      if (abrir) { hdr.classList.remove('oculto'); setTimeout(() => { const a = $('.menu-nav a', menu); a && a.focus(); }, 400); lenis && lenis.stop(); }
      else { lenis && lenis.start(); }
    };
    burger.addEventListener('click', () => set(!doc.classList.contains('menu-open')));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && doc.classList.contains('menu-open')) { set(false); burger.focus(); } });
    addEventListener('resize', () => { if (innerWidth >= 1024 && doc.classList.contains('menu-open')) set(false); });
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    iniciarMenu.cerrar = () => set(false);
  }

  /* Anclas con scroll suave (Lenis si existe) */
  function iniciarAnclas() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const t = document.getElementById(id.slice(1));
      if (!t) return;
      e.preventDefault();
      if (doc.classList.contains('menu-open') && iniciarMenu.cerrar) iniciarMenu.cerrar();
      if (lenis) lenis.scrollTo(t, { offset: -70, duration: 1.8 });
      else t.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* =====================================================================
     Motor de revelado (IntersectionObserver + respaldo por geometría)
     ===================================================================== */
  let geoRevelar = () => {};
  function iniciarReveal() {
    const els = $$('.rv, .rvm, .pie-columna');
    const pendientes = new Set(els);
    let io = null;
    const revelar = el => {
      if (!pendientes.has(el)) return;
      pendientes.delete(el);
      el.classList.add('in');
      if (io) io.unobserve(el);
      if (el.classList.contains('contadores')) contar();
    };
    if (reduce.matches) { els.forEach(revelar); return; }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) revelar(e.target); }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
      els.forEach(el => io.observe(el));
    }
    geoRevelar = () => {
      if (!pendientes.size) return;
      pendientes.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh * .92 && r.right > 0 && r.left < vw) revelar(el);
      });
    };
    let pend = false;
    const pedir = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; geoRevelar(); }); };
    addEventListener('scroll', pedir, { passive: true });
    addEventListener('resize', pedir);
    setTimeout(geoRevelar, 2000);
    setTimeout(geoRevelar, 3500);
    addEventListener('load', () => setTimeout(geoRevelar, 400));
  }

  /* Contadores (anime.js si cargó; si no, rAF propio) */
  function contar() {
    $$('[data-count]').forEach(el => {
      const fin = +el.dataset.count;
      if (reduce.matches) { el.textContent = fin; return; }
      const o = { v: 0 };
      if (window.anime) {
        window.anime({ targets: o, v: fin, round: 1, duration: 1900, easing: 'easeOutExpo', update: () => { el.textContent = o.v; }, complete: () => { el.textContent = fin; } });
      } else {
        const t0 = performance.now();
        const paso = t => { const p = clamp((t - t0) / 1900); el.textContent = Math.round(fin * easeOut(p)); if (p < 1) requestAnimationFrame(paso); else el.textContent = fin; };
        requestAnimationFrame(paso);
      }
    });
  }
  function prepararContadores() { if (!reduce.matches) $$('[data-count]').forEach(el => { el.textContent = '0'; }); }

  /* =====================================================================
     Lienzos (canvas): hero "Columna Viva" + burbujas
     ===================================================================== */
  function lienzo(cv, dibujar, iniciar) {
    if (!cv || !cv.getContext) return null;
    const o = { cv, ctx: cv.getContext('2d'), vis: true, W: 0, H: 0, dpr: 1, dibujar, last: 0 };
    o.ajustar = () => {
      o.dpr = Math.min(devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (o.p && w === o.W && h === o.H && o.dpr === (o.dprPrev || o.dpr)) return;   // sin cambios: no reiniciar partículas
      o.W = w; o.H = h; o.dprPrev = o.dpr;
      cv.width = Math.round(o.W * o.dpr); cv.height = Math.round(o.H * o.dpr);
      o.ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
      iniciar && iniciar(o);
      if (reduce.matches) dibujar(o, 2.5);
    };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { o.vis = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(cv);
    o.ajustar();
    lienzos.push(o);
    return o;
  }

  function iniciarHeroCanvas() {
    const cv = $('#cvHero');
    const N = 26;
    const iniciar = o => {
      const n = o.W < 700 ? 55 : 90;
      o.p = Array.from({ length: n }, () => ({ x: Math.random() * o.W, y: Math.random() * o.H, r: 1 + Math.random() * 2.6, v: 6 + Math.random() * 16, ph: Math.random() * 6.28, c: Math.random() < .5 ? '31,92,94' : '226,196,142', a: .25 + Math.random() * .5 }));
    };
    const dibujar = (o, t) => {
      const { ctx, W, H } = o;
      ctx.clearRect(0, 0, W, H);
      const dt = Math.min(.05, t - (o.last || t)); o.last = t;
      const r = o.cv.getBoundingClientRect();
      const mx = ptr.x - r.left, my = ptr.y - r.top;

      /* partículas (motas de oxígeno) */
      for (const p of o.p) {
        p.y -= p.v * dt; p.x += Math.sin(t * .5 + p.ph) * .18;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 12100) { const d = Math.sqrt(d2) || 1, f = (110 - d) / 110; p.x += dx / d * f * 2.2; p.y += dy / d * f * 2.2; }
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.fillStyle = `rgba(${p.c},${p.a * .16})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }

      /* curva en S que respira y se endereza con el scroll */
      const curv = 1 - easeOut(heroP);
      const movil = W < 700;
      const top = H * .06, bot = H * .94;
      const amp = Math.min(W * (movil ? .2 : .17), H * .2) * curv;
      const fase = Math.sin(t * .4) * .5, resp = 1 + .06 * Math.sin(t * .8);
      const pts = [];
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        pts.push({ s, x: W * .5 + amp * resp * Math.sin(s * 6.2832 + fase) + ptr.ax * 6 * (.3 + .7 * s), y: top + (bot - top) * s });
      }
      const sp = (bot - top) / (N - 1);

      /* el "nervio": línea teal con trazo que fluye hacia arriba */
      ctx.save();
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < N - 1; i++) { const mxp = (pts[i].x + pts[i + 1].x) / 2, myp = (pts[i].y + pts[i + 1].y) / 2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, mxp, myp); }
      ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
      ctx.strokeStyle = 'rgba(31,92,94,.6)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 10]); ctx.lineDashOffset = t * 28; ctx.stroke();
      ctx.restore();

      /* pulso de luz que sube desde la base */
      const ph = (t % 5) / 5, ps = 1.05 - ph * 1.3;

      for (let i = N - 1; i >= 0; i--) {
        const p = pts[i], s = p.s;
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const glow = Math.exp(-Math.pow((s - ps) / .09, 2));
        const bw = sp * .95 * (.7 + .95 * s), bh = sp * .36 * (.8 + .5 * s), rl = bw * (.9 + 1.7 * Math.sin(s * Math.PI));
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(ang - Math.PI / 2);
        const sc = 1 + .25 * glow; ctx.scale(sc, sc);
        ctx.globalAlpha = clamp(.8 + .2 * glow);
        if (glow > .05) { ctx.shadowColor = 'rgba(226,196,142,.95)'; ctx.shadowBlur = 20 * glow; }
        const g = ctx.createLinearGradient(-bw, 0, bw, 0);
        g.addColorStop(0, '#B8976B'); g.addColorStop(1, '#E2C48E');
        /* costillas */
        ctx.strokeStyle = glow > .2 ? '#E2C48E' : '#B8976B'; ctx.lineWidth = Math.max(1.2, bh * .3); ctx.lineCap = 'round';
        for (const d of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(d * bw * .85, 0);
          ctx.quadraticCurveTo(d * (bw + rl * .6), -bh * 1.5, d * (bw + rl), bh * .7);
          ctx.stroke();
        }
        /* cuerpo vertebral */
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, 0, 6.2832); ctx.fill();
        /* espina corta */
        ctx.shadowBlur = 0; ctx.strokeStyle = '#B8976B'; ctx.lineWidth = Math.max(1.4, bh * .35);
        ctx.beginPath(); ctx.moveTo(0, bh * .7); ctx.lineTo(0, bh * .7 + bh * 1.1); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (!o.ok) { o.ok = true; heroVis && heroVis.classList.add('cv-ok'); }
    };
    lienzo(cv, dibujar, iniciar);
  }

  function crearBurbujas(cv, n, vel) {
    const iniciar = o => {
      o.vel = vel;
      o.p = Array.from({ length: n }, () => ({ x: Math.random() * o.W, y: Math.random() * o.H, r: 2 + Math.random() * 7, v: 10 + Math.random() * 26, f: .3 + Math.random() * .8, ph: Math.random() * 6.28, a: .15 + Math.random() * .45, c: Math.random() < .55 ? '226,196,142' : '255,255,255' }));
    };
    const dibujar = (o, t) => {
      const { ctx, W, H } = o;
      ctx.clearRect(0, 0, W, H);
      const dt = Math.min(.05, t - (o.last || t)); o.last = t;
      for (const b of o.p) {
        b.y -= b.v * dt * o.vel; b.x += Math.sin(t * b.f + b.ph) * .28;
        if (b.y < -b.r * 2) { b.y = H + b.r * 2; b.x = Math.random() * W; }
        ctx.globalAlpha = b.a; ctx.strokeStyle = `rgb(${b.c})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = b.a * .18; ctx.fillStyle = `rgb(${b.c})`; ctx.fill();
        ctx.globalAlpha = b.a * .9; ctx.beginPath(); ctx.arc(b.x - b.r * .3, b.y - b.r * .3, Math.max(.6, b.r * .18), 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    lienzo(cv, dibujar, iniciar);
  }

  /* =====================================================================
     Cinta (marquesina doble) — clona el grupo hasta cubrir la pantalla
     ===================================================================== */
  function iniciarCinta() {
    const cinta = $('#especialidades');
    if (!cinta || reduce.matches) return;
    const montar = () => {
      $$('.cinta-pista', cinta).forEach(p => {
        const g = p.firstElementChild; if (!g || p.children.length > 1) return;
        const gw = g.getBoundingClientRect().width || 600;
        const n = 2 * Math.max(1, Math.ceil(vw / gw));
        for (let i = 1; i < n; i++) { const c = g.cloneNode(true); c.setAttribute('aria-hidden', 'true'); p.appendChild(c); }
      });
      cinta.classList.add('listo');
    };
    const listo = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    listo.then(montar);
  }

  /* =====================================================================
     S3 · Alineación: columna de 18 vértebras que se endereza
     ===================================================================== */
  const alin = { verts: [], nervio: null, step: -1, N: 18, zonas: [], pasos: [], num: null };
  function iniciarAlin() {
    const g = $('#alinVerts'), vis = $('#alinVis');
    alin.nervio = $('#alinNervio');
    if (!g) return;
    let html = '';
    for (let i = 0; i < alin.N; i++) {
      const s = i / (alin.N - 1), bw = 22 + 20 * s, bh = 10 + 6 * s, rl = 10 + 14 * Math.sin(s * Math.PI);
      html += `<g class="v"><path class="costilla" d="M${-bw / 2} 0 q${-rl * .6} ${-bh * 1.1} ${-rl} ${bh * .5}"/><path class="costilla" d="M${bw / 2} 0 q${rl * .6} ${-bh * 1.1} ${rl} ${bh * .5}"/><rect class="cuerpo" x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="${bh / 2}"/><circle class="espina" cx="0" cy="${bh / 2 + 4}" r="2.6"/></g>`;
    }
    g.innerHTML = html;
    alin.verts = $$('.v', g).map((v, i) => ({ v, s: i / (alin.N - 1), z: i < 6 ? 0 : i < 12 ? 1 : 2 }));
    vis && vis.classList.add('ok');
    alin.zonas = $$('.zona');
    alin.pasos = $$('#alinPasos .paso');
    alin.num = $('#alinNum');
    pintarAlin(1, 0);
  }
  function pintarAlin(amp, t) {
    const N = alin.N, pts = alin.verts.map(o => ({ x: 130 + amp * 52 * Math.sin(o.s * 6.2832) * (1 + .04 * Math.sin(t * .9)), y: 40 + o.s * 560 }));
    alin.verts.forEach((o, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI - 90;
      o.v.setAttribute('transform', `translate(${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    });
    if (alin.nervio) alin.nervio.setAttribute('d', 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L'));
  }
  function alinPaso(p) {
    const step = Math.min(2, Math.floor(p * 3));
    if (step === alin.step) return;
    alin.step = step;
    alin.verts.forEach(o => o.v.classList.toggle('on', o.z === step));
    alin.zonas.forEach(z => z.classList.toggle('on', +z.dataset.z === step));
    alin.pasos.forEach((el, i) => el.classList.toggle('act', i === step));
    if (alin.num) alin.num.textContent = '0' + (step + 1);
  }

  /* =====================================================================
     S4 · Cámara: manómetro
     ===================================================================== */
  function iniciarCamara() {
    const tg = $('#manoTicks');
    if (tg) {
      let s = '';
      for (let i = 0; i < 60; i++) {
        const a = -135 + i * 270 / 59, may = i % 5 === 0;
        s += `<line x1="85" y1="13" x2="85" y2="${may ? 26 : 21}" stroke="#E2C48E" stroke-width="${may ? 2 : 1}" opacity=".8" transform="rotate(${a.toFixed(2)} 85 85)"/>`;
      }
      tg.innerHTML = s;
    }
    crearBurbujas($('#cvCamara'), 60, 1);
    crearBurbujas($('#cvContacto'), 30, .5);
  }

  /* =====================================================================
     S7 · Método: línea vertebral que se dibuja
     ===================================================================== */
  const metodo = { path: null, pts: [], cum: [0], total: 1, nodeY: [], H: 0, last: -1, nodos: [] };
  function construirMetodo() {
    const cont = $('#metPasos'), caja = $('#metLinea');
    if (!cont || !caja) return;
    metodo.nodos = $$('.nodo', cont);
    const H = cont.offsetHeight, W = caja.clientWidth;
    if (!H || !W) return;
    metodo.H = H;
    const cr = cont.getBoundingClientRect();
    metodo.nodeY = metodo.nodos.map(n => { const r = n.getBoundingClientRect(); return r.top + r.height / 2 - cr.top; });
    const A = W * .18;
    const X = y => W / 2 + A * (1 - clamp(y / (H * .75))) * Math.sin(y / 70);
    metodo.pts = []; metodo.cum = [0];
    for (let y = 0; y <= H; y += 4) metodo.pts.push([X(y), y]);
    for (let i = 1; i < metodo.pts.length; i++) metodo.cum[i] = metodo.cum[i - 1] + Math.hypot(metodo.pts[i][0] - metodo.pts[i - 1][0], metodo.pts[i][1] - metodo.pts[i - 1][1]);
    metodo.total = metodo.cum[metodo.cum.length - 1] || 1;
    const d = 'M' + metodo.pts.map(p => `${p[0].toFixed(1)} ${p[1]}`).join(' L');
    caja.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/><path id="metPath" d="${d}" fill="none" stroke="#E2C48E" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgba(226,196,142,.7))"/></svg>`;
    metodo.path = $('#metPath', caja);
    metodo.path.style.strokeDasharray = metodo.total;
    metodo.path.style.strokeDashoffset = metodo.total;
    metodo.nodos.forEach((n, i) => n.style.setProperty('--dx', (X(metodo.nodeY[i]) - W / 2).toFixed(1) + 'px'));
    metodo.last = -1;
  }
  function dibujarMetodo(yTip) {
    if (!metodo.path) return;
    const k = Math.round(yTip);
    if (k === metodo.last) return; metodo.last = k;
    const idx = clamp(Math.round(yTip / 4), 0, metodo.pts.length - 1);
    metodo.path.style.strokeDashoffset = (metodo.total - metodo.cum[idx]).toFixed(1);
    metodo.nodos.forEach((n, i) => { if (yTip >= metodo.nodeY[i] - 4) n.classList.add('on'); });
  }

  /* =====================================================================
     Interacciones de puntero: tilt 3D, imanes, cursor
     ===================================================================== */
  function iniciarPuntero() {
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      ptr.x = e.clientX; ptr.y = e.clientY;
      ptr.nx = (e.clientX / vw) * 2 - 1; ptr.ny = (e.clientY / vh) * 2 - 1;
    }, { passive: true });
    if (!fino.matches || reduce.matches) return;
    $$('[data-tilt]').forEach(el => {
      const max = +el.dataset.tilt || 6;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - .5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((.5 - y) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty('--mx', clamp(dx * 16, -8, 8).toFixed(1) + 'px');
        b.style.setProperty('--my', clamp(dy * 16, -8, 8).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  const cursor = { on: false, x: 0, y: 0, rx: 0, ry: 0, el: null, dot: null, ring: null, txt: null };
  function iniciarCursor() {
    if (!fino.matches || reduce.matches || innerWidth < 1100) return;
    cursor.el = $('#cursor'); if (!cursor.el) return;
    cursor.dot = $('.c-dot', cursor.el); cursor.ring = $('.c-ring', cursor.el); cursor.txt = $('span', cursor.ring);
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      cursor.x = e.clientX; cursor.y = e.clientY;
      if (!cursor.on) { cursor.on = true; cursor.rx = cursor.x; cursor.ry = cursor.y; doc.classList.add('cur-on'); }
      const h = e.target.closest && e.target.closest('a,button,[data-lb],label,input,select,textarea');
      const v = e.target.closest && e.target.closest('[data-cursor]');
      cursor.el.classList.toggle('hover', !!h);
      cursor.el.classList.toggle('ver', !!v);
      if (v && cursor.txt) cursor.txt.textContent = v.dataset.cursor;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { cursor.on = false; doc.classList.remove('cur-on'); });
  }
  function frameCursor() {
    if (!cursor.on) return;
    cursor.rx = lerp(cursor.rx, cursor.x, .18); cursor.ry = lerp(cursor.ry, cursor.y, .18);
    cursor.dot.style.transform = `translate3d(${cursor.x}px,${cursor.y}px,0)`;
    cursor.ring.style.transform = `translate3d(${cursor.rx}px,${cursor.ry}px,0)`;
  }

  /* =====================================================================
     S9 · Lightbox con FLIP (la foto "se abre en grande")
     ===================================================================== */
  function iniciarLightbox() {
    const dlg = $('#lb'), img = $('#lbImg'), cap = $('#lbCap');
    const cels = $$('[data-lb]');
    if (!dlg || !img || !cels.length || typeof dlg.showModal !== 'function') return;
    dlg.setAttribute('data-lenis-prevent', '');
    const datos = cels.map(c => { const i = $('img', c), p = $('.pie', c); return { src: i.getAttribute('src'), alt: i.alt, cap: p ? p.textContent : '' }; });
    let idx = 0, abierto = false;
    const EASE = 'cubic-bezier(.77,0,.18,1)';
    const mostrar = i => { idx = (i + datos.length) % datos.length; const d = datos[idx]; img.src = d.src; img.alt = d.alt; cap.textContent = d.cap; };
    const flip = (a, b) => ({ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})` });
    async function abrir(i) {
      mostrar(i); abierto = true;
      dlg.showModal(); doc.classList.add('lb-open'); lenis && lenis.stop();
      try { await img.decode(); } catch (e) { /* sigue */ }
      if (reduce.matches || !img.animate) return;
      const a = cels[idx].getBoundingClientRect(), b = img.getBoundingClientRect();
      img.style.transformOrigin = '0 0';
      img.animate([flip(a, b), { transform: 'none' }], { duration: 750, easing: EASE });
      dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    }
    async function cerrar() {
      if (!abierto) return; abierto = false;
      if (!reduce.matches && img.animate) {
        const a = cels[idx].getBoundingClientRect(), b = img.getBoundingClientRect();
        img.style.transformOrigin = '0 0';
        try { await img.animate([{ transform: 'none' }, flip(a, b)], { duration: 600, easing: EASE, fill: 'forwards' }).finished; } catch (e) { /* sigue */ }
      }
      dlg.close();
      img.getAnimations && img.getAnimations().forEach(x => x.cancel());
      doc.classList.remove('lb-open'); lenis && lenis.start();
      cels[idx].focus({ preventScroll: true });
    }
    const nav = d => { mostrar(idx + d); img.animate && !reduce.matches && img.animate([{ opacity: 0, transform: `translateX(${d * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' }); };
    cels.forEach((c, i) => c.addEventListener('click', () => abrir(i)));
    $('#lbX').addEventListener('click', cerrar);
    $('#lbPrev').addEventListener('click', () => nav(-1));
    $('#lbNext').addEventListener('click', () => nav(1));
    dlg.addEventListener('cancel', e => { e.preventDefault(); cerrar(); });
    dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') nav(-1); else if (e.key === 'ArrowRight') nav(1); });
  }

  /* =====================================================================
     S11 · Formulario → WhatsApp
     ===================================================================== */
  function iniciarFormulario() {
    const form = $('#formWa'); if (!form) return;
    const nombre = $('#fNombre'), err = $('#errNombre');
    const limpiar = () => { err.textContent = ''; nombre.removeAttribute('aria-invalid'); nombre.closest('.campo').classList.remove('inv'); };
    nombre.addEventListener('input', limpiar);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const n = nombre.value.trim();
      if (!n) {
        err.textContent = 'Cuéntanos tu nombre para poder dirigirnos a ti.';
        nombre.setAttribute('aria-invalid', 'true');
        nombre.closest('.campo').classList.add('inv');
        nombre.focus();
        return;
      }
      limpiar();
      if (!TIENE_WA) return;
      const servicio = $('#fServ').value || 'Aún no lo sé';
      const caso = $('#fCaso').value.trim() || 'prefiero contártelo por aquí';
      const h = form.querySelector('input[name="horario"]:checked');
      const horario = h ? h.value : 'cualquier día';
      const msg = `Hola Fisioloh, soy ${n}. Me interesa: ${servicio}. Mi caso: ${caso}. Me viene bien: ${horario}. ¿Me ayudan a agendar mi valoración?`;
      window.open(wa(msg), '_blank', 'noopener');
    });
  }

  /* =====================================================================
     Columna de progreso (scroll-spy)
     ===================================================================== */
  const spy = { cur: -1, links: [], navLinks: [] };
  function iniciarColProg() {
    if (!colProg) return;
    secs.forEach(s => {
      const a = document.createElement('a');
      a.className = 'vert'; a.href = '#' + s.id; a.setAttribute('aria-label', s.dataset.nombre);
      a.innerHTML = `<svg viewBox="0 0 40 24" aria-hidden="true"><use href="#i-vert"/></svg><span class="tip">${s.dataset.nombre}</span>`;
      colProg.appendChild(a); spy.links.push(a);
    });
    spy.navLinks = $$('.nav-d a');
  }

  /* =====================================================================
     Medición (posiciones cacheadas: el scroll no lee el layout)
     ===================================================================== */
  const pistaServ = $('#servPista'), metPasos = $('#metPasos'), marcoEl = $('#marcoPis'), pisDet = $('#pisDet');
  const credCards = $$('.cred-card');
  const A = el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; };
  function medir() {
    vw = innerWidth; vh = innerHeight;
    const pin = mq('(min-width:900px)').matches && !reduce.matches;
    doc.classList.toggle('pin', pin);
    M.pin = pin;
    if (pin && servEl && pistaServ) {
      servEl.style.height = '';
      M.servTrack = Math.max(0, pistaServ.scrollWidth - vw);
      servEl.style.height = (M.servTrack + vh) + 'px';
    } else if (servEl) {
      servEl.style.height = ''; M.servTrack = 0;
      if (pistaServ) pistaServ.style.removeProperty('--tx');
    }
    M.hero = A(heroEl); M.alin = A(alinEl); M.cam = A(camEl); M.serv = A(servEl); M.pis = A(pisEl);
    M.marco = marcoEl ? A(marcoEl) : { top: 0, h: 1 };
    M.met = metPasos ? A(metPasos) : { top: 0, h: 1 };
    M.docH = doc.scrollHeight;
    M.secs = secs.map(A);
    construirMetodo();
    lienzos.forEach(o => o.ajustar());
    lastSy = -999; // fuerza repintado
  }

  /* =====================================================================
     Bucle principal (un solo rAF para todo)
     ===================================================================== */
  let lastSy = -999, prevFrameSy = 0, skew = 0, hdrLast = 0;
  const cinta = $('#especialidades'), cap = $('#capsula'), aguja = $('#aguja');
  const servNum = $('#servNum'), servBarra = $('#servBarra');

  function escroll() {
    const prefiereMov = !reduce.matches;
    /* header */
    hdr.classList.toggle('scrolled', sy > 40);
    if (Math.abs(sy - hdrLast) > 6) {
      hdr.classList.toggle('oculto', sy > hdrLast && sy > 240 && !doc.classList.contains('menu-open'));
      hdrLast = sy;
    }
    /* progreso global */
    const pg = clamp(sy / Math.max(1, M.docH - vh)).toFixed(4);
    sv(progMovil, '--p', pg); sv(colProg, '--p', pg);
    /* hero */
    heroP = clamp(sy / Math.max(1, M.hero.h));
    if (prefiereMov) sv(heroVis, '--hp', heroP.toFixed(4));
    /* alineación */
    const a = M.alin;
    alinP = M.pin ? clamp((sy - a.top) / Math.max(1, a.h - vh)) : clamp((sy + vh * .85 - a.top) / (a.h * .9));
    alinPaso(alinP);
    /* cámara */
    camP = clamp((sy + vh - M.cam.top) / (M.cam.h * .8 + vh * .2));
    if (aguja && prefiereMov) sv(aguja, '--agu', (-120 + camP * 200).toFixed(1) + 'deg');
    /* servicios (recorrido horizontal) */
    if (M.pin && pistaServ) {
      const p = clamp((sy - M.serv.top) / Math.max(1, M.serv.h - vh));
      sv(pistaServ, '--tx', (-p * M.servTrack).toFixed(1) + 'px');
      sv(servBarra, '--sp', p.toFixed(4));
      if (servNum) { const n = '0' + clamp(Math.floor(p * 7) + 1, 1, 7); if (servNum.textContent !== n) servNum.textContent = n; }
    }
    /* pisada: la imagen se abre en grande + parallax inverso */
    if (prefiereMov) {
      const pm = clamp((sy + vh * .95 - M.marco.top) / (vh * .75));
      sv(marcoEl, '--abre', easeOut(pm).toFixed(3));
      const ps = clamp((sy + vh - M.pis.top) / (M.pis.h + vh));
      sv(pisDet, '--par', ((.5 - ps) * 80).toFixed(1) + 'px');
    }
    /* método: la línea se dibuja */
    dibujarMetodo(prefiereMov ? clamp(sy + vh * .6 - M.met.top, 0, M.met.h) : M.met.h);
    /* credenciales: efecto baraja (solo escritorio) */
    if (prefiereMov && innerWidth >= 900 && credCards.length) {
      const e = M.secs[secs.findIndex(s => s.id === 'especialista')];
      if (e && sy + vh > e.top && sy < e.top + e.h) {
        const rects = credCards.map(c => c.getBoundingClientRect());
        credCards.forEach((c, i) => {
          if (i === credCards.length - 1) return;
          const st = 110 + i * 16, d = rects[i + 1].top - st, h = rects[i].height;
          const p = clamp(1 - (d - 16) / (h * .9));
          c.style.transform = p > 0 ? `scale(${(1 - .04 * p).toFixed(4)})` : '';
          c.style.opacity = p > 0 ? (1 - .15 * p).toFixed(3) : '';
        });
      }
    }
    /* scroll-spy */
    let cur = 0;
    for (let i = 0; i < M.secs.length; i++) if (M.secs[i].top - vh * .45 <= sy) cur = i;
    if (cur !== spy.cur) {
      spy.cur = cur;
      spy.links.forEach((l, i) => { l.classList.toggle('on', i === cur); l.classList.toggle('hecha', i < cur); });
      if (colProg && secs[cur]) colProg.classList.toggle('osc', secs[cur].classList.contains('osc'));
      const id = '#' + (secs[cur] ? secs[cur].id : '');
      spy.navLinks.forEach(l => l.classList.toggle('act', l.getAttribute('href') === id));
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    try {
      if (lenis) lenis.raf(now);
      sy = window.scrollY || window.pageYOffset || 0;
      const t = now / 1000;
      /* puntero suavizado */
      ptr.ax = lerp(ptr.ax, ptr.nx, .08); ptr.ay = lerp(ptr.ay, ptr.ny, .08);
      /* inclinación de la cinta por velocidad */
      if (!reduce.matches && cinta) {
        const v = sy - prevFrameSy;
        skew = lerp(skew, clamp(v * .18, -6, 6), .15);
        if (Math.abs(skew) < .01) skew = 0;
        sv(cinta, '--skew', skew.toFixed(2) + 'deg');
      }
      prevFrameSy = sy;
      if (Math.abs(sy - lastSy) > .01) { lastSy = sy; escroll(); geoRevelar(); }
      if (!reduce.matches) {
        /* animaciones continuas solo si son visibles */
        lienzos.forEach(o => { if (o.vis && o.W) o.dibujar(o, t); });
        if (sy + vh > M.alin.top && sy < M.alin.top + M.alin.h) pintarAlin(1 - easeOut(clamp(alinP * 1.15)), t);
        if (cap && sy + vh > M.cam.top && sy < M.cam.top + M.cam.h) {
          const ry = lerp(-28, -4, camP) + ptr.ax * 12, rx = -ptr.ay * 8, tx = lerp(6, 0, camP);
          cap.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) translateX(${tx.toFixed(2)}%)`;
        }
      }
      frameCursor();
    } catch (e) { /* no detener el bucle */ }
  }

  /* =====================================================================
     Librerías opcionales (CDN, versión fija). La página funciona sin ellas.
     ===================================================================== */
  function cargarLib(src, cb) {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => { try { cb && cb(); } catch (e) { /* sin librería */ } };
    s.onerror = () => { /* sigue con CSS/rAF propios */ };
    document.head.appendChild(s);
  }
  function cargarLibs() {
    if (reduce.matches) return;
    cargarLib('https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js');
    if (fino.matches) {
      cargarLib('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js', () => {
        if (window.Lenis) { lenis = new window.Lenis({ lerp: .085, smoothWheel: true }); doc.classList.add('lenis', 'lenis-smooth'); }
      });
    }
  }

  /* =====================================================================
     Arranque
     ===================================================================== */
  seguro(iniciarWA);
  seguro(iniciarEstado);
  seguro(iniciarLoader);
  seguro(iniciarMenu);
  seguro(iniciarAnclas);
  seguro(prepararContadores);
  seguro(iniciarReveal);
  seguro(iniciarCinta);
  seguro(iniciarAlin);
  seguro(iniciarCamara);
  seguro(iniciarHeroCanvas);
  seguro(iniciarPuntero);
  seguro(iniciarCursor);
  seguro(iniciarLightbox);
  seguro(iniciarFormulario);
  seguro(iniciarColProg);
  seguro(medir);
  seguro(() => requestAnimationFrame(frame));
  seguro(cargarLibs);

  /* Re-mediciones: fuentes, carga total, cambios de tamaño del documento */
  let tm = null;
  const remedir = () => { clearTimeout(tm); tm = setTimeout(() => seguro(medir), 180); };
  addEventListener('resize', remedir);
  addEventListener('orientationchange', remedir);
  addEventListener('load', () => { remedir(); setTimeout(() => seguro(medir), 1200); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
  if ('ResizeObserver' in window) {
    let hPrev = 0;
    new ResizeObserver(() => { const h = document.body.scrollHeight; if (Math.abs(h - hPrev) > 2) { hPrev = h; remedir(); } }).observe(document.body);
  }
  if (reduce.addEventListener) reduce.addEventListener('change', () => location.reload());
})();
