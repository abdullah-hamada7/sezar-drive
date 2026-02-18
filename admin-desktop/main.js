const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Global error handling for better debugging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (app.isReady()) {
    dialog.showErrorBox('Application Error', error.stack || error.message);
  }
});

function getProductionPath() {
  const possiblePaths = [
    // Standard packaged path
    path.join(process.resourcesPath, 'dist', 'index.html'),
    // If copied without 'dist' wrapper
    path.join(process.resourcesPath, 'index.html'),
    // Dev fallback
    path.join(__dirname, '../frontend/dist/index.html'),
    path.join(__dirname, 'dist', 'index.html')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found renderer at:', p);
      return p;
    }
  }
  
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Sezar Drive - Admin Dashboard',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disabled sandbox temporarily to rule out file:// loading issues
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const prodPath = getProductionPath();

  if (isDev && process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev) {
    win.loadURL('http://localhost:5173');
  } else if (prodPath) {
    win.loadFile(prodPath).catch(err => {
      console.error('Load error:', err);
      win.webContents.openDevTools();
      dialog.showErrorBox('Load Error', `Failed to load ${prodPath}: ${err.message}`);
    });
  } else {
    const searchPath = path.join(process.resourcesPath, '*');
    dialog.showErrorBox('Critical Error', `Could not find UI files. Checked:\n- ${process.resourcesPath}\n- ${__dirname}`);
    win.webContents.openDevTools();
  }

  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

