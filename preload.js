const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('oc', {
  call: (n, ...a) => ipcRenderer.invoke('oc', n, ...a),
  on: (ch, cb) => ipcRenderer.on(ch, (e, d) => cb(d)),
});
