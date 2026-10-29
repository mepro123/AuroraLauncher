const { app } = require('electron'); const fs = require('fs'); require('../main.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); await sleep(1200);
  await ev(`window.__L=[{id:1,title:'Install Sodium',label:'Installing Sodium',total:40,done:5,bytes:2e6,finished:false},{id:2,title:'Installing Survival',label:'Assets',total:0,done:0,bytes:1e5,finished:false}]; renderJobs(__L); document.querySelector('.job').__mark='same';`);
  await sleep(500); await ev(`__L[0].done=22; __L[0].bytes=9e6; renderJobs(__L)`); await sleep(500); await ev(`__L[0].done=30; __L[0].bytes=15e6; renderJobs(__L)`);
  const same = await ev(`document.querySelector('.job').__mark`); console.log((same === 'same' ? 'PASS' : 'FAIL') + ' job element persists across updates (no flashing)');
  console.log((await ev(`document.querySelector('.job .jn').textContent`)) + ' | ' + (await ev(`document.querySelector('.job .detail').textContent`)));
  await ev(`document.querySelector('.job').click()`); await sleep(500); console.log((await ev(`document.querySelector('.job').classList.contains('open')`) ? 'PASS' : 'FAIL') + ' click expands details');
  await ev(`document.querySelector('.job').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:100,clientY:900}))`); console.log((await ev(`!!document.querySelector('.job .ripple')`) ? 'PASS' : 'FAIL') + ' ripple on press');
  await ev(`__L[0].finished=true; renderJobs(__L)`); await sleep(400); fs.mkdirSync('/tmp/shots3', { recursive: true });
  fs.writeFileSync('/tmp/shots3/jobs.png', (await w.webContents.capturePage()).toPNG());
  await ev(`renderJobs([])`); await sleep(500); console.log((await ev(`document.querySelectorAll('.job').length`) === 0 ? 'PASS' : 'FAIL') + ' jobs removed when gone');
} catch (e) { console.log('HARNESS ERROR', e.message); } app.quit(); }));
