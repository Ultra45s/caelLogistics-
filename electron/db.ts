import Database from 'better-sqlite3';
import { IpcMain } from 'electron';
import bcrypt from 'bcryptjs';

let db: any;

export function initLocalDB(dbPath: string, ipcMain: IpcMain) {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const collections = [
    'drivers', 'vehicles', 'operations', 'maintenanceRecords',
    'fuelRecords', 'employees', 'epis', 'deliveries', 'notifications', 'admin', 'sync_queue', 'users'
  ];

  // Criação genérica de tabelas com uma coluna JSON para simplificar (NoSQL em cima do SQLite)
  collections.forEach(col => {
    db.exec(`CREATE TABLE IF NOT EXISTS ${col} (id TEXT PRIMARY KEY, data TEXT)`);
  });

  // Registra IPC Handlers
  ipcMain.handle('sqlite:get', (event: any, collection: string, id: string) => {
    try {
      const stmt = db.prepare(`SELECT data FROM ${collection} WHERE id = ?`);
      const row = stmt.get(id);
      return row ? JSON.parse(row.data) : undefined;
    } catch (e) {
      console.error(`Error GET ${collection} ${id}:`, e);
      return undefined;
    }
  });

  ipcMain.handle('sqlite:getAll', (event: any, collection: string) => {
    try {
      const stmt = db.prepare(`SELECT data FROM ${collection}`);
      const rows = stmt.all();
      return rows.map((r: any) => JSON.parse(r.data));
    } catch (e) {
      console.error(`Error GETALL ${collection}:`, e);
      return [];
    }
  });

  ipcMain.handle('sqlite:put', (event: any, collection: string, data: any) => {
    try {
      if (!data.id) throw new Error('Data must have an id parameter');
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${collection} (id, data) VALUES (?, ?)`);
      stmt.run(data.id, JSON.stringify(data));
      return { success: true };
    } catch (e) {
      console.error(`Error PUT ${collection}:`, e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('sqlite:delete', (event: any, collection: string, id: string) => {
    try {
      const stmt = db.prepare(`DELETE FROM ${collection} WHERE id = ?`);
      stmt.run(id);
      return { success: true };
    } catch (e) {
      console.error(`Error DELETE ${collection} ${id}:`, e);
      return { success: false, error: String(e) };
    }
  });

  // Autenticação Local (Users)
  ipcMain.handle('sqlite:registerUser', async (event: any, email: string, rawPass: string, adminName: string) => {
    try {
      // Verifica se existe o email (usamos 'id' para guardar o email ou um slug). Mas faremos select json p/ flexibilidade ou parse.
      const stmt = db.prepare(`SELECT data FROM users`);
      const allUsers = stmt.all().map((r: any) => JSON.parse(r.data));
      if (allUsers.find((u: any) => u.email === email)) {
        return { success: false, error: 'Email já registado offline.' };
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(rawPass, salt);
      const newUser = { id: crypto.randomUUID(), email, passwordHash: hash, name: adminName, role: 'offline_admin' };
      
      const insertStmt = db.prepare(`INSERT INTO users (id, data) VALUES (?, ?)`);
      insertStmt.run(newUser.id, JSON.stringify(newUser));
      return { success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } };
    } catch(e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('sqlite:login', async (event: any, email: string, rawPass: string) => {
    try {
      const stmt = db.prepare(`SELECT data FROM users`);
      const allUsers = stmt.all().map((r: any) => JSON.parse(r.data));
      
      // Existe usuário manual (offline admin) e usuário default public-demo configurado no react
      const user = allUsers.find((u: any) => u.email === email);
      if (!user) return { success: false, error: 'Utilizador não encontrado no modo local.' };
      
      const isMatch = await bcrypt.compare(rawPass, user.passwordHash);
      if (isMatch) {
         return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }
      return { success: false, error: 'Senha incorreta.' };
    } catch(e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('ping', () => 'pong');
}
