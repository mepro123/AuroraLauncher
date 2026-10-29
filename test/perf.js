const { app } = require('electron'); const fs = require('fs'); require('../main.js');
const D = process.env.OC_DATA; const sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = (id) => { fs.mkdirSync(`${D}/instances/${id}/minecraft`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', loaderVer: '', versionId: '', ramMB: 0, javaPath: '', jvmArgs: '', width: 0, height: 0, fullscreen: false, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 3600, playTime: 7300 })); };
mk('Survival'); mk('Pack');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); fs.mkdirSync('/tmp/shots5', { recursive: true });
  const shot = async n => { await sleep(500); fs.writeFileSync(`/tmp/shots5/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  const set = async o => { await ev(`window.oc.call('saveSettings', ${JSON.stringify(o)})`); await sleep(350); };
  const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
  await sleep(1300); await ev(`call('saveSettings',{username:'Tham'})`); await sleep(300);
  // sidebar indicator
  const pos = () => ev(`(()=>{const i=document.querySelector('#navind'),n=document.querySelector('.nav.on'),a=i.getBoundingClientRect(),b=n.getBoundingClientRect();return {dx:Math.abs(a.left-b.left),dy:Math.abs(a.top-b.top),w:Math.abs(a.width-b.width),anim:getComputedStyle(i).transitionDuration}})()`);
  let p = await pos(); ok(p.dx < 2 && p.dy < 2 && p.w < 2, 'indicator sits on active item (Library)');
  await ev(`go('discover')`); await sleep(500); p = await pos(); ok(p.dx < 2 && p.dy < 2, 'indicator slid to Discover'); ok(parseFloat(p.anim) > 0, 'indicator has transition');
  ok(await ev(`document.querySelector('#main').classList.contains('pg')`), 'page transition class applied');
  await ev(`go('settings')`); await sleep(500); p = await pos(); ok(p.dy < 2 && p.dx < 2, 'indicator slid to Settings (bottom)');
  await set({ sidebarPos: 'top' }); await sleep(400); p = await pos(); ok(p.dx < 3 && p.dy < 3, 'indicator follows when sidebar moves to top');
  await set({ sidebarPos: 'left', sidebarLabels: false }); await sleep(600); p = await pos(); ok(p.dx < 3 && p.dy < 3, 'indicator follows icons-only mode');
  await set({ sidebarLabels: true });
  // colors
  await ev(`(()=>{const e=document.querySelector('#pc'); e.value='#1a1030'; e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  ok((await ev(`getComputedStyle(document.documentElement).getPropertyValue('--panel')`)).includes('26,16,48'), 'panel color applies live');
  await ev(`(()=>{const e=document.querySelector('#ca-hex'); e.value='ff00aa'; e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(400);
  ok(await ev(`S.settings.accentA`) === '#ff00aa' && (await ev(`getComputedStyle(document.documentElement).getPropertyValue('--a').trim()`)) === '255,0,170', 'hex accent input works');
  await ev(`document.querySelector('#main').scrollTop=0`); await shot('1-settings-colors');
  await set({ panelColor: '#12151c', accentA: '#34d399' });
  // animations toggle
  await set({ animations: false }); ok(await ev(`document.querySelector('#app').classList.contains('noanim')`), 'animations can be turned off'); await set({ animations: true });
  // bg pause for GIF (freeze to canvas) – png renamed .gif is fine for the test
  fs.mkdirSync(D + '/backgrounds', { recursive: true }); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg.gif');
  await set({ bgFile: 'bg.gif', bgType: 'image', bgVer: 5 }); await sleep(600); await ev(`go('library')`);
  await ev(`document.hasFocus=()=>false; updateBgPlayback()`); await sleep(200);
  ok(await ev(`!!document.querySelector('#bg canvas') && !document.querySelector('#bg img')`), 'GIF background freezes to a still frame when the launcher loses focus');
  await ev(`document.hasFocus=()=>true; updateBgPlayback()`); await sleep(300);
  ok(await ev(`!!document.querySelector('#bg img') && !document.querySelector('#bg canvas')`), 'GIF resumes when the launcher is focused again');
  // console batching + DOM cap
  await ev(`S.page='console'; S.conSrc='launcher'; render(); `); await sleep(300);
  await ev(`pushCon(Array.from({length:4000},(_,i)=>'line '+i))`);
  ok(await ev(`document.querySelectorAll('#con > div').length`) <= 2500, 'console DOM capped at 2500 lines'); 
  // job bar transform
  await ev(`renderJobs([{id:9,title:'x',label:'y',total:10,done:5,bytes:1000,finished:false}])`); await sleep(100);
  ok((await ev(`getComputedStyle(document.querySelector('.bar i')).transform`)) !== 'none', 'progress bar uses transform');
  await ev(`renderJobs([])`);
  // graphics info API
  const g = await ev(`call('graphics')`); ok(g && g.level === 0 && g.mode === 'auto', 'graphics level 0 (hardware) by default');
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
