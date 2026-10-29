const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
global.fetch = async () => { throw new Error('no network'); };
const mk = (id) => { fs.mkdirSync(`${D}/instances/${id}/minecraft`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', versionId: '', color: '', ramMB: 0, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 900, playTime: 7300 })); }; mk('Survival');
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); await sleep(1400);
  const r = await ev(`(()=>{
    const clean = n => { const c = n.cloneNode(true); c.querySelectorAll('.segind,.dd-btn,.ripc').forEach(x => x.remove()); c.querySelectorAll('select').forEach(s => { s.removeAttribute('style'); s.removeAttribute('data-dd'); }); c.querySelectorAll('[data-morph=skip]').forEach(x => { x.innerHTML = ''; }); c.querySelectorAll('.pop-in').forEach(x => x.classList.remove('pop-in')); c.querySelectorAll('[class=""]').forEach(x => x.removeAttribute('class')); c.querySelectorAll('input').forEach(i => { i.removeAttribute('value'); }); return c; };
    const sig = n => { let s = ''; const walk = x => { if (x.nodeType === 3) { const t = x.nodeValue.trim(); if (t) s += 'T:' + t + '|'; } else if (x.nodeType === 1) { s += '<' + x.tagName + [...x.attributes].filter(a => a.name !== 'style').map(a => a.name + '=' + a.value).sort().join(',') + '>'; x.childNodes.forEach(walk); s += '</>'; } }; walk(n); return s; };
    S.page = 'library'; render(true); render(); const m = document.querySelector('#main'); const fresh = document.createElement('div'); fresh.innerHTML = pgLibrary();
    const A = sig(clean(m)), B = sig(clean(fresh)); let i = 0; while (i < A.length && A[i] === B[i]) i++;
    return { same: A === B, lenA: A.length, lenB: B.length, at: i, a: A.slice(Math.max(0, i - 80), i + 120), b: B.slice(Math.max(0, i - 80), i + 120) }; })()`);
  console.log('DIFF', JSON.stringify(r, null, 1));
} catch (e) { console.log('ERR', e.message); } app.quit(); }));
