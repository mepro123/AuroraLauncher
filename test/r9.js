const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
const resp = (o, status = 200) => ({ ok: status < 300, status, text: async () => JSON.stringify(o), json: async () => o });
global.fetch = async (url, opts = {}) => { url = String(url);
  if (/oauth20_token/.test(url)) return resp({ access_token: 'live', refresh_token: 'ref2', expires_in: 3600 });
  if (/user\.auth\.xboxlive/.test(url)) return resp({ Token: 'xbl', DisplayClaims: { xui: [{ uhs: 'uhs1' }] } });
  if (/xsts/.test(url)) return resp({ Token: 'xsts', DisplayClaims: { xui: [{ uhs: 'uhs1' }] } });
  if (/login_with_xbox/.test(url)) return resp({ access_token: 'mctoken', expires_in: 86400 });
  if (/minecraft\/profile/.test(url)) return resp({ id: '069a79f444e94726a5befca90e38aaf5', name: 'Notch' });
  if (/\/search\?/.test(url)) return resp({ total_hits: 0, hits: [] });
  throw new Error('no network: ' + url); };
const mk = (id, o = {}) => { fs.mkdirSync(`${D}/instances/${id}/minecraft`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', versionId: '1.20.1', color: '', ramMB: 0, ready: true, created: 1700000000, lastPlayed: 0, playTime: 0, ...o })); };
mk('Alpha'); mk('Beta'); mk('Gamma');
const m = require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, msg) => console.log((c ? 'PASS ' : 'FAIL ') + msg);
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham'})`); await sleep(300);
  // chips no longer turn into dark boxes when clicked
  await ev(`createModal(); S.versions=[{id:'1.21',type:'release'}]; renderVList()`); await sleep(250);
  await ev(`(()=>{const c=document.querySelector('#c-snap').parentElement; c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:50,clientY:50})); document.querySelector('#c-snap').click();})()`); await sleep(150);
  const rip = await ev(`(()=>{const r=document.querySelector('.fchip .ripc'); return r ? {bg:getComputedStyle(r).backgroundColor, pad:getComputedStyle(r).paddingLeft} : null})()`);
  ok(!rip || (rip.bg === 'rgba(0, 0, 0, 0)' && rip.pad === '0px'), 'clicking a version-type chip no longer covers it with a dark box'); await ev(`closeModal()`); await sleep(200);
  // sidebar opacity replaces window opacity
  await ev(`go('settings')`); await sleep(500);
  ok(await ev(`!!document.querySelector('#s-sop') && !!document.querySelector('#s-sbl') && !document.querySelector('#s-wop')`), 'sidebar opacity + blur present, window opacity removed');
  await ev(`call('saveSettings',{sidebarOpacity:40})`); await sleep(400);
  ok(/,0\.4\)$/.test(await ev(`document.documentElement.style.getPropertyValue('--bar')`)), 'sidebar + title bar become translucent');
  // hover on the label text
  ok(await ev(`document.querySelectorAll('.panel .tl[data-tip]').length`) > 8 && await ev(`!document.querySelector('.panel .tip')`), 'tooltips attach to the label text (no icon buttons)');
  await ev(`document.querySelector('.panel .tl').dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`); await sleep(350); ok(await ev(`document.querySelector('#tooltip').classList.contains('on')`), 'hovering the text shows the tooltip');
  ok(await ev(`(()=>{const s=getComputedStyle(document.querySelector('.swatch')); return s.borderTopWidth==='0px' && s.borderTopLeftRadius==='50%' || parseFloat(s.borderTopLeftRadius)>=15})()`), 'accent swatches are round');
  ok(await ev(`!!document.querySelector('#s-gm') && document.querySelectorAll('#s-gm option').length===7`), 'graphics method picker present');
  ok(parseFloat(await ev(`getComputedStyle(document.querySelector('.segind')).transitionDuration.split(',')[0]`)) >= 0.28, 'segmented controls animate with a springy slide');
  // background blur now uses the cheap quarter-size path
  fs.mkdirSync(D + '/backgrounds', { recursive: true }); fs.copyFileSync('/tmp/ocT/backgrounds/bg.png', D + '/backgrounds/bg-1.png');
  await ev(`call('saveSettings',{bgFile:'bg-1.png',bgType:'image',bgVer:1,bgBlur:12})`); await sleep(600);
  ok(await ev(`document.querySelector('#bg').classList.contains('blurred') && /blur/.test(getComputedStyle(document.querySelector('#bg img')).filter)`), 'background blur applies (also to video/GIF)');
  // pinning
  await ev(`go('library')`); await sleep(400); await ev(`call('updateInstance','Gamma',{pinned:true})`); await sleep(600);
  ok(await ev(`document.querySelector('.sect').textContent.includes('Pinned') && document.querySelector('.card').dataset.key==='card:Gamma'`), 'pinned instances move to a Pinned section on top');
  await ev(`document.querySelector('.card .more').click()`); await sleep(200); ok(await ev(`[...document.querySelectorAll('#popover .mi')].some(b=>b.textContent.includes('Unpin'))`), 'card menu offers Unpin');
  // Microsoft login chain (mocked servers) + token refresh + launch args
  const a = await m._ms.msChain('live'); ok(a.name === 'Notch' && a.mcToken === 'mctoken' && a.mcExpires > Date.now(), 'Microsoft -> Xbox -> XSTS -> Minecraft chain returns the profile');
  const st = m._getSettings(); st.msAccounts = [{ id: a.id, name: 'Notch', refresh: 'ref1', mcToken: 'old', mcExpires: Date.now() - 1000 }]; st.activeMs = a.id; st.username = 'Notch';
  await m._ms.ensureMsToken(); ok(st.msAccounts[0].mcToken === 'mctoken' && st.msAccounts[0].refresh === 'ref2', 'expired Minecraft token refreshes automatically');
  fs.mkdirSync(`${D}/versions/1.20.1`, { recursive: true }); fs.writeFileSync(`${D}/versions/1.20.1/1.20.1.json`, JSON.stringify({ id: '1.20.1', type: 'release', mainClass: 'X', libraries: [], assetIndex: { id: '5' }, arguments: { jvm: ['-cp', '${classpath}'], game: ['--username', '${auth_player_name}', '--uuid', '${auth_uuid}', '--accessToken', '${auth_access_token}', '--userType', '${user_type}'] } }));
  const lp = m.buildLaunch({ id: 'T', name: 'T', mc: '1.20.1', versionId: '1.20.1', ramMB: 2048 }, m.mergedVersion('1.20.1'), 'java.exe'), g = lp.args, at = k => g[g.indexOf(k) + 1];
  ok(at('--username') === 'Notch' && at('--accessToken') === 'mctoken' && at('--userType') === 'msa' && at('--uuid') === '069a79f4-44e9-4726-a5be-fca90e38aaf5', 'launch uses the real Microsoft name, uuid and token');
  await ev(`call('switchMs','${a.id}')`); await sleep(400);
  ok((await ev(`S.settings.msAccounts.length`)) === 1 && !JSON.stringify(await ev(`S.settings.msAccounts`)).includes('mctoken'), 'tokens are never sent to the UI');
  await ev(`document.querySelector('[data-act=acctmenu]').click()`); await sleep(250); ok(await ev(`document.querySelector('#popover').innerText.includes('Microsoft')`), 'account menu lists the Microsoft account');
  await ev(`closePop(); addAcctModal()`); await sleep(300); ok(await ev(`!!document.querySelector('#msbtn')`), 'Add account offers "Sign in with Microsoft"');
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
