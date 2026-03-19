import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncEngine } from '../services/syncEngine';

const SyncStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Como o syncEngine não emite eventos nativamente, podemos fazer um poll rápido 
    // ou interceptar (para esse escopo, vamos assumir que ele resolve rápido, mas podemos
    // melhorar adicionando um event emitter no syncEngine se necessário).
    // Para simplificar: mostramos sync quando ele está tentando sincronizar via método.

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Polling para checar se o syncEngine está ocupado (opcional, só para UI feeling)
  useEffect(() => {
    const interval = setInterval(() => {
      // @ts-ignore (propriedade privada, mas útil para debug/ui rápida)
      setIsSyncing(syncEngine.isSyncing);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20">
        <WifiOff size={16} />
        <span>Offline</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium border border-amber-500/20">
        <RefreshCw size={16} className="animate-spin" />
        <span>Sincronizando</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20">
      <Wifi size={16} />
      <span>Online</span>
    </div>
  );
};

export default SyncStatusIndicator;
