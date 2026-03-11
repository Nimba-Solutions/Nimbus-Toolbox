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
  launchToolAdmin: (id) => ipcRenderer.invoke('launch-tool-admin', id),
  openFolder: (id) => ipcRenderer.invoke('open-folder', id),
  openTerminal: (id) => ipcRenderer.invoke('open-terminal', id),
  installDeps: (id) => ipcRenderer.invoke('install-deps', id),
  buildTool: (id) => ipcRenderer.invoke('build-tool', id),
  cloneTool: (id) => ipcRenderer.invoke('clone-tool', id),
  openRepo: (url) => ipcRenderer.invoke('open-repo', url),

  updateTool: (id) => ipcRenderer.invoke('update-tool', id),
  updateAll: () => ipcRenderer.invoke('update-all'),

  getSystem: () => ipcRenderer.invoke('get-system'),
  getUsage: () => ipcRenderer.invoke('get-usage'),
  resetUsage: (id) => ipcRenderer.invoke('reset-usage', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  checkSelfUpdate: () => ipcRenderer.invoke('check-self-update'),
  selfUpdate: () => ipcRenderer.invoke('self-update'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  onSelfUpdateAvailable: (cb) => ipcRenderer.on('self-update-available', (_, behind) => cb(behind)),

  getScanPaths: () => ipcRenderer.invoke('get-scan-paths'),
  addScanPath: () => ipcRenderer.invoke('add-scan-path'),
  removeScanPath: (p) => ipcRenderer.invoke('remove-scan-path', p),
});
