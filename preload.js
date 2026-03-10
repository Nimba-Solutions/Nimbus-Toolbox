/**
 * @name         Nimbus Toolbox
 * @license      BSL 1.1 — See LICENSE.md
 * @description  Preload script — exposes IPC bridge to the renderer process.
 * @author       Cloud Nimbus LLC
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanTools: () => ipcRenderer.invoke('scan-tools'),
  getTools: () => ipcRenderer.invoke('get-tools'),
  getCatalog: () => ipcRenderer.invoke('get-catalog'),

  launchTool: (id) => ipcRenderer.invoke('launch-tool', id),
  openFolder: (id) => ipcRenderer.invoke('open-folder', id),
  openTerminal: (id) => ipcRenderer.invoke('open-terminal', id),
  installDeps: (id) => ipcRenderer.invoke('install-deps', id),
  buildTool: (id) => ipcRenderer.invoke('build-tool', id),
  cloneTool: (id) => ipcRenderer.invoke('clone-tool', id),
  openRepo: (url) => ipcRenderer.invoke('open-repo', url),

  getSystem: () => ipcRenderer.invoke('get-system'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  getScanPaths: () => ipcRenderer.invoke('get-scan-paths'),
  addScanPath: () => ipcRenderer.invoke('add-scan-path'),
  removeScanPath: (p) => ipcRenderer.invoke('remove-scan-path', p),
});
