const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(D, { recursive: true }); fs.writeFileSync(D + '/gpu-status.json', JSON.stringify({ reason: 'GPU process crashed', exit: -2147483645, level: 0 }));
global.fetch = async url => {
  const j = o => ({ ok: true, status: 200, json: async () => o }); url = String(url);
  if (/\/project\/XYZ\/version/.test(url)) return j([{ id: 'v1', name: 'Release 1.0', version_number: '1.0.0', version_type: 'release', game_versions: ['1.20.1', '1.20'], loaders: ['fabric'], date_published: '2025-01-01T00:00:00Z', downloads: 1200 }, { id: 'v2', name: 'Beta', version_number: '1.1.0-beta', version_type: 'beta', game_versions: ['1.21'], loaders: ['fabric'], date_published: '2025-02-01T00:00:00Z', downloads: 50 }]);
  if (/\/project\/XYZ\/members/.test(url)) return j([{ role: 'Owner', user: { username: 'jelly' } }]);
  if (/\/project\/XYZ/.test(url)) return j({ id: 'XYZ', slug: 'xyz', project_type: 'mod', title: 'Test Mod', description: 'A test.', body: '# Big Title\n\nSome **bold** text and a [link](https://example.com).\n\n<script>window.__pwned=1</script><img src="javascript:alert(1)"><img src="https://example.com/a.png" width="40">\n\n- one\n- two\n\n```\ncode here\n```', icon_url: '', downloads: 12345, followers: 99, categories: ['utility'], loaders: ['fabric'], game_versions: ['1.20.1', '1.20', '1.19'], client_side: 'required', server_side: 'optional', license: { name: 'MIT' }, source_url: 'https://github.com/x/y', gallery: [{ url: 'https://example.com/g.png', title: 'Shot' }], updated: '2025-02-01T00:00:00Z' });
  if (/\/search\?/.test(url)) return j({ total_hits: 1, hits: [{ project_id: 'XYZ', slug: 'xyz', title: 'Test Mod', description: 'A test.', icon_url: '', author: 'jelly', project_type: 'mod', downloads: 12345, follows: 9, display_categories: ['utility'] }] });
  throw new Error('no network: ' + url);
};
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m); fs.mkdirSync('/tmp/shots9', { recursive: true });
  const shot = async n => { await sleep(500); fs.writeFileSync(`/tmp/shots9/${n}.png`, (await w.webContents.capturePage()).toPNG()); };
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham'})`); await sleep(300);
  // ---- top layout lives in the title bar
  await ev(`call('saveSettings',{sidebarPos:'top'})`); await sleep(600);
  ok(await ev(`document.querySelector('#side').parentElement.id`) === 'titlebar', 'top layout: nav is inside the title bar');
  const g = await ev(`(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();const s=[...document.querySelectorAll('.nav')].map(n=>n.getBoundingClientRect());return {brandR:r('.brand').right,acctL:r('#acct').left,firstL:s[0].left,lastR:s[s.length-1].right,mainTop:r('#main').top,sideH:r('#side').height,tb:r('#titlebar').height}})()`);
  ok(g.firstL > g.brandR && g.lastR < g.acctL, 'nav sits between the logo and the account button'); ok(g.mainTop <= 50, 'no separate nav row any more (content starts under the title bar)');
  await shot('1-top-titlebar');
  await ev(`call('saveSettings',{sidebarPos:'left'})`); await sleep(500); ok(await ev(`document.querySelector('#side').parentElement.id`) === 'body', 'back to left: sidebar returns to the side');
  // ---- sliding indicator on segmented control
  await ev(`go('discover')`); await sleep(500);
  ok(await ev(`!!document.querySelector('.seg .segind')`), 'segmented control has a sliding highlight');
  await ev(`document.querySelectorAll('.seg button')[2].click()`); await sleep(400);
  ok(await ev(`(()=>{const b=document.querySelectorAll('.seg button')[2], i=document.querySelector('.seg .segind');return Math.abs(new DOMMatrix(getComputedStyle(i).transform).m41-b.offsetLeft)<2})()`), 'highlight slid to the clicked option');
  // ---- custom dropdowns
  ok(await ev(`getComputedStyle(document.querySelector('#dsort')).display`) === 'none' && await ev(`!!document.querySelector('.dd-btn')`), 'native select replaced by custom dropdown');
  await ev(`document.querySelector('#dsort + .dd-btn').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await sleep(250);
  ok(await ev(`document.querySelectorAll('.ddm .ddi').length`) === 5 && await ev(`document.querySelector('.ddm').classList.contains('open')`), 'dropdown opens with animation class and all options'); await shot('2-dropdown');
  await ev(`document.querySelectorAll('.ddm .ddi')[1].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`); await sleep(300);
  ok(await ev(`S.disc.sort`) === 'downloads' && await ev(`!document.querySelector('.ddm')`), 'choosing an option applies it and closes the menu');
  // ---- exit animations
  await ev(`document.querySelector('[data-act=acctmenu]').click()`); await sleep(200); await ev(`closePop()`); ok(await ev(`!!document.querySelector('#popover .menu.leaving')`), 'popup menu plays an exit animation');
  await ev(`createModal()`); await sleep(250); await ev(`closeModal()`); ok(await ev(`document.querySelector('#modal').classList.contains('leaving')`), 'dialog plays an exit animation'); await sleep(300); ok(await ev(`!document.querySelector('#modal').classList.contains('on')`), 'dialog removed afterwards');
  // ---- project detail drawer
  await sleep(800); ok(await ev(`!!document.querySelector('.res')`), 'search results listed');
  await ev(`document.querySelector('.res').click()`); await sleep(900);
  ok(await ev(`document.querySelector('#drawer').classList.contains('on')`), 'clicking a result opens the detail drawer');
  ok(await ev(`!!document.querySelector('.md h1') && document.querySelector('.md h1').textContent==='Big Title'`), 'description markdown rendered');
  ok(await ev(`!window.__pwned && !document.querySelector('.md script') && ![...document.querySelectorAll('.md img')].some(i=>/javascript:/.test(i.getAttribute('src')||''))`), 'unsafe html/scripts stripped from descriptions');
  ok(await ev(`!!document.querySelector('.md a[href="https://example.com"]')`), 'links preserved (open externally)'); await shot('3-drawer');
  await ev(`document.querySelectorAll('.dr .tabs button')[2].click()`); await sleep(300); ok(await ev(`document.querySelectorAll('.dr .ver').length`) === 2, 'versions tab lists versions');
  await ev(`document.querySelectorAll('.dr .tabs button')[1].click()`); await sleep(300); ok(await ev(`document.querySelectorAll('.dr .gal figure').length`) === 1, 'gallery tab shows images');
  await ev(`document.querySelector('[data-act=closedetail]').click()`); await sleep(100); ok(await ev(`document.querySelector('#drawer').classList.contains('leaving')`), 'drawer slides out'); await sleep(350); ok(await ev(`!document.querySelector('#drawer').classList.contains('on')`), 'drawer closed');
  // ---- settings
  await ev(`go('settings')`); await sleep(500);
  ok(await ev(`!document.body.innerHTML.includes('while a game is running') && !!document.querySelector('#s-bgu')`), '"pause while a game runs" removed, "pause when not focused" kept');
  ok(await ev(`[...document.querySelectorAll('.tl')].some(t=>/Last attempt failed/.test(t.dataset.tip))`), 'hardware acceleration shows why it failed last time');
  await ev(`S.gfx={level:5,mode:'auto'}; applyTheme()`); ok(await ev(`document.querySelector('#app').classList.contains('lite')`), 'lite mode kicks in for software rendering');
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
