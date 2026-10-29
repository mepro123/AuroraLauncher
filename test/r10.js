const { app } = require('electron'); const fs = require('fs'), zlib = require('zlib'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
const png = (w, h) => { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = x * 4; raw[o + 1] = y * 4; raw[o + 2] = 120; raw[o + 3] = 255; } }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const ch = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]); };
const resp = (o, st = 200) => ({ ok: st < 300, status: st, text: async () => JSON.stringify(o), json: async () => o });
global.fetch = async (url, o = {}) => { url = String(url); if (/profile\/skins$/.test(url) && o.method === 'POST') return resp({ skins: [{ state: 'ACTIVE', url: 'https://textures.minecraft.net/x', variant: 'SLIM' }] }); if (/\/search\?/.test(url)) return resp({ total_hits: 0, hits: [] }); throw new Error('no network'); };
const mk = (id, mc = '1.20.1') => { fs.mkdirSync(`${D}/instances/${id}/minecraft/resourcepacks`, { recursive: true }); fs.writeFileSync(`${D}/instances/${id}/instance.json`, JSON.stringify({ id, name: id, mc, loader: 'vanilla', versionId: mc, color: '', ramMB: 0, ready: true, created: 1700000000, lastPlayed: Date.now() / 1000 - 60, playTime: 100 })); };
mk('Modern'); mk('Old', '1.8.9'); fs.writeFileSync(`${D}/instances/Modern/minecraft/options.txt`, 'lang:en_us\nresourcePacks:["vanilla","file/Other.zip"]\n');
const m = require('../main.js'); const inst = id => JSON.parse(fs.readFileSync(`${D}/instances/${id}/instance.json`, 'utf8'));
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { try {
  const ev = s => w.webContents.executeJavaScript(s); const ok = (c, msg) => console.log((c ? 'PASS ' : 'FAIL ') + msg);
  await sleep(1400); await ev(`call('saveSettings',{username:'Tham'})`); await sleep(300);
  // logo
  ok(await ev(`(()=>{const i=document.querySelector('.brand img.logo');return !!i && i.complete && i.naturalWidth>0})()`), 'new logo shows in the title bar');
  ok(await ev(`getComputedStyle(document.querySelector('.tl')||document.body).textDecorationLine`).then(v => v === 'none'), 'no dotted underline on tooltip text');
  // skin file checks + resource pack for offline accounts
  const sk = m._skins; let bad = ''; try { sk.savePng(png(32, 32)); } catch (e) { bad = e.message; } ok(/64/.test(bad), 'wrong-size skins are rejected with a clear message');
  const id = sk.savePng(png(64, 64)); ok(!!id, 'valid 64x64 skin is saved to the library');
  ok(sk.packFormat('1.20.1') === 15 && sk.packFormat('1.21.4') === 46 && sk.packFormat('1.12.2') === 3, 'resource pack format matches the Minecraft version');
  const st = m._getSettings(); st.username = 'Tham'; st.activeMs = ''; st.skins = { Tham: { id, model: 'classic' } };
  sk.applySkinPack(inst('Modern')); const AdmZip = require('adm-zip'), z = new AdmZip(`${D}/instances/Modern/minecraft/resourcepacks/OfflineCraft-Skin.zip`);
  ok(z.getEntry('pack.mcmeta') && z.getEntry('assets/minecraft/textures/entity/player/wide/steve.png') && z.getEntry('assets/minecraft/textures/entity/alex.png'), 'offline skin pack contains the skin for every default player model');
  const o1 = fs.readFileSync(`${D}/instances/Modern/minecraft/options.txt`, 'utf8'); ok(/resourcePacks:\["vanilla","file\/Other\.zip","file\/OfflineCraft-Skin\.zip"\]/.test(o1) && /lang:en_us/.test(o1), 'pack enabled on top, other options untouched');
  sk.applySkinPack(inst('Old')); ok(/resourcePacks:\["vanilla","OfflineCraft-Skin\.zip"\]/.test(fs.readFileSync(`${D}/instances/Old/minecraft/options.txt`, 'utf8')), 'old versions (1.8.9) use the legacy pack name');
  st.activeMs = 'x'; sk.applySkinPack(inst('Modern')); ok(!fs.existsSync(`${D}/instances/Modern/minecraft/resourcepacks/OfflineCraft-Skin.zip`) && !/OfflineCraft-Skin/.test(fs.readFileSync(`${D}/instances/Modern/minecraft/options.txt`, 'utf8')), 'switching to a Microsoft account removes the offline skin pack'); st.activeMs = '';
  // skins page + avatar
  await ev(`call('applySkin',{id:'${id}',model:'slim'})`); await sleep(500); await ev(`go('skins')`); await sleep(700);
  ok(await ev(`!!document.querySelector('.avatar.face')`), 'account avatar shows the skin face'); ok(await ev(`!!document.querySelector('#skincv') && document.querySelectorAll('.skin-th').length>=1`), 'Skins page shows preview + library');
  ok(await ev(`(()=>{const c=document.querySelector('#skincv').getContext('2d').getImageData(8,4,1,1).data;return c[3]>0})()`), 'skin preview is drawn on the canvas');
  ok(await ev(`!!document.querySelector('.nav[data-p=skins]')`), 'Skins entry in the sidebar');
  // Microsoft skin upload (mocked Mojang)
  st.msAccounts = [{ id: 'abc', name: 'Notch', refresh: 'r', mcToken: 'tok', mcExpires: Date.now() + 3600000 }]; st.activeMs = 'abc'; st.username = 'Notch';
  const r = await ev(`call('applySkin',{id:'${id}',model:'slim'})`); ok(r.ok && r.online && st.msAccounts[0].skinUrl === 'https://textures.minecraft.net/x' && st.msAccounts[0].skinModel === 'slim', 'online skin upload updates the Microsoft account'); st.activeMs = ''; st.username = 'Tham'; await ev(`call('saveSettings',{username:'Tham',activeMs:''})`); await sleep(300);
  // sidebar drag bug
  await ev(`go('library')`); await sleep(500);
  await ev(`(()=>{const n=document.querySelectorAll('.nav')[1]; n.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0})); })()`); ok(await ev(`document.querySelector('.nav.on').dataset.p`) === 'discover', 'pressing highlights instantly');
  await ev(`document.body.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))`); await sleep(100); ok(await ev(`document.querySelector('.nav.on').dataset.p`) === 'library', 'dragging off the button restores the real page highlight');
  // stray bar in the detail drawer
  await ev(`S.detail={id:'x',hit:{title:'T',desc:'d',downloads:1},data:null,tab:'desc'}; const r=document.querySelector('#drawer'); r.innerHTML='<div class="dr-back"></div><aside class="dr"></aside>'; r.classList.add('on'); renderDrawer();`); await sleep(200);
  await ev(`S.detail.data={project:{id:'x',slug:'x',type:'mod',title:'T',description:'d',body:'hi',icon:'',downloads:1,followers:1,categories:[],loaders:[],versions:[],gallery:[],source:'https://a.b',updated:'2025-01-01'},versions:[],members:[]}; renderDrawer();`); await sleep(400);
  ok(await ev(`[...document.querySelectorAll('.segind')].every(i=>i.parentElement.matches('.seg,.tabs')) && getComputedStyle(document.querySelector('.dr .tabs .segind')).height==='2px'`), 'no stray highlight bar in the detail panel');
} catch (e) { console.log('HARNESS ERROR', e.stack); } app.quit(); }));
