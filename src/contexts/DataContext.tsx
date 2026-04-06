import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppState, Driver, Vehicle, Operation, MaintenanceRecord, Employee, EPI, Delivery, AdminProfile, FuelRecord, AppNotification } from '../types';
import { loadFullState, saveToFirestore, deleteFromFirestore, loadAuth } from '../lib/db';
import { dataCreateDoc, dataUpdateDoc } from '../services/dataService';
import { initDB, localGet } from '../services/localDb';
import { useAuth } from './AuthContext';
import { useSync } from './SyncContext';

interface DataContextType {
  data: AppState;
  isLoading: boolean;
  addItem: (collection: string, item: any) => Promise<void>;
  updateItem: (collection: string, item: any) => Promise<void>;
  deleteItem: (collection: string, id: string) => Promise<void>;
  updateProfile: (profile: AdminProfile) => Promise<void>;
  refreshData: () => Promise<void>;
}

const defaultAdmin: AdminProfile = {
  name: 'Gestor cael logistics',
  companyName: 'CAEL Angola',
  email: '',
  phone: ''
};

const defaultState: AppState = {
  drivers: [],
  vehicles: [],
  operations: [],
  maintenanceRecords: [],
  employees: [],
  epis: [],
  deliveries: [],
  admin: defaultAdmin,
  notifications: [],
  fuelRecords: []
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { refreshPendingCount } = useSync();

  const loadData = useCallback(async (uid: string) => {
    try {
      const loadedData = await loadFullState(uid);
      setData(prev => ({
        ...prev,
        ...loadedData,
        admin: loadedData.admin || prev.admin || defaultAdmin
      }));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initDB().then(() => {
      const uid = user?.uid || 'public-demo';
      loadData(uid);
    });
  }, [user?.uid]);

  /**
   * addItem — enfileira CREATE (novo documento)
   */
  const addItem = async (collection: string, item: any) => {
    try {
      await dataCreateDoc(collection, item.id, item);
      setData(prev => {
        const collectionData = (prev as any)[collection] || [];
        return { ...prev, [collection]: [...collectionData, { ...item, syncStatus: 'pending' }] };
      });
      refreshPendingCount();
    } catch (e) {
      console.error(`Erro ao adicionar em ${collection}:`, e);
      throw e;
    }
  };

  /**
   * updateItem — enfileira UPDATE (documento existente)
   */
  const updateItem = async (collection: string, item: any) => {
    try {
      await dataUpdateDoc(collection, item.id, item);
      setData(prev => ({
        ...prev,
        [collection]: ((prev as any)[collection] || []).map((i: any) => i.id === item.id ? { ...item, syncStatus: 'pending' } : i)
      }));
      refreshPendingCount();
    } catch (e) {
      console.error(`Erro ao atualizar em ${collection}:`, e);
      throw e;
    }
  };

  const deleteItem = async (collection: string, id: string) => {
    try {
      await deleteFromFirestore('', collection, id);
      setData(prev => ({
        ...prev,
        [collection]: ((prev as any)[collection] || []).filter((i: any) => i.id !== id)
      }));
      refreshPendingCount();
    } catch (e) {
      console.error(`Erro ao deletar em ${collection}:`, e);
      throw e;
    }
  };

  const updateProfile = async (profile: AdminProfile) => {
    await updateItem('admin', profile);
  };

  const refreshData = async () => {
    setIsLoading(true);
    const uid = user?.uid || 'public-demo';
    await loadData(uid);
  };

  return (
    <DataContext.Provider value={{ data, isLoading, addItem, updateItem, deleteItem, updateProfile, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
