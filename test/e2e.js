// run: node test/e2e.js <electron-app-path>  (starts electron headless with a fake java, drives the UI over CDP)
const { spawn, execSync } = require('child_process'); const fs = require('fs');
const D = '/tmp/ocdata3'; fs.rmSync(D, { recursive: true, force: true });
const w = (p, c) => { fs.mkdirSync(require('path').dirname(D + '/' + p), { recursive: true }); fs.writeFileSync(D + '/' + p, c); };
w('fakejava/bin/java.exe', '#!/bin/bash\necho "FAKE JAVA STARTED"\necho "ARGS: $@" | head -c 500\necho\necho "[main/ERROR]: test error line"\nsleep 1\nexit 0\n'); fs.chmodSync(D + '/fakejava/bin/java.exe', 0o755);
const vj = { id: '1.20.1', type: 'release', mainClass: 'net.minecraft.client.main.Main', assetIndex: { id: '5' }, javaVersion: { majorVersion: 17 }, libraries: [{ name: 'org.lwjgl:lwjgl:3.3.1', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1.jar', url: 'u' } } }], arguments: { jvm: ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}'], game: ['--username', '${auth_player_name}', '--version', '${version_name}'] } };
w('versions/1.20.1/1.20.1.json', JSON.stringify(vj)); w('versions/1.20.1/1.20.1.jar', 'x'); w('libraries/org/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1.jar', 'x'); w('assets/indexes/5.json', '{"objects":{}}');
w('instances/T/instance.json', JSON.stringify({ id: 'T', name: 'T', mc: '1.20.1', loader: 'vanilla', versionId: '1.20.1', ready: true, javaPath: D + '/fakejava/bin/java.exe', ramMB: 0, created: 1, lastPlayed: 0, playTime: 0 }));
w('instances/Bad/instance.json', JSON.stringify({ id: 'Bad', name: 'Bad', mc: '9.9.9', loader: 'vanilla', versionId: '', ready: false, created: 2, lastPlayed: 0, playTime: 0 }));
const app = process.argv[2] || '.';
const p = spawn('xvfb-run', ['-a', '-s', '-screen 0 1400x900x24', 'node_modules/.bin/electron', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', app], { env: { ...process.env, OC_DATA: D }, stdio: ['ignore', 'pipe', 'pipe'] });
let err = ''; p.stderr.on('data', d => err += d); p.stdout.on('data', d => err += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs; for (let i = 0; i < 40; i++) { await sleep(500); try { tabs = await (await fetch('http://127.0.0.1:9333/json')).json(); if (tabs.find(t => t.type === 'page')) break; } catch {} }
  const t = tabs.find(t => t.type === 'page'); const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; ws.onmessage = m => { const j = JSON.parse(m.data); if (pend[j.id]) pend[j.id](j); };
  const ev = expr => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); }).then(j => j.result.result.value ?? j.result.exceptionDetails?.exception?.description);
  await sleep(1500);
  console.log('title/state:', await ev('document.title + " | instances=" + S.instances.length + " | page=" + S.page'));
  console.log('launch T ->', await ev("call('launch','T')")); await sleep(2500);
  console.log('console T:\n' + (await ev("call('console','T')")).join('\n').slice(0, 900));
  console.log('launch Bad (offline) ->', await ev("call('launch','Bad')")); await sleep(500);
  console.log('console Bad:', JSON.stringify(await ev("call('console','Bad')")));
  console.log('launcher log tail:', JSON.stringify((await ev("call('launcherLog')")).slice(-4)));
  await ev("go('console')"); await sleep(400); console.log('console page rendered:', await ev("document.querySelector('#con') ? document.querySelector('#con').innerText.slice(0,120) : 'NO #con'"));
  p.kill(); execSync('pkill -f electron || true'); if (/Error|error/.test(err.replace(/dbus|DBus|gpu|libva/gi, ''))) console.log('stderr hints:', err.split('\n').filter(l => /rror/.test(l) && !/dbus|gpu|libva|Gtk|GLib/i.test(l)).slice(0, 5).join('\n'));
  process.exit(0);
})();
