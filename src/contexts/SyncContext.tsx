import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncEngine } from '../services/syncEngine';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncContextType {
  syncState: SyncState;
  lastSync: Date | null;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setSyncState('idle');
    const handleOffline = () => setSyncState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncState('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState('error');
    }
  };

  return (
    <SyncContext.Provider value={{ syncState, lastSync, pendingCount, triggerSync }}>
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
