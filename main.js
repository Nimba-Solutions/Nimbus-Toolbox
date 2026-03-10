/**
 * @name         Nimbus Toolbox
 * @license      BSL 1.1 — See LICENSE.md
 * @description  Electron main process — launcher/manager for Cloud Nimbus desktop apps.
 * @author       Cloud Nimbus LLC
 */
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    tools: [],        // discovered/registered tools
    scanPaths: [],    // directories to scan for tools
    settings: {
      startMinimized: false,
      autoScan: true,
    },
  },
});

let mainWindow = null;
let tray = null;

// --- Known Cloud Nimbus tools (built-in catalog) ---

const CATALOG = [
  {
    id: 'bandwidth-governor',
    name: 'Bandwidth Governor',
    description: 'Rate-limit upload/download bandwidth per-app or globally via Windows QoS policies.',
    repo: 'https://github.com/Nimba-Solutions/Bandwidth-Governor',
    packageName: 'bandwidth-governor',
    color: '#22c55e',
    icon: 'BG',
    requiresAdmin: true,
    features: ['QoS policies', 'Per-app limiting', 'Speed test', 'System tray', 'Claude Code integration'],
  },
  {
    id: 'port-pilot',
    name: 'Port Pilot',
    description: 'Visual localhost port manager — see every listening port and kill with one click.',
    repo: 'https://github.com/Nimba-Solutions/Port-Pilot',
    packageName: 'port-pilot',
    color: '#3b82f6',
    icon: 'PP',
    requiresAdmin: false,
    features: ['Port scanning', 'Process identification', 'One-click kill', 'Smart hints', 'Search & filter'],
  },
  {
    id: 'process-governor',
    name: 'Process Governor',
    description: 'CPU and memory limiter per-app via processor affinity and working set caps.',
    repo: 'https://github.com/Nimba-Solutions/Process-Governor',
    packageName: 'process-governor',
    color: '#f59e0b',
    icon: 'PG',
    requiresAdmin: true,
    features: ['CPU affinity limits', 'Memory caps', 'Presets', 'Process explorer', 'Auto-reapply'],
  },
];

// --- Icon ---

function createTrayIcon() {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      // Purple/violet for the toolbox
      canvas[i]     = isBorder ? 120 : 147;
      canvas[i + 1] = isBorder ? 60  : 51;
      canvas[i + 2] = isBorder ? 200 : 234;
      canvas[i + 3] = 255;
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// --- Window ---

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 860,
    height: 640,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: createTrayIcon(),
    title: 'Nimbus Toolbox',
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- Tray ---

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Nimbus Toolbox');

  const toolItems = CATALOG.map(tool => ({
    label: `Launch ${tool.name}`,
    click: () => launchTool(tool.id),
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Nimbus Toolbox', click: () => createWindow() },
    { type: 'separator' },
    ...toolItems,
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createWindow());
}

// --- Tool scanning ---

function getDefaultScanPaths() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return [
    path.join(home, 'Projects'),
    'C:\\Projects',
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.dirname(app.getAppPath()),  // same directory as toolbox
  ].filter(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });
}

function scanForTools() {
  const customPaths = store.get('scanPaths', []);
  const scanDirs = [...new Set([...getDefaultScanPaths(), ...customPaths])];
  const found = [];

  for (const dir of scanDirs) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(dir, entry.name);

        // Check if it's one of our known tools
        const pkgPath = path.join(fullPath, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const catalogEntry = CATALOG.find(c => c.packageName === pkg.name);
          if (catalogEntry) {
            found.push({
              ...catalogEntry,
              installed: true,
              localPath: fullPath,
              version: pkg.version || '0.0.0',
              hasNodeModules: fs.existsSync(path.join(fullPath, 'node_modules')),
              hasDist: fs.existsSync(path.join(fullPath, 'dist')),
            });
          }
        } catch (e) { /* skip invalid package.json */ }
      }
    } catch (e) { /* skip inaccessible directories */ }
  }

  // Add catalog entries not found locally
  for (const cat of CATALOG) {
    if (!found.find(f => f.id === cat.id)) {
      found.push({
        ...cat,
        installed: false,
        localPath: null,
        version: null,
        hasNodeModules: false,
        hasDist: false,
      });
    }
  }

  store.set('tools', found);
  return found;
}

// --- Tool launching ---

async function launchTool(toolId) {
  const tools = store.get('tools', []);
  const tool = tools.find(t => t.id === toolId);
  if (!tool || !tool.installed || !tool.localPath) {
    return { status: 'error', message: 'Tool not installed locally' };
  }

  // Check if node_modules exist
  if (!tool.hasNodeModules) {
    return { status: 'error', message: 'Run npm install first in ' + tool.localPath };
  }

  // Launch with electron
  return new Promise((resolve) => {
    const cmd = `cd /d "${tool.localPath}" && npx electron .`;
    exec(cmd, { shell: true, windowsHide: false }, (err) => {
      if (err) {
        resolve({ status: 'error', message: err.message });
      }
    });
    // Don't wait for exit — resolve immediately
    setTimeout(() => resolve({ status: 'ok', name: tool.name }), 1000);
  });
}

