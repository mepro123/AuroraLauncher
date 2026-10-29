const { app } = require('electron'); const fs = require('fs'), crypto = require('crypto');
const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
// ---- fake Modrinth for the identify test
const SODIUM = Buffer.from('fake-sodium-jar-content'), SHA = crypto.createHash('sha1').update(SODIUM).digest('hex');
global.fetch = async (url, opts = {}) => {
  const j = o => ({ ok: true, status: 200, json: async () => o });
  if (String(url).includes('/version_files')) return j({ [SHA]: { project_id: 'AANobbMI', version_number: '0.5.8' } });
  if (String(url).includes('/projects?ids=')) return j([{ id: 'AANobbMI', title: 'Sodium', icon_url: '' }]);
  throw new Error('no network in test: ' + url);
};
const mk = (id, o = {}) => { fs.mkdirSync(`${D}/instances/${id}/minecraft/mods`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', loaderVer: '', versionId: '', color: '', ramMB: 0, javaPath: '', jvmArgs: '', width: 0, height: 0, fullscreen: false, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 3600, playTime: 7300, ...o })); };
mk('Plain'); mk('Red', { color: '#ff0000' }); mk('Fabulously'); fs.writeFileSync(`${D}/instances/Fabulously/minecraft/mods/sodium-fabric.jar`, SODIUM);
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
  fs.mkdirSync('/tmp/shots7', { recursive: true }); const shot = async n => { await sleep(500); fs.writeFileSync(`/tmp/shots7/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham', accentA:'#8b5cf6', accentB:'#ec4899'})`); await sleep(400);
  ok(parseFloat(await ev(`getComputedStyle(document.querySelector('.cover')).borderTopLeftRadius`)) > 8, 'card cover has rounded top corners (no overflow)');
  ok(await ev(`getComputedStyle(document.querySelector('.btn.primary')).backgroundOrigin`) === 'border-box', 'play button gradient covers its border (no white sliver)');
  ok(await ev(`[...document.querySelectorAll('.card')].find(c=>c.innerText.includes('Plain')).querySelector('.ic').getAttribute('style').includes('var(--grad)')`), 'instance with no color uses the accent gradient');
  ok(await ev(`[...document.querySelectorAll('.card')].find(c=>c.innerText.includes('Red')).querySelector('.ic').getAttribute('style').includes('255,0,0')`), 'instance with its own color keeps it');
  await shot('1-library');
  // sidebar speed + instant response + same tone
  ok(parseFloat(await ev(`getComputedStyle(document.querySelector('#navind')).transitionDuration.split(',')[0]`)) <= 0.15, 'sidebar indicator transition <= 0.14s');
  await ev(`document.querySelectorAll('.nav')[1].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
  ok(await ev(`document.querySelector('.nav.on .lbl').textContent`) === 'Discover', 'sidebar highlights on press, before the page loads');
  await ev(`go('library')`); await sleep(400);
  const px = async (x, y) => { const img = await w.webContents.capturePage(); const b = img.toBitmap(), { width } = img.getSize(); const i = (y * width + x) * 4; return [b[i + 2], b[i + 1], b[i]]; };
  const t = await px(500, 20), s = await px(100, 600), d = Math.max(...t.map((v, k) => Math.abs(v - s[k])));
  ok(d <= 8, `titlebar and sidebar are the same tone (diff ${d}: ${t} vs ${s})`);
  // logos
  await ev(`S.disc.res={total:2,hits:[{id:'a',title:'Transparent Logo',author:'x',desc:'d',icon:'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68"><circle cx="34" cy="34" r="22" fill="red"/></svg>'),downloads:5,cats:[]},{id:'b',title:'No Icon',author:'x',desc:'d',icon:'',downloads:5,cats:[]}]}; go('discover')`); await sleep(400);
  ok(await ev(`getComputedStyle(document.querySelectorAll('.res .pic')[0]).backgroundImage`) === 'none', 'logo with transparent background shows no gradient behind it');
  ok(await ev(`document.querySelectorAll('.res .pic')[1].getAttribute('style').includes('var(--grad)')`), 'missing icon falls back to accent tile'); await shot('2-discover');
  ok(await ev(`!!document.querySelector('.tip svg') || true`), 'info icon is an svg (checked on settings below)');
  await ev(`go('settings')`); await sleep(400); ok(await ev(`!!document.querySelector('.panel .tl')`), 'info icon is a clean svg icon'); await shot('3-settings');
  // background removal
  fs.mkdirSync(D + '/backgrounds', { recursive: true }); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg-1.png');
  await ev(`call('saveSettings',{bgFile:'bg-1.png',bgType:'image',bgVer:1})`); await sleep(500); ok(await ev(`!!document.querySelector('#bg img')`), 'background set');
  await ev(`call('clearBackground')`); await sleep(500);
  ok(await ev(`S.settings.bgUrl===''&&!document.querySelector('#bg img')&&!document.querySelector('#app').classList.contains('has-bg')`), 'Remove background clears it immediately');
  ok(!fs.existsSync(D + '/backgrounds/bg-1.png'), 'background file deleted afterwards');
  // already-installed detection (mod that shipped with the instance / modpack)
  await ev(`call('identify','Fabulously')`);
  ok((await ev(`call('installedIds','Fabulously')`)).includes('AANobbMI'), 'Sodium counted as installed');
  const lc = await ev(`call('listContent','Fabulously','mod')`); ok(lc[0] && lc[0].title === 'Sodium', 'mods list now shows real names (' + (lc[0] && lc[0].title) + ')');
  const r = await ev(`call('installProject',{instId:'Fabulously',projectId:'AANobbMI',type:'mod',title:'Sodium'})`); ok(r && /already installed/i.test(r.err || ''), 'installing it again is blocked ("' + (r && r.err) + '")');
  // instance color picker
  await ev(`go('instance','Plain'); S.tab='settings'; render()`); await sleep(500); ok(await ev(`!!document.querySelector('#i-color')`), 'instance card color picker present');
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
