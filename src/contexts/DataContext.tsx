import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppState, Driver, Vehicle, Operation, MaintenanceRecord, Employee, EPI, Delivery, AdminProfile, FuelRecord, AppNotification } from '../types';
import { loadFullState, saveToFirestore, deleteFromFirestore, loadAuth } from '../lib/db';
import { initDB } from '../services/localDb';
import { useAuth } from './AuthContext';

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

  const addItem = async (collection: string, item: any) => {
    const uid = user?.uid || 'public-demo';
    try {
      await saveToFirestore(uid, collection, item.id, item);
      setData(prev => {
        const collectionData = (prev as any)[collection] || [];
        return { ...prev, [collection]: [...collectionData, item] };
      });
    } catch (e) {
      console.error(`Erro ao adicionar em ${collection}:`, e);
      throw e;
    }
  };

  const updateItem = async (collection: string, item: any) => {
    const uid = user?.uid || 'public-demo';
    try {
      await saveToFirestore(uid, collection, item.id, item);
      setData(prev => ({
        ...prev,
        [collection]: ((prev as any)[collection] || []).map((i: any) => i.id === item.id ? item : i)
      }));
    } catch (e) {
      console.error(`Erro ao atualizar em ${collection}:`, e);
      throw e;
    }
  };

  const deleteItem = async (collection: string, id: string) => {
    const uid = user?.uid || 'public-demo';
    try {
      await deleteFromFirestore(uid, collection, id);
      setData(prev => ({
        ...prev,
        [collection]: ((prev as any)[collection] || []).filter((i: any) => i.id !== id)
      }));
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
