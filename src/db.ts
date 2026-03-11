
import { AppState, Operation, Driver, Vehicle, MaintenanceRecord, Employee, EPI, Delivery, AdminProfile, AssetType } from './types';

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

// --- Operações de Armazenamento Local ---

const getLocalData = (uid: string): any => {
  const data = localStorage.getItem(`translog_data_${uid}`);
  return data ? JSON.parse(data) : {};
};

const setLocalData = (uid: string, data: any) => {
  localStorage.setItem(`translog_data_${uid}`, JSON.stringify(data));
};

export const saveToFirestore = async (uid: string, col: string, id: string, data: any) => {
  const allData = getLocalData(uid);
  if (!allData[col]) allData[col] = [];

  if (col === 'admin') {
    allData[col] = data;
  } else {
    const index = allData[col].findIndex((i: any) => i.id === id);
    if (index > -1) {
      allData[col][index] = data;
    } else {
      allData[col].push(data);
    }
  }
  setLocalData(uid, allData);
  return Promise.resolve();
};

export const fetchCollection = async <T>(uid: string, col: string): Promise<T[]> => {
  const allData = getLocalData(uid);
  return (allData[col] || []) as T[];
};

export const fetchDoc = async <T>(uid: string, col: string, id: string): Promise<T | null> => {
  const allData = getLocalData(uid);
  if (col === 'admin') return (allData[col] || null) as T;
  return (allData[col]?.find((i: any) => i.id === id) || null) as T;
};

export const loadFullState = async (uid: string): Promise<Partial<AppState>> => {
  const [drivers, vehicles, operations, maintenance, employees, epis, deliveries, admin, notifications] = await Promise.all([
    fetchCollection<Driver>(uid, 'drivers'),
    fetchCollection<Vehicle>(uid, 'vehicles'),
    fetchCollection<Operation>(uid, 'operations'),
    fetchCollection<MaintenanceRecord>(uid, 'maintenanceRecords'),
    fetchCollection<Employee>(uid, 'employees'),
    fetchCollection<EPI>(uid, 'epis'),
    fetchCollection<Delivery>(uid, 'deliveries'),
    fetchDoc<AdminProfile>(uid, 'admin', 'profile'),
    fetchCollection<any>(uid, 'notifications')
  ]);

  return {
    drivers,
    vehicles,
    operations,
    maintenanceRecords: maintenance,
    employees,
    epis,
    deliveries,
    admin: admin || undefined,
    notifications
  };
};

export const uploadFile = async (path: string, base64: string): Promise<string> => {
  return base64; // No local mode, we just return the base64
};

export const deleteFromFirestore = async (uid: string, col: string, id: string) => {
  const allData = getLocalData(uid);
  if (allData[col]) {
    allData[col] = allData[col].filter((i: any) => i.id !== id);
    setLocalData(uid, allData);
  }
  return Promise.resolve();
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
