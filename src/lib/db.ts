import { AppState, Operation, Driver, Vehicle, MaintenanceRecord, Employee, EPI, Delivery, AdminProfile, AssetType, FuelRecord, MaintenanceType } from '../types';
import { dataFetchCollection, dataFetchAdmin, dataSaveDoc, dataDeleteDoc } from '../services/dataService';
import { localGet } from '../services/localDb';

// --- Funções de Utilidade ---

export const hashCredential = async (password: string, salt: string): Promise<{ hash: string }> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex };
};

export const createBackup = (data: AppState) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new window.Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_cael_logists_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateTestData = async () => {
  return Promise.resolve();
};

// --- Proxy para o Data Service (Offline-First) ---

export const saveToFirestore = async (uid: string, col: string, id: string, data: any) => {
  await dataSaveDoc(col, id, data);
};

export const fetchCollection = async <T extends { id: string }>(uid: string, col: string): Promise<T[]> => {
  return dataFetchCollection<T>(col);
};

export const fetchDoc = async <T>(uid: string, col: string, id: string): Promise<T | null> => {
  if (col === 'admin') return (await dataFetchAdmin() || null) as T;
  const doc = await localGet<T>(col, id);
  return doc || null;
};

export const loadFullState = async (uid: string): Promise<Partial<AppState>> => {
  const [drivers, vehicles, operations, maintenance, employees, epis, deliveries, admin, notifications, fuelRecords] = await Promise.all([
    fetchCollection<Driver>(uid, 'drivers'),
    fetchCollection<Vehicle>(uid, 'vehicles'),
    fetchCollection<Operation>(uid, 'operations'),
    fetchCollection<MaintenanceRecord>(uid, 'maintenanceRecords'),
    fetchCollection<Employee>(uid, 'employees'),
    fetchCollection<EPI>(uid, 'epis'),
    fetchCollection<Delivery>(uid, 'deliveries'),
    dataFetchAdmin(),
    fetchCollection<any>(uid, 'notifications'),
    fetchCollection<FuelRecord>(uid, 'fuelRecords')
  ]);

  // Migração em tempo de execução para Manutenção Geral -> Preventiva
  const migratedMaintenance = maintenance.map(m => {
    if ((m.type as string) === 'Geral') {
      return { ...m, type: MaintenanceType.PREVENTIVE };
    }
    return m;
  });

  return {
    drivers,
    vehicles,
    operations,
    maintenanceRecords: migratedMaintenance,
    employees,
    epis,
    deliveries,
    admin: admin || undefined,
    notifications,
    fuelRecords,
    auth: loadAuth() || undefined
  };
};

export const saveAuth = (auth: any) => {
  localStorage.setItem('cael_auth', JSON.stringify(auth));
};

export const loadAuth = () => {
  const auth = localStorage.getItem('cael_auth');
  return auth ? JSON.parse(auth) : null;
};

export const uploadFile = async (path: string, base64: string): Promise<string> => {
  return base64; // No local mode, we just return the base64
};

export const deleteFromFirestore = async (uid: string, col: string, id: string) => {
  await dataDeleteDoc(col, id);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const cell = row[header] === null || row[header] === undefined ? '' : row[header];
      return `"${String(cell).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new window.Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