async function openFolder(toolId) {
  const tools = store.get('tools', []);
  const tool = tools.find(t => t.id === toolId);
  if (tool && tool.localPath) {
    shell.openPath(tool.localPath);
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Not installed' };
}

async function openTerminal(toolId) {
  const tools = store.get('tools', []);
  const tool = tools.find(t => t.id === toolId);
  if (tool && tool.localPath) {
    exec(`start cmd.exe /k "cd /d ${tool.localPath}"`, { shell: true });
    return { status: 'ok' };
  }
  return { status: 'error', message: 'Not installed' };
}

async function installDeps(toolId) {
  const tools = store.get('tools', []);
  const tool = tools.find(t => t.id === toolId);
  if (!tool || !tool.localPath) {
    return { status: 'error', message: 'Not installed' };
  }

  return new Promise((resolve) => {
    exec(`cd /d "${tool.localPath}" && npm install`, { shell: true, windowsHide: true, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ status: 'error', message: stderr || err.message });
      } else {
        // Refresh scan
        scanForTools();
        resolve({ status: 'ok', output: stdout });
      }
    });
  });
}

async function buildTool(toolId) {
  const tools = store.get('tools', []);
  const tool = tools.find(t => t.id === toolId);
  if (!tool || !tool.localPath) {
    return { status: 'error', message: 'Not installed' };
  }

  return new Promise((resolve) => {
    exec(`cd /d "${tool.localPath}" && npm run build`, { shell: true, windowsHide: true, timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ status: 'error', message: stderr || err.message });
      } else {
        scanForTools();
        resolve({ status: 'ok', output: stdout });
      }
    });
  });
}

async function cloneTool(toolId) {
  const cat = CATALOG.find(c => c.id === toolId);
  if (!cat) return { status: 'error', message: 'Unknown tool' };

  const scanPaths = getDefaultScanPaths();
  const targetDir = scanPaths.find(p => p.includes('Projects')) || scanPaths[0] || 'C:\\Projects';
  const folderName = cat.name.replace(/\s+/g, '-').toLowerCase();
  const fullPath = path.join(targetDir, folderName);

  if (fs.existsSync(fullPath)) {
    return { status: 'error', message: `Directory already exists: ${fullPath}` };
  }

  return new Promise((resolve) => {
    exec(`git clone ${cat.repo}.git "${fullPath}"`, { shell: true, windowsHide: true, timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ status: 'error', message: stderr || err.message });
      } else {
        scanForTools();
        resolve({ status: 'ok', path: fullPath });
      }
    });
  });
}

// --- System info ---

function getSystemSummary() {
  const os = require('os');
  return {
    platform: os.platform(),
    release: os.release(),
    cpus: os.cpus().length,
    totalMemGb: (os.totalmem() / 1073741824).toFixed(1),
    freeMemGb: (os.freemem() / 1073741824).toFixed(1),
    hostname: os.hostname(),
    username: os.userInfo().username,
  };
}

// --- IPC Handlers ---

ipcMain.handle('scan-tools', () => scanForTools());
ipcMain.handle('get-tools', () => store.get('tools', []));
ipcMain.handle('get-catalog', () => CATALOG);

ipcMain.handle('launch-tool', (_, id) => launchTool(id));
ipcMain.handle('open-folder', (_, id) => openFolder(id));
ipcMain.handle('open-terminal', (_, id) => openTerminal(id));
ipcMain.handle('install-deps', (_, id) => installDeps(id));
ipcMain.handle('build-tool', (_, id) => buildTool(id));
ipcMain.handle('clone-tool', (_, id) => cloneTool(id));
ipcMain.handle('open-repo', (_, url) => { shell.openExternal(url); return { status: 'ok' }; });

ipcMain.handle('get-system', () => getSystemSummary());
ipcMain.handle('get-settings', () => store.get('settings'));
ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  return { status: 'ok' };
});

ipcMain.handle('get-scan-paths', () => ({
  defaults: getDefaultScanPaths(),
  custom: store.get('scanPaths', []),
}));
ipcMain.handle('add-scan-path', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder to scan for tools',
  });
  if (result.canceled) return null;
  const p = result.filePaths[0];
  const custom = store.get('scanPaths', []);
  if (!custom.includes(p)) {
    custom.push(p);
    store.set('scanPaths', custom);
  }
  return p;
});
ipcMain.handle('remove-scan-path', (_, p) => {
  const custom = store.get('scanPaths', []).filter(x => x !== p);
  store.set('scanPaths', custom);
  return { status: 'ok' };
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createTray();

  // Initial scan
  scanForTools();

  const settings = store.get('settings');
  if (!settings.startMinimized) {
    createWindow();
  }
});

app.on('window-all-closed', () => { /* keep running in tray */ });
app.on('activate', () => createWindow());
app.on('before-quit', () => { app.isQuitting = true; });
