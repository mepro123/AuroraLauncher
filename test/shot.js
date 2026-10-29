const { app } = require('electron'); const fs = require('fs'), path = require('path');
const D = process.env.OC_DATA; fs.mkdirSync(D + '/instances', { recursive: true });
const mk = (id, o) => { fs.mkdirSync(`${D}/instances/${id}/minecraft/mods`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc: '1.20.1', loader: 'fabric', loaderVer: '0.15.11', versionId: '', ramMB: 0, javaPath: '', jvmArgs: '', width: 0, height: 0, fullscreen: false, ready: false, created: 1700000000, lastPlayed: Date.now() / 1000 - 7200, playTime: 11500, ...o })); };
mk('Survival Fabric', {}); mk('Create Modpack', { mc: '1.20.1', loader: 'neoforge', lastPlayed: 0, playTime: 0 }); mk('Vanilla 1.8.9', { mc: '1.8.9', loader: 'vanilla', playTime: 90000 }); mk('PvP Client', { mc: '1.21.1', loader: 'quilt' });
fs.writeFileSync(`${D}/instances/Survival Fabric/content.json`, JSON.stringify({ 'sodium.jar': { title: 'Sodium', version: '0.5.8', project_id: 'AANobbMI', icon: '' }, 'lithium.jar': { title: 'Lithium', version: '0.11.2', project_id: 'x' } }));
fs.writeFileSync(`${D}/instances/Survival Fabric/minecraft/mods/sodium.jar`, 'x'.repeat(900000)); fs.writeFileSync(`${D}/instances/Survival Fabric/minecraft/mods/lithium.jar.disabled`, 'x'.repeat(400000));
require('../main.js');
app.on('browser-window-created', (e, w) => {
  w.webContents.on('did-finish-load', async () => {
    const ev = s => w.webContents.executeJavaScript(s); const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shot = async n => { await sleep(500); const img = await w.webContents.capturePage(); fs.writeFileSync(`/tmp/shots/${n}.png`, img.toPNG()); };
    fs.mkdirSync('/tmp/shots', { recursive: true }); await sleep(1200);
    await ev(`S.versions=[...Array(30)].map((_,i)=>({id:'1.'+(21-(i/3|0))+'.'+(i%3),type:'release'}));`);
    await shot('1-library');
    await ev(`document.querySelector('[data-act=acctmenu]').click()`); await shot('2-account');
    await ev(`document.body.click(); S.settings.accounts=['Player','Tham','Steve']; renderTop(); document.querySelector('[data-act=acctmenu]').click()`); await shot('2b-account3');
    await ev(`document.body.click(); document.querySelector('[data-act=addacct]')?.click()`); await shot('3-addacct');
    await ev(`closeModal(); closePop(); go('instance','Survival Fabric')`); await sleep(400); await shot('4-instance');
    await ev(`S.tab='settings'; render()`); await shot('5-instsettings');
    await ev(`S.tab='console'; render()`); await shot('5b-console');
    const svg = c => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68"><rect width="68" height="68" fill="${c}"/><circle cx="34" cy="34" r="16" fill="white" opacity=".8"/></svg>`);
    await ev(`S.disc.res={total:312,hits:[{id:'a',title:'Sodium',author:'jellysquid3',desc:'The fastest and most compatible rendering optimization mod for Minecraft. Now available for both NeoForge and Fabric.',icon:'${svg('#3b82f6')}',downloads:41200000,cats:['optimization','fabric']},{id:'b',title:'Iris Shaders',author:'coderbot',desc:'A modern shaders mod compatible with existing OptiFine shader packs',icon:'${svg('#a855f7')}',downloads:28100000,cats:['decoration']},{id:'c',title:'Lithium',author:'jellysquid3',desc:'No-compromises game logic optimization mod.',icon:'',downloads:30500000,cats:['optimization']}]};S.disc.installed=new Set(['b']);S.disc.target='Survival Fabric';S.disc.mc='1.20.1';S.disc.loader='fabric';go('discover');S.disc.res&&renderResults()`); await shot('6-discover');
    await ev(`go('settings')`); await shot('7-settings');
    await ev(`go('library'); createModal(); S.cr.mc='1.20.1'; renderVList()`); await shot('8-create');
    await ev(`closeModal(); window.oc.on&&0; renderJobs([{id:1,title:'Installing Survival Fabric',label:'Assets',total:3200,done:1480,bytes:61e6,finished:false},{id:2,title:'Install Sodium',label:'Installing Sodium',total:0,done:0,bytes:2e5,finished:false}]); toast('Sodium installed!'); toast('Launch failed: No Java found',true)`); await shot('9-jobs');
    await ev(`closeModal(); go('console')`); await shot('10-console');
    app.quit();
  });
});
