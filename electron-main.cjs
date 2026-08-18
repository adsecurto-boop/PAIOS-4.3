const { app, BrowserWindow, globalShortcut, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let mainWindow;

// User configuration file path for auto-update & live sync
const configPath = path.join(app.getPath('userData'), 'paios-config.json');
const DEFAULT_LIVE_URL = 'https://paios-4-1.vercel.app';

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load paios-config.json:', err);
  }
  return { liveUrl: DEFAULT_LIVE_URL, autoUpdateCheck: true };
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
  
  // Decide target URL: Environment Variable > Saved Live URL > Default Vercel App > Local Dist Index
  const remoteUrl = process.env.PAIOS_REMOTE_URL || config.liveUrl || DEFAULT_LIVE_URL;

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else if (remoteUrl && remoteUrl.startsWith('http')) {
    console.log(`Loading PAIOS from Live Sync URL: ${remoteUrl}`);
    mainWindow.loadURL(remoteUrl).catch((err) => {
      console.warn('Failed to load remote live URL, falling back to local files:', err);
      mainWindow.loadFile(distIndex).catch(() => {
        mainWindow.loadURL('http://localhost:3000');
      });
    });
  } else {
    mainWindow.loadFile(distIndex).catch(() => {
      mainWindow.loadURL('http://localhost:3000');
    });
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
