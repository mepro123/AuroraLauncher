const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
global.fetch = async url => { const j = o => ({ ok: true, status: 200, json: async () => o }); if (/\/search\?/.test(String(url))) return j({ total_hits: 2, hits: [{ project_id: 'A1', slug: 'a', title: 'Alpha', description: 'first', icon_url: '', author: 'x', project_type: 'mod', downloads: 10, follows: 1, display_categories: ['utility'] }, { project_id: 'B2', slug: 'b', title: 'Beta', description: 'second', icon_url: '', author: 'y', project_type: 'mod', downloads: 20, follows: 2, display_categories: [] }] }); throw new Error('no network'); };
const mk = (id, o = {}) => { fs.mkdirSync(`${D}/instances/${id}/minecraft/mods`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', loaderVer: '', versionId: '', color: '', iconFile: '', coverFile: '', assetVer: 0, ramMB: 0, javaPath: '', jvmArgs: '', width: 0, height: 0, fullscreen: false, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 900, playTime: 7300, ...o })); };
mk('Survival'); mk('Pack', { lastPlayed: 0 });
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m); fs.mkdirSync('/tmp/shots10', { recursive: true });
  const shot = async n => { await sleep(500); fs.writeFileSync(`/tmp/shots10/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham'})`); await sleep(300);
  // ---- 1. truly centered top nav
  await ev(`call('saveSettings',{sidebarPos:'top'})`); await sleep(800);
  const g = await ev(`(()=>{const s=[...document.querySelectorAll('.nav')].map(n=>n.getBoundingClientRect());const a=document.querySelector('#acct').getBoundingClientRect();return {mid:(s[0].left+s[s.length-1].right)/2, win:innerWidth/2, acctL:a.left, lastR:s[s.length-1].right, acctR:a.right}})()`);
  ok(Math.abs(g.mid - g.win) < 3, `top nav is centered in the window (nav middle ${g.mid.toFixed(1)} vs window middle ${g.win})`);
  ok(g.acctL > g.lastR + 20 && g.acctR > 1000, 'account button stays on the right'); await shot('1-centered');
  await ev(`call('saveSettings',{sidebarPos:'left'})`); await sleep(600);
  // ---- 2. icon+text <-> icons-only animates (label shrinks gradually, not a jump)
  const w0 = await ev(`document.querySelector('.nav .lbl').getBoundingClientRect().width`);
  await ev(`call('saveSettings',{sidebarLabels:false})`); await sleep(110);
  const wMid = await ev(`document.querySelector('.nav .lbl').getBoundingClientRect().width`); const sMid = await ev(`document.querySelector('#side').getBoundingClientRect().width`);
  await sleep(600); const wEnd = await ev(`document.querySelector('.nav .lbl').getBoundingClientRect().width`), sEnd = await ev(`document.querySelector('#side').getBoundingClientRect().width`);
  ok(wMid > 0 && wMid < w0 && wEnd === 0, `label shrinks smoothly (${w0.toFixed(0)} -> ${wMid.toFixed(0)} -> ${wEnd})`); ok(sMid > sEnd && sMid < 224 && sEnd < 90, `sidebar width animates (224 -> ${sMid.toFixed(0)} -> ${sEnd})`);
  const ind = await ev(`(()=>{const i=document.querySelector('#navind').getBoundingClientRect(),n=document.querySelector('.nav.on').getBoundingClientRect();return Math.max(Math.abs(i.left-n.left),Math.abs(i.top-n.top),Math.abs(i.width-n.width))})()`); ok(ind < 2, 'highlight stays on its item after the change');
  await ev(`call('saveSettings',{sidebarLabels:true})`); await sleep(700);
  // ---- 3. window opacity + panel blur
  await ev(`go('settings')`); await sleep(500);   fs.mkdirSync(D + '/backgrounds', { recursive: true }); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg-1.png');
  await ev(`call('saveSettings',{bgFile:'bg-1.png',bgType:'image',bgVer:1,panelOpacity:60,panelBlur:12})`); await sleep(600);
  ok(await ev(`document.querySelector('#app').classList.contains('pblur')`), 'panel blur enabled');
  ok(await ev(`getComputedStyle(document.querySelector('.panel')).backdropFilter`).then(v => /blur\(12px\)/.test(v)), 'panels get a frosted-glass blur'); ok(await ev(`!!document.querySelector('#bg-pb')`), 'panel blur slider present'); await shot('2-glass');
  // ---- 4. in-place patching: elements survive, so they animate
  await ev(`document.querySelector('#s-anim').__mark='alive'`); await ev(`call('saveSettings',{animations:false})`); await sleep(400);
  ok(await ev(`document.querySelector('#s-anim').__mark`) === 'alive' && await ev(`document.querySelector('#s-anim').checked`) === false, 'toggle element persists when its setting changes (so the knob animates)'); await ev(`call('saveSettings',{animations:true})`); await sleep(300);
  await ev(`document.querySelector('.seg').__mark='alive'; document.querySelectorAll('.seg button')[1].click()`); await sleep(500);
  ok(await ev(`document.querySelector('.seg').__mark`) === 'alive' && await ev(`S.settings.sidebarPos`) === 'right', 'segmented control persists (highlight slides)'); await ev(`call('saveSettings',{sidebarPos:'left'})`); await sleep(600);
  // new buttons pop in: remove background -> Choose stays, Remove disappears; choose again -> Remove pops in
  await ev(`call('clearBackground')`); await sleep(500); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg-2.png'); await ev(`call('saveSettings',{bgFile:'bg-2.png',bgType:'image',bgVer:2})`); await sleep(90);
  ok(await ev(`(()=>{const b=document.querySelector('[data-act=clearbg]');return !!b && (b.classList.contains('pop-in') || getComputedStyle(b).animationName==='popin')})()`), 'newly appearing Remove button pops in');
  // Play button swaps animate
  await ev(`go('library')`); await sleep(500);
  await ev(`S.busy=['Survival']; render()`); await sleep(60);
  ok(await ev(`(()=>{const b=[...document.querySelectorAll('.cont .btn,.card .btn')].find(x=>x.dataset.key==='play:Survival:busy');return !!b && (b.classList.contains('pop-in')||getComputedStyle(b).animationName==='popin')})()`), 'Play -> Working swap animates'); await ev(`S.busy=[]; render()`);
  // search results stagger in
  await ev(`go('discover')`); await sleep(900); ok(await ev(`document.querySelectorAll('.res').length`) === 2, 'results listed');
  // ---- 5. patching == full rebuild (no drift)
  const same = await ev(`(()=>{
    const clean = n => { const c = n.cloneNode(true); c.querySelectorAll('.segind,.dd-btn,.ripc').forEach(x => x.remove()); c.querySelectorAll('select').forEach(s => { s.removeAttribute('style'); s.removeAttribute('data-dd'); }); c.querySelectorAll('[data-morph=skip]').forEach(x => { x.innerHTML = ''; }); c.querySelectorAll('.pop-in').forEach(x => x.classList.remove('pop-in')); c.querySelectorAll('[class=""]').forEach(x => x.removeAttribute('class')); c.querySelectorAll('[style=""]').forEach(x => x.removeAttribute('style')); c.querySelectorAll('input').forEach(i => { i.removeAttribute('value'); }); c.querySelectorAll('[style]').forEach(x => x.style.animationDelay = ''); return c; };
    const sig = n => { let s = ''; const walk = x => { if (x.nodeType === 3) { const t = x.nodeValue.trim(); if (t) s += 'T:' + t + '|'; } else if (x.nodeType === 1) { s += '<' + x.tagName + [...x.attributes].filter(a => a.name !== 'style').map(a => a.name + '=' + a.value).sort().join(',') + '>'; x.childNodes.forEach(walk); s += '</>'; } }; walk(n); return s; };
    const out = {};
    for (const [name, fn] of [['library', () => { S.page = 'library'; return pgLibrary(); }], ['discover', () => { S.page = 'discover'; return pgDiscover(); }], ['settings', () => { S.page = 'settings'; return pgSettings(); }], ['console', () => { S.page = 'console'; return pgConsole(); }]]) {
      S.page = name; render(true); render(); const m = document.querySelector('#main'); const fresh = document.createElement('div'); fresh.innerHTML = fn();
      const sigK = n => [...n.childNodes].map(sig).join(''); out[name] = sigK(clean(m)) === sigK(clean(fresh));
    }
    return out; })()`);
  for (const [k, v] of Object.entries(same)) ok(v, `patched ${k} page is identical to a fresh render`);
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
