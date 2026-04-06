import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { syncEngine } from '../services/syncEngine';
import { getSyncQueue } from '../services/localDb';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncContextType {
  syncState: SyncState;
  lastSync: Date | null;
  pendingCount: number;
  triggerSync: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Lê o tamanho real da fila de sync e actualiza o contador
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch {
      // Silencia erros (ex: DB ainda não iniciada)
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setSyncState('idle');
      refreshPendingCount();
    };
    const handleOffline = () => setSyncState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncState('offline');
    }

    // Carrega o contador inicial
    refreshPendingCount();

    // Actualiza o contador periodicamente (a cada 30s)
    const interval = setInterval(refreshPendingCount, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  const triggerSync = async () => {
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }

    setSyncState('syncing');
    try {
      await syncEngine.attemptSync();
      setSyncState('idle');
      setLastSync(new Date());
      // Guardar o timestamp do último sync em localStorage para persistência
      localStorage.setItem('lastSyncAt', new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState('error');
    } finally {
      // Actualiza o contador após o sync (deve ter diminuído)
      await refreshPendingCount();
    }
  };

  return (
    <SyncContext.Provider value={{ syncState, lastSync, pendingCount, triggerSync, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
};
