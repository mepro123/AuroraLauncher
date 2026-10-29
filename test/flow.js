const { app } = require('electron'); const fs = require('fs');
require('../main.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const shot = async n => { await sleep(400); fs.mkdirSync('/tmp/shots2', { recursive: true }); fs.writeFileSync(`/tmp/shots2/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
  await sleep(1500);
  ok(await ev(`!!document.querySelector('#acct [data-act=addacct]')`), 'top-right shows Add account when no account'); await shot('a-empty');
  // install with no instances
  await ev(`S.disc.type='mod'; S.disc.res={total:1,hits:[{id:'P7dR8mSH',title:'Fabric API',author:'x',desc:'d',icon:'',downloads:5,cats:['library']}]}; go('discover')`); await sleep(300);
  ok(await ev(`document.body.innerText.includes("don't have any instances")`), 'discover shows no-instance banner'); await shot('b-discover-noinst');
  await ev(`document.querySelector('[data-act=install]').click()`); await sleep(400);
  ok(await ev(`document.querySelector('#modal.on h2')?.textContent`) === 'Create instance', 'install w/o instance opens Create dialog'); await shot('c-create-auto');
  // create flow
  await ev(`S.versions=[{id:'1.21.1',type:'release'},{id:'1.20.1',type:'release'},{id:'24w01a',type:'snapshot'}]; renderVList()`); await sleep(200);
  ok(await ev(`S.cr.mc`) === '1.21.1' && await ev(`!document.querySelector('#c-ok').disabled`), 'latest release auto-selected, Create enabled'); await shot('d-create-ready');
  await ev(`document.querySelector('#c-name').value='Test World'; document.querySelector('[data-act=docreate]').click()`); await sleep(1500);
  ok(await ev(`S.instances.length`) === 1 && fs.existsSync(process.env.OC_DATA + '/instances/Test World/instance.json'), 'instance created on disk + in UI');
  ok(await ev(`document.querySelector('.card-title')?.textContent`) === 'Test World', 'card appears in library'); await shot('e-library');
  // install guard at API level
  const r = await ev(`window.oc.call('installProject',{instId:'nope',projectId:'x',type:'mod'})`); ok(r && r.err === 'no instance', 'API install with bad instance returns friendly error (no crash)');
  // play without account
  for (let i = 0; i < 30 && !(await ev(`!!document.querySelector('[data-act=play]')`)); i++) await sleep(500);
  await ev(`document.querySelector('[data-act=play]').click()`); await sleep(300);
  ok(await ev(`document.querySelector('#modal.on h2')?.textContent`) === 'Add your account', 'Play without account asks to add one'); await shot('f-addacct');
  await ev(`const i=document.querySelector('#na'); i.value='Tham'; i.dispatchEvent(new Event('input')); `); await sleep(300);
  await ev(`document.querySelector('#naok').click()`); await sleep(600);
  ok(await ev(`S.settings.username`) === 'Tham' && await ev(`document.querySelector('#acct .pill b')?.textContent`) === 'Tham', 'account added and shown top-right'); await shot('g-account');
  } catch (e) { console.log('HARNESS ERROR', e.message); } app.quit();
}));
