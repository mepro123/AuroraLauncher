'use strict';
// OfflineCraft 3D skin viewer. Pure Canvas 2D (no WebGL), so it works even in software-rendering mode.
// Every body part is a textured box; each face is drawn with an affine transform of the skin texture.
const Skin3D = (() => {
  const st = {
    yaw: -0.6, pitch: 0.22, zoom: 1, auto: true, walk: false, anim: true,
    shades: null, legacy: false, sc: 1, url: '', slim: false, canvas: null, wrap: null,
    raf: 0, drag: null, idleAt: 0, last: 0, dirty: true, t0: 0, gen: 0,
  };
  const LIGHT = (() => { const v = [-0.35, 0.8, 0.55], n = Math.hypot(...v); return v.map(x => x / n); })();
  const DARK_STEP = 0.14;

  // ---- skin texture helpers ----
  function placeholder() {            // fallback Steve-like skin, used only until the real Steve texture loads
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const SK = '#bc8a6a', HR = '#3b2a1b', SH = '#2ab0b5', PN = '#3f3a94', FT = '#6b6b6b';
    R(SK, 0, 0, 32, 16);                                   // head: skin everywhere, then hair
    R(HR, 8, 0, 8, 8); R(HR, 0, 8, 32, 2); R(HR, 0, 10, 4, 3); R(HR, 20, 10, 4, 3); R(HR, 24, 10, 8, 3);   // top, brow line, side + back hair
    R(HR, 8, 10, 2, 1); R(HR, 14, 10, 2, 1);               // sideburns on the front
    R('#ffffff', 9, 12, 1, 1); R('#4b2fa0', 10, 12, 1, 1); R('#4b2fa0', 13, 12, 1, 1); R('#ffffff', 14, 12, 1, 1);   // eyes
    R('#8f5e41', 11, 13, 2, 1); R('#7a4a32', 10, 14, 4, 1); R('#7a4a32', 10, 15, 4, 1);                      // nose + beard
    R(SH, 16, 16, 24, 16);                                 // torso
    R(SH, 40, 16, 16, 16); R(SK, 40, 24, 16, 8); R(SK, 48, 16, 4, 4);                                        // right arm
    R(PN, 0, 16, 16, 16); R(FT, 0, 30, 16, 2); R(FT, 8, 16, 4, 4);                                           // right leg
    R(SH, 32, 48, 16, 16); R(SK, 32, 56, 16, 8); R(SK, 40, 48, 4, 4);                                         // left arm
    R(PN, 16, 48, 16, 16); R(FT, 16, 62, 16, 2); R(FT, 24, 48, 4, 4);                                         // left leg
    return c;
  }
  function buildShades(im) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, out = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0);
      if (k) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(5,7,12,${k * DARK_STEP})`; g.fillRect(0, 0, w, h); }
      out.push(c);
    }
    return { out, legacy: h * 2 <= w, sc: w / 64 };
  }

  // ---- model ----
  // u,v = texture origin; w,h,d = box size; x,y,z = min corner; e = overlay expansion; part = animation group
  function parts(slim, legacy) {
    const aw = slim ? 3 : 4, P = [];
    const add = (u, v, w, h, d, x, y, z, e, part, mirror) => P.push({ u, v, w, h, d, x, y, z, e, part, mirror: !!mirror });
    add(0, 0, 8, 8, 8, -4, 24, -4, 0, 'head'); add(32, 0, 8, 8, 8, -4, 24, -4, 0.5, 'head');
    add(16, 16, 8, 12, 4, -4, 12, -2, 0, 'body'); if (!legacy) add(16, 32, 8, 12, 4, -4, 12, -2, 0.25, 'body');
    add(40, 16, aw, 12, 4, -4 - aw, 12, -2, 0, 'ra'); if (!legacy) add(40, 32, aw, 12, 4, -4 - aw, 12, -2, 0.25, 'ra');
    if (legacy) add(40, 16, aw, 12, 4, 4, 12, -2, 0, 'la', true);
    else { add(32, 48, aw, 12, 4, 4, 12, -2, 0, 'la'); add(48, 48, aw, 12, 4, 4, 12, -2, 0.25, 'la'); }
    add(0, 16, 4, 12, 4, -4, 0, -2, 0, 'rl'); if (!legacy) add(0, 32, 4, 12, 4, -4, 0, -2, 0.25, 'rl');
    if (legacy) add(0, 16, 4, 12, 4, 0, 0, -2, 0, 'll', true);
    else { add(16, 48, 4, 12, 4, 0, 0, -2, 0, 'll'); add(0, 48, 4, 12, 4, 0, 0, -2, 0.25, 'll'); }
    return P;
  }
  // six faces of a box: [name, origin, uAxis, vAxis, outward normal, texture rect]
  function boxFaces(p) {
    const e = p.e, x0 = p.x - e, y0 = p.y - e, z0 = p.z - e, x1 = p.x + p.w + e, y1 = p.y + p.h + e, z1 = p.z + p.d + e;
    const W = x1 - x0, H = y1 - y0, D = z1 - z0, { u, v, w, h, d } = p;
    const F = [
      ['front', [x0, y1, z1], [W, 0, 0], [0, -H, 0], [0, 0, 1], [u + d, v + d, w, h]],
      ['back', [x1, y1, z0], [-W, 0, 0], [0, -H, 0], [0, 0, -1], [u + 2 * d + w, v + d, w, h]],
      ['right', [x0, y1, z0], [0, 0, D], [0, -H, 0], [-1, 0, 0], [u, v + d, d, h]],
      ['left', [x1, y1, z1], [0, 0, -D], [0, -H, 0], [1, 0, 0], [u + d + w, v + d, d, h]],
      ['top', [x0, y1, z0], [W, 0, 0], [0, 0, D], [0, 1, 0], [u + d, v, w, d]],
      ['bottom', [x0, y0, z1], [W, 0, 0], [0, 0, -D], [0, -1, 0], [u + d + w, v, w, d]],
    ];
    if (p.mirror) {                                   // legacy 64x32 skins reuse the right limb, mirrored, for the left limb
      const L = F[2][5], R = F[3][5]; F[2][5] = R; F[3][5] = L;
      for (const f of F) { f[1] = [f[1][0] + f[2][0], f[1][1] + f[2][1], f[1][2] + f[2][2]]; f[2] = [-f[2][0], -f[2][1], -f[2][2]]; }
    }
    return F;
  }
  const PIVOT = { ra: 24, la: 24, rl: 12, ll: 12 };
  const SIGN = { ra: 1, la: -1, rl: -1, ll: 1 };

  // rotate about X through (0,py,0), then yaw (Y) and pitch (X); the model is centred on y=16
  function makeXf(yaw, pitch, py, ang) {
    const ca = Math.cos(ang), sa = Math.sin(ang), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const dir = v => {
      let [x, y, z] = v;
      if (ang) { const y2 = y * ca - z * sa, z2 = y * sa + z * ca; y = y2; z = z2; }
      const x3 = x * cy + z * sy, z3 = -x * sy + z * cy;
      return [x3, y * cp - z3 * sp, y * sp + z3 * cp];
    };
    const pt = v => { let [x, y, z] = v; y -= 16; if (ang) { const dy = y - (py - 16); y = (py - 16) + dy * ca - z * sa; z = dy * sa + z * ca; } const x3 = x * cy + z * sy, z3 = -x * sy + z * cy; return [x3, y * cp - z3 * sp, y * sp + z3 * cp]; };
    return { dir, pt };
  }
  // all visible faces for the current view, far to near
  function visibleFaces(yaw, pitch, swing) {
    const out = [];
    for (const p of parts(st.slim, st.legacy)) {
      const ang = (SIGN[p.part] || 0) * swing, xf = makeXf(yaw, pitch, PIVOT[p.part] || 0, ang);
      for (const [name, o, U, V, n, tex] of boxFaces(p)) {
        const nr = xf.dir(n); if (nr[2] <= 0.001) continue;                   // back-face cull
        const a = xf.pt(o), b = xf.pt([o[0] + U[0], o[1] + U[1], o[2] + U[2]]), c = xf.pt([o[0] + V[0], o[1] + V[1], o[2] + V[2]]);
        const depth = (a[2] + b[2] + c[2] + (b[2] + c[2] - a[2])) / 4;
        const lum = 0.55 + 0.45 * Math.max(0, nr[0] * LIGHT[0] + nr[1] * LIGHT[1] + nr[2] * LIGHT[2]);
        out.push({ a, b, c, tex, depth, shade: Math.min(3, Math.round((1 - lum) / DARK_STEP)) });
      }
    }
    return out.sort((x, y) => x.depth - y.depth);
  }

  // ---- drawing ----
  function draw(now) {
    const cv = st.canvas, wrap = st.wrap; if (!cv || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    if (!st.shades) return;
    g.imageSmoothingEnabled = false;
    const t = (now - st.t0) / 1000, swing = st.walk && st.anim ? Math.sin(t * 5.2) * 0.72 : 0;
    const scale = Math.min(h * 0.8 / 34, w * 0.86 / 20) * st.zoom, cx = w / 2, cy = h / 2 + h * 0.015;
    const faces = visibleFaces(st.yaw, st.pitch, swing), sc = st.sc, X = p => cx + p[0] * scale, Y = p => cy - p[1] * scale;
    // soft ground shadow
    { const f = makeXf(st.yaw, st.pitch, 0, 0).pt([0, 0, 0]), rx = 12 * scale, ry = Math.max(rx * 0.16, rx * Math.sin(Math.max(st.pitch, 0.04)) * 0.9);
      g.save(); g.translate(X(f) * dpr, (Y(f) + 1) * dpr); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx * dpr);
      gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx * dpr, 0, 6.2832); g.fill(); g.restore(); }
    for (const f of faces) {
      const ax = X(f.a), ay = Y(f.a), ux = X(f.b) - ax, uy = Y(f.b) - ay, vx = X(f.c) - ax, vy = Y(f.c) - ay;
      const eu = 0.5 / Math.max(1, Math.hypot(ux, uy) * dpr), ev = 0.5 / Math.max(1, Math.hypot(vx, vy) * dpr);   // tiny overscan hides seams
      g.setTransform(ux * dpr, uy * dpr, vx * dpr, vy * dpr, ax * dpr, ay * dpr);
      g.drawImage(st.shades[f.shade], f.tex[0] * sc, f.tex[1] * sc, f.tex[2] * sc, f.tex[3] * sc, -eu, -ev, 1 + 2 * eu, 1 + 2 * ev);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function frame(now) {
    if (!st.canvas || !document.body.contains(st.canvas)) { st.raf = 0; st.canvas = null; return; }
    const dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now;
    const animating = st.anim && (st.auto || st.walk);
    if (st.anim && st.auto && !st.drag && now - st.idleAt > 1200) { st.yaw += dt * 0.7; st.dirty = true; }
    if (animating || st.dirty) { st.dirty = false; draw(now); }
    st.raf = requestAnimationFrame(frame);
  }

  // ---- public ----
  function loadTexture(url) {
    const gen = ++st.gen;
    if (!url) { const ph = placeholder(); const s = buildShades(ph); Object.assign(st, { shades: s.out, legacy: false, sc: 1, dirty: true }); return; }
    const im = new Image(); im.onload = () => { if (gen !== st.gen) return; const s = buildShades(im); Object.assign(st, { shades: s.out, legacy: s.legacy, sc: s.sc, dirty: true }); };
    im.onerror = () => { if (gen === st.gen) { st.shades = null; st.dirty = true; } }; im.src = url;
  }
  function attach(wrap) {
    const cv = document.createElement('canvas'); wrap.appendChild(cv); st.canvas = cv; st.wrap = wrap;
    wrap.addEventListener('pointerdown', e => { if (e.button) return; st.drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; wrap.setPointerCapture(e.pointerId); wrap.classList.add('drag'); });
    wrap.addEventListener('pointermove', e => { const d = st.drag; if (!d) return; st.yaw = d.yaw + (e.clientX - d.x) * 0.011; st.pitch = Math.max(-0.7, Math.min(1.1, d.pitch + (e.clientY - d.y) * 0.008)); st.dirty = true; });
    const up = () => { if (!st.drag) return; st.drag = null; st.idleAt = performance.now(); wrap.classList.remove('drag'); };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(2.4, st.zoom * Math.exp(-e.deltaY * 0.0012))); st.dirty = true; }, { passive: false });
    wrap.addEventListener('dblclick', () => reset());
    new ResizeObserver(() => { st.dirty = true; }).observe(wrap);
  }
  function mount(wrap, { url = '', slim = false } = {}) {
    if (!wrap) return;
    if (st.wrap !== wrap || !wrap.querySelector('canvas')) { wrap.querySelectorAll('canvas').forEach(c => c.remove()); attach(wrap); st.url = '\u0000'; }
    st.slim = !!slim; st.dirty = true;
    if (st.url !== url) { st.url = url; loadTexture(url); }
    if (!st.t0) st.t0 = performance.now();
    if (!st.raf) { st.last = 0; st.idleAt = performance.now(); st.raf = requestAnimationFrame(frame); }
  }
  function set(o) { Object.assign(st, o); st.dirty = true; }
  function reset() { st.yaw = -0.6; st.pitch = 0.22; st.zoom = 1; st.idleAt = performance.now(); st.dirty = true; }
  return { mount, set, reset, _geo: { parts, boxFaces, makeXf, visibleFaces, st } };
})();
if (typeof module !== 'undefined') module.exports = Skin3D;
