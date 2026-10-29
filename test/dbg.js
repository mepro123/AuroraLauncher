const { app } = require('electron'); require('../main.js'); const sleep = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); await sleep(1200);
  await ev(`go('settings')`); await sleep(400);
  console.log('page', await ev(`S.page`), 'ca-hex', await ev(`!!document.querySelector('#ca-hex')`), 'pc', await ev(`!!document.querySelector('#pc')`));
  await ev(`const e=document.querySelector('#pc'); e.value='#1a1030'; e.dispatchEvent(new Event('input',{bubbles:true}))`); await sleep(300);
  console.log('after input: page', await ev(`S.page`), 'ca-hex', await ev(`!!document.querySelector('#ca-hex')`), 'mainlen', await ev(`document.querySelector('#main').innerHTML.length`));
} catch (e) { console.log('ERR', e.message); } app.quit(); }));
