const { app, BrowserWindow, globalShortcut, Menu, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;

// User configuration file path for auto-update & live sync
const configPath = path.join(app.getPath('userData'), 'paios-config.json');
const DEFAULT_LIVE_URL = '';

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      // Ignore legacy paios-4-1 URL from older installations
      if (parsed.liveUrl && parsed.liveUrl.includes('paios-4-1')) {
        parsed.liveUrl = '';
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load paios-config.json:', err);
  }
  return { liveUrl: '', autoUpdateCheck: true };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save paios-config.json:', err);
  }
}

function createWindow() {
  const config = loadConfig();

  // Configure Content Security Policy to permit HTTP & WebSocket traffic to local & production API endpoints
  if (session && session.defaultSession) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3001 http://localhost:3000 ws://localhost:3001 ws://localhost:3000 https: http:; connect-src 'self' http://localhost:3001 http://localhost:3000 ws://localhost:3001 ws://localhost:3000 https: http:;"
          ]
        }
      });
    });
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PAIOS Desktop - Personal AI Operating System',
    frame: true,
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    icon: path.join(__dirname, 'dist', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  const distIndex = path.join(__dirname, 'dist', 'index.html');
  
  // Target URLs
  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3001';
  const remoteUrl = process.env.PAIOS_REMOTE_URL || config.liveUrl || DEFAULT_LIVE_URL;

  function loadLocalDist() {
    if (fs.existsSync(distIndex)) {
      mainWindow.loadFile(distIndex).catch((err) => {
        console.warn('Failed to load dist/index.html:', err);
      });
    } else {
      console.warn('dist/index.html not found. Run "npm run build" to create production assets.');
    }
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl).catch(() => {
      // If port 3001 failed, attempt port 3000 before falling back to local files
      mainWindow.loadURL('http://localhost:3000').catch(() => {
        loadLocalDist();
      });
    });
  } else if (remoteUrl && remoteUrl.startsWith('http')) {
    console.log(`Loading PAIOS from Live Sync URL: ${remoteUrl}`);
    mainWindow.loadURL(remoteUrl).catch((err) => {
      console.warn('Failed to load remote live URL, falling back to local files:', err);
      loadLocalDist();
    });
  } else {
    loadLocalDist();
  }

  // Build application menu with Live Sync & Auto-Update tools
  const template = [
    {
      label: 'PAIOS',
      submenu: [
        {
          label: 'Check for Live Updates (Reload)',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        },
        {
          label: 'Set Live Sync Server URL...',
          click: async () => {
            const current = loadConfig().liveUrl || '';
            const { response, filePath } = await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Live Sync Configuration',
              message: 'PAIOS Desktop Live Sync',
              detail: `Current Live Sync URL: ${current || 'None (Using local embedded files)'}\n\nTo automatically load git commits without rebuilding the .exe, host your web app on a server (Vercel, GitHub Pages, Cloud Run) and set PAIOS_REMOTE_URL or configure live sync in paios-config.json located at:\n${configPath}`,
              buttons: ['OK', 'Open Config File Location']
            });
            if (response === 1) {
              require('electron').shell.showItemInFolder(configPath);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Register Global Shortcuts (Ctrl+Shift+P for Quick PAIOS, Ctrl+Shift+R for Live Update Refresh)
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow) mainWindow.reload();
  });
}

// IPC Handlers for In-App Live Sync & Auto-Update Controls
ipcMain.handle('paios:get-version', () => {
  return app.getVersion() || '4.3.0';
});

ipcMain.handle('paios:get-config', () => {
  return loadConfig();
});

ipcMain.handle('paios:set-config', (event, newConfig) => {
  saveConfig(newConfig);
  return true;
});

ipcMain.handle('paios:reload', () => {
  if (mainWindow) {
    mainWindow.reload();
    return true;
  }
  return false;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
