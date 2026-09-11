const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jrz", {
  checkKey: (key) => ipcRenderer.invoke("auth:check", key),
  generateKey: (owner) => ipcRenderer.invoke("auth:generateKey", owner),
  authSuccess: () => ipcRenderer.invoke("auth:success"),
  getSlots: () => ipcRenderer.invoke("slots:get"),
  pickFiles: (multi) => ipcRenderer.invoke("files:pick", { multi }),
  buildExport: (payload) => ipcRenderer.invoke("export:build", payload),
  showInFolder: (p) => ipcRenderer.invoke("shell:showInFolder", p)
});
