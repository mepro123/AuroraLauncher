const { app } = require('electron'); const fs = require('fs'); require('../main.js');
const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (id, o = {}) => { fs.mkdirSync(`${D}/instances/${id}/minecraft/mods`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', loaderVer: '', versionId: '', color: '', iconFile: '', coverFile: '', assetVer: 0, ramMB: 0, javaPath: '', jvmArgs: '', width: 0, height: 0, fullscreen: false, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 3600, playTime: 7300, ...o })); };
mk('Survival', { lastPlayed: Date.now() / 1000 - 600 }); mk('Pack', { lastPlayed: 0 }); fs.writeFileSync(`${D}/instances/Survival/minecraft/mods/a.jar`, 'x'); fs.writeFileSync(`${D}/instances/Survival/minecraft/mods/b.jar`, 'y');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m); fs.mkdirSync('/tmp/shots8', { recursive: true });
  const shot = async n => { await sleep(600); fs.writeFileSync(`/tmp/shots8/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  const px = async (x, y) => { const img = await w.webContents.capturePage(); const b = img.toBitmap(), { width } = img.getSize(), i = (y * width + x) * 4; return [b[i + 2], b[i + 1], b[i]]; };
  const same = (p, q) => Math.max(...p.map((v, k) => Math.abs(v - q[k])));
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham',accentA:'#8b5cf6',accentB:'#ec4899'})`); await sleep(300);
  fs.mkdirSync(D + '/backgrounds', { recursive: true }); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg-9.png');
  await ev(`call('saveSettings',{bgFile:'bg-9.png',bgType:'image',bgVer:9,bgDim:20})`); await sleep(700);
  // chrome tone with a busy background image: left layout
  let d = same(await px(600, 20), await px(100, 500)); ok(d === 0, `left layout: title bar == sidebar even over a background image (diff ${d})`);
  await ev(`call('saveSettings',{sidebarPos:'top'})`); await sleep(500); const bgc = await ev(`getComputedStyle(document.querySelector('#titlebar')).backgroundColor`); ok(!/rgba/.test(bgc) || /, 1\)$/.test(bgc), `top layout: title bar (which now holds the nav) is a solid color (${bgc})`); await shot('1-top-chrome');
  await ev(`call('saveSettings',{sidebarPos:'left',bgFile:'',bgType:'none'}); call('clearBackground')`); await sleep(500);
  // library: continue hero + stagger class
  ok(await ev(`!!document.querySelector('.cont') && document.querySelector('.cont h2').textContent==='Survival'`), 'Continue playing shows the most recent instance');
  ok(await ev(`document.querySelector('.sect').textContent.includes('All instances')`), 'section heading present');
  // per-instance logo + background
  fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', `${D}/instances/Survival/cover-1.png`); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', `${D}/instances/Survival/icon-1.png`);
  await ev(`call('updateInstance','Survival',{coverFile:'cover-1.png',iconFile:'icon-1.png',assetVer:1})`); await sleep(600);
  ok(await ev(`[...document.querySelectorAll('.card')].find(c=>c.innerText.includes('Survival')).querySelector('.cover').getAttribute('style').includes('file://')`), 'custom background shows on the card');
  ok(await ev(`!!([...document.querySelectorAll('.card')].find(c=>c.innerText.includes('Survival')).querySelector('.ic img'))`), 'custom logo shows on the card'); await shot('2-library-custom');
  await ev(`call('clearInstanceImage','Survival','cover'); call('clearInstanceImage','Survival','icon')`); await sleep(600);
  ok(await ev(`![...document.querySelectorAll('.card')].find(c=>c.innerText.includes('Survival')).querySelector('.ic img')`), 'Reset brings back the default tile');
  // instance page stats
  await ev(`go('instance','Survival')`); await sleep(700); ok(await ev(`document.querySelector('#st-mods').textContent`) === '2', 'instance stats count mods (2)'); await shot('3-instance');
  await ev(`S.tab='settings'; render()`); await sleep(500); ok(await ev(`document.querySelectorAll('[data-act=pickimg]').length`) === 2, 'logo + background pickers in instance settings');
  // discover chips + skeleton
  await ev(`go('discover')`); await sleep(300); ok(await ev(`document.querySelectorAll('.cchip').length`) > 5, 'category chips present');
  await ev(`document.querySelectorAll('.cchip')[2].click()`); await sleep(100); ok(await ev(`S.disc.cat`) === 'utility', 'clicking a category filters search');
  await ev(`S.disc.loading=true; renderResults()`); ok(await ev(`document.querySelectorAll('.res.sk').length`) === 5, 'skeleton placeholders while loading'); await ev(`S.disc.loading=false`);
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
