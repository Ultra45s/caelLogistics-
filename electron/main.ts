import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initLocalDB } from './db.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Preload path needs to be correct after compilation.
// During dev, main.js is in dist-electron. __dirname is dist-electron.
const preloadPath = path.join(__dirname, 'preload.cjs');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Em dev, carrega do Vite. Em pro, do arquivo dist local.
  const devUrl = 'http://localhost:3010';
  const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;

  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(prodUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Inicialização do SQLite em Documentos/TransLog
  const docsPath = app.getPath('documents');
  const transLogPath = path.join(docsPath, 'TransLog');
  const dbPath = path.join(transLogPath, 'translog-local.sqlite');

  // Garantir que a pasta existe
  if (!fs.existsSync(transLogPath)) {
    fs.mkdirSync(transLogPath, { recursive: true });
  }

  // Lógica de Migração do Local Antigo (userData)
  const oldDbPath = path.join(app.getPath('userData'), 'translog-local.sqlite');
  if (fs.existsSync(oldDbPath) && !fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(oldDbPath, dbPath);
      console.log('Dados migrados de userData para Documentos/TransLog');
    } catch (err) {
      console.error('Erro ao migrar base de dados:', err);
    }
  }

  console.log('Inicializando SQLite em:', dbPath);
  initLocalDB(dbPath, ipcMain);

  // Handlers de Backup e Restauro
  ipcMain.handle('backup:export', async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Exportar Cópia de Segurança',
      defaultPath: path.join(docsPath, `backup-translog-${new Date().toISOString().split('T')[0]}.sqlite`),
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
    });

    if (filePath) {
      try {
        fs.copyFileSync(dbPath, filePath);
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }
    return { success: false };
  });

  ipcMain.handle('backup:import', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Importar Cópia de Segurança',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancelar', 'Importar'],
        title: 'Confirmar Importação',
        message: 'Isto irá substituir todos os dados atuais. Deseja continuar?'
      });

      if (response === 1) {
        try {
          // No Better-SQLite3, precisamos fechar a conexão ou garantir que nada escreva
          // Como o processo é simples e o Electron carrega DB no init, o mais seguro é avisar p/ reiniciar
          fs.copyFileSync(filePaths[0], dbPath);
          return { success: true };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }
    }
    return { success: false };
  });

  createWindow();

  // Configuração do Auto-Updater
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update_available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update_downloaded');
  });

  ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
