import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  Driver, Vehicle, Operation, MaintenanceRecord, 
  Employee, EPI, Delivery, AppNotification, AdminProfile 
} from '../types';

export interface SyncOp {
  id: string; // Unique ID of the sync operation
  collection: string;
  docId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload?: any;
  createdAt: string;
  retryCount: number;
}

interface TranslogDB extends DBSchema {
  drivers: { key: string; value: Driver };
  vehicles: { key: string; value: Vehicle };
  operations: { key: string; value: Operation };
  maintenanceRecords: { key: string; value: MaintenanceRecord };
  employees: { key: string; value: Employee };
  epis: { key: string; value: EPI };
  deliveries: { key: string; value: Delivery };
  notifications: { key: string; value: AppNotification };
  admin: { key: string; value: AdminProfile };
  sync_queue: { key: string; value: SyncOp };
}

const DB_NAME = 'translog-pro-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TranslogDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TranslogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const collections = [
          'drivers', 'vehicles', 'operations', 'maintenanceRecords',
          'employees', 'epis', 'deliveries', 'notifications', 'admin'
        ];
        
        collections.forEach(col => {
          if (!db.objectStoreNames.contains(col as any)) {
            db.createObjectStore(col as any, { keyPath: 'id' });
          }
        });

        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Generic Local Operations
export const localGet = async <T>(collection: string, id: string): Promise<T | undefined> => {
  const db = await initDB();
  return db.get(collection as any, id) as Promise<T | undefined>;
};

export const localGetAll = async <T>(collection: string): Promise<T[]> => {
  const db = await initDB();
  return db.getAll(collection as any) as Promise<T[]>;
};

export const localPut = async (collection: string, data: any): Promise<void> => {
  const db = await initDB();
  await db.put(collection as any, data);
};

export const localDelete = async (collection: string, id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(collection as any, id);
};

// Override Admin behavior (it uses 'profile' as id)
export const localGetAdmin = async (): Promise<AdminProfile | undefined> => {
  return localGet<AdminProfile>('admin', 'profile');
};

export const localPutAdmin = async (data: AdminProfile): Promise<void> => {
  await localPut('admin', { ...data, id: 'profile' }); // Force id to be 'profile'
};

// Sync Queue Operations
export const enqueueSync = async (collection: string, docId: string, action: 'CREATE' | 'UPDATE' | 'DELETE', payload?: any) => {
  const db = await initDB();
  const syncOp: SyncOp = {
    id: crypto.randomUUID(),
    collection,
    docId,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0
  };
  await db.put('sync_queue', syncOp);
};

export const getSyncQueue = async (): Promise<SyncOp[]> => {
  const db = await initDB();
  return db.getAll('sync_queue');
};

export const removeSyncOp = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('sync_queue', id);
};

export const updateSyncOp = async (syncOp: SyncOp): Promise<void> => {
  const db = await initDB();
  await db.put('sync_queue', syncOp);
};
