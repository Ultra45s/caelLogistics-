import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  sqliteGet: (collection: string, id: string) => ipcRenderer.invoke('sqlite:get', collection, id),
  sqliteGetAll: (collection: string) => ipcRenderer.invoke('sqlite:getAll', collection),
  sqlitePut: (collection: string, data: any) => ipcRenderer.invoke('sqlite:put', collection, data),
  sqliteDelete: (collection: string, id: string) => ipcRenderer.invoke('sqlite:delete', collection, id),
  
  sqliteLogin: (email: string, pass: string) => ipcRenderer.invoke('sqlite:login', email, pass),
  sqliteRegisterUser: (email: string, pass: string, name: string) => ipcRenderer.invoke('sqlite:registerUser', email, pass, name),
  
  // Auto-Update
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update_downloaded', callback),
  restartApp: () => ipcRenderer.send('restart_app'),
  
  // Backup & Restore
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  // Para testar conectividade com main
  ping: () => ipcRenderer.invoke('ping')
});
