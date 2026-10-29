const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
global.fetch = async url => { const j = o => ({ ok: true, status: 200, json: async () => o }); if (/\/search\?/.test(String(url))) return j({ total_hits: 1, hits: [{ project_id: 'XYZ', slug: 'xyz', title: 'Test Mod', description: 'A test.', icon_url: '', author: 'jelly', project_type: 'mod', downloads: 1, follows: 1, display_categories: [] }] }); throw new Error('x'); };
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); await sleep(1400); await ev(`call('saveSettings',{username:'T'})`); await sleep(300);
  await ev(`call('saveSettings',{sidebarPos:'top'})`); await sleep(700);
  console.log('NAV', JSON.stringify(await ev(`(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();const s=[...document.querySelectorAll('.nav')].map(n=>n.getBoundingClientRect());return {brandR:r('.brand').right,acctL:r('#acct').left,firstL:s[0].left,lastR:s[s.length-1].right, sideL:r('#side').left, sideR:r('#side').right, parent:document.querySelector('#side').parentElement.id}})()`)));
  await ev(`go('discover')`); await sleep(500); await ev(`document.querySelectorAll('.seg button')[2].click()`); await sleep(500);
  await ev(`document.querySelector('#dsort + .dd-btn').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await sleep(250);
  console.log('DD open', await ev(`document.querySelectorAll('.ddm .ddi').length`));
  await ev(`document.querySelectorAll('.ddm .ddi')[1].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await sleep(400);
  console.log('SORT', await ev(`S.disc.sort`), 'selectVal', await ev(`document.querySelector('#dsort').value`), 'ddm', await ev(`document.querySelectorAll('.ddm').length`), 'btns', await ev(`document.querySelectorAll('#dsort + .dd-btn').length`));
} catch (e) { console.log('ERR', e.message); } app.quit(); }));
