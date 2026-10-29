const { app } = require('electron'); const fs = require('fs'), path = require('path'), assert = require('assert');
const D = process.env.OC_DATA; const m = require('../main.js');
app.whenReady().then(() => {
  const W = (id, j) => { fs.mkdirSync(`${D}/versions/${id}`, { recursive: true }); fs.writeFileSync(`${D}/versions/${id}/${id}.json`, JSON.stringify(j)); };
  W('1.20.1', { id: '1.20.1', type: 'release', mainClass: 'net.minecraft.client.main.Main', assetIndex: { id: '5' }, javaVersion: { majorVersion: 17 },
    libraries: [{ name: 'org.lwjgl:lwjgl:3.3.1', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1.jar', url: 'u', size: 1 } } },
      { name: 'org.lwjgl:lwjgl:3.3.1:natives-windows', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1-natives-windows.jar', url: 'u' } }, rules: [{ action: 'allow', os: { name: 'windows' } }] },
      { name: 'org.lwjgl:lwjgl:3.3.1:natives-windows-arm64', downloads: { artifact: { path: 'x/arm64.jar', url: 'u' } } },
      { name: 'org.lwjgl:lwjgl:3.3.1:natives-linux', downloads: { artifact: { path: 'x/linux.jar', url: 'u' } }, rules: [{ action: 'allow', os: { name: 'linux' } }] }],
    arguments: { jvm: ['-Djava.library.path=${natives_directory}', { rules: [{ action: 'allow', os: { name: 'osx' } }], value: '-XstartOnFirstThread' }, '-cp', '${classpath}'],
      game: ['--username', '${auth_player_name}', '--version', '${version_name}', '--gameDir', '${game_directory}', '--uuid', '${auth_uuid}', { rules: [{ action: 'allow', features: { has_custom_resolution: true } }], value: ['--width', '${resolution_width}', '--height', '${resolution_height}'] }, { rules: [{ action: 'allow', features: { is_demo_user: true } }], value: '--demo' }] } });
  W('fabric-loader-0.15.11-1.20.1', { id: 'fabric-loader-0.15.11-1.20.1', inheritsFrom: '1.20.1', mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient', libraries: [{ name: 'net.fabricmc:fabric-loader:0.15.11', url: 'https://maven.fabricmc.net/' }, { name: 'org.lwjgl:lwjgl:3.3.3' }], arguments: { game: [], jvm: ['-DFabricMcEmu= net.minecraft.client.main.Main '] } });
  const mv = m.mergedVersion('fabric-loader-0.15.11-1.20.1');
  assert.equal(mv.mainClass, 'net.fabricmc.loader.impl.launch.knot.KnotClient'); assert.equal(mv._jarId, '1.20.1');
  const libs = m.collectLibs(mv); const paths = libs.map(l => l.path);
  assert(paths.includes('net/fabricmc/fabric-loader/0.15.11/fabric-loader-0.15.11.jar')); assert(libs.find(l => l.path.includes('fabric-loader')).url === 'https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.15.11/fabric-loader-0.15.11.jar');
  assert(!paths.some(p => p.includes('arm64') || p.includes('linux')), 'foreign natives filtered'); assert(libs.filter(l => l.path.includes('lwjgl-3.3')).length === 2, 'child lwjgl 3.3.3 dedupes parent'.length ? true : true);
  assert(libs.find(l => l.path.includes('natives-windows')).native);
  const inst = { id: 'T', name: 'T', mc: '1.20.1', versionId: 'fabric-loader-0.15.11-1.20.1', ramMB: 3072, width: 0, height: 0, fullscreen: false };
  m._setSettings({ username: 'Tham', ramMB: 4096, optimizedFlags: true, jvmArgs: '-Dfoo=1' });
  let lp = m.buildLaunch(inst, mv, 'java.exe'); const a = lp.args;
  assert(a.includes('-Xmx3072M')); assert(a.includes('-Dfoo=1')); assert(a.includes('-XX:+UseG1GC')); assert(!a.includes('-XstartOnFirstThread')); assert(!a.includes('--demo')); assert(!a.includes('--width'));
  const mi = a.indexOf('net.fabricmc.loader.impl.launch.knot.KnotClient'); assert(mi > 0); assert.equal(a[a.indexOf('--username') + 1], 'Tham'); assert(a.indexOf('-cp') < mi && a.indexOf('--username') > mi);
  assert.equal(a[a.indexOf('--uuid') + 1], m.offlineUuid('Tham')); assert.equal(m.offlineUuid('Notch').length, 36);
  lp = m.buildLaunch({ ...inst, width: 1280, height: 720 }, mv, 'java.exe'); assert.equal(lp.args[lp.args.indexOf('--width') + 1], '1280');
  const cp = a[a.indexOf('-cp') + 1]; assert(cp.endsWith('1.20.1.jar') && cp.includes('lwjgl-3.3.3.jar') && !cp.includes('lwjgl-3.3.1.jar') && cp.includes('natives-windows.jar'));
  console.log('ENGINE TESTS PASSED'); console.log('uuid(Tham)=', m.offlineUuid('Tham')); console.log(a.join(' ').slice(0, 400)); app.quit();
}).catch(e => { console.error('FAIL', e.stack); process.exit(1); });
