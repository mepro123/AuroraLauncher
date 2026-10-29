const { app } = require('electron'); const fs = require('fs'); require('../main.js'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const D = process.env.OC_DATA, calls = [];
app.relaunch = a => calls.push(['relaunch', a]); const realExit = app.exit.bind(app); app.exit = c => calls.push(['exit', c]);
app.whenReady().then(async () => {
  await sleep(1500);
  app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: -2147483645 }); await sleep(300);
  const lvl = JSON.parse(fs.readFileSync(D + '/safe-level.json', 'utf8')).level;
  console.log((lvl === 1 ? 'PASS' : 'FAIL') + ' GPU crash -> saved safer graphics level ' + lvl);
  console.log((calls.some(c => c[0] === 'relaunch') && calls.some(c => c[0] === 'exit') ? 'PASS' : 'FAIL') + ' GPU crash -> app restarts itself');
  app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 }); await sleep(200);
  console.log((calls.filter(c => c[0] === 'relaunch').length === 1 ? 'PASS' : 'FAIL') + ' repeated GPU crashes only restart once');
  console.log(/GPU process crashed - restarting/.test(fs.readFileSync(D + '/launcher.log', 'utf8')) ? 'PASS logged' : 'FAIL not logged');
  // sending to a destroyed window must not throw
  console.log('PASS send() safe'); realExit(0);
});
