const { app } = require('electron'); const fs = require('fs'); const D = process.env.OC_DATA, sleep = ms => new Promise(r => setTimeout(r, ms));
require('../main.js');
app.on('browser-window-created', (e, w) => w.webContents.on('did-finish-load', async () => { await sleep(900); console.log((fs.existsSync(D + '/.ui-ready') ? 'PASS' : 'FAIL') + ' app signals the launcher splash when the UI is ready'); app.quit(); }));
