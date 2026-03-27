interface IElectronAPI {
  sqliteGet: (collection: string, id: string) => Promise<any>;
  sqliteGetAll: (collection: string) => Promise<any[]>;
  sqlitePut: (collection: string, data: any) => Promise<{ success: boolean; error?: string }>;
  sqliteDelete: (collection: string, id: string) => Promise<{ success: boolean; error?: string }>;
  sqliteLogin: (email: string, pass: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  sqliteRegisterUser: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  
  onUpdateAvailable: (callback: () => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  restartApp: () => void;
  
  exportBackup: () => Promise<{ success: boolean; error?: string }>;
  importBackup: () => Promise<{ success: boolean; error?: string }>;
  
  ping: () => Promise<string>;
}

interface Window {
  api: IElectronAPI;
}
