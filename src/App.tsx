import React, { useState, useEffect } from 'react';
import { loadFullState, saveToFirestore, deleteFromFirestore } from './db';

import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './views/Dashboard';
import Fleet from './views/Fleet';
import Drivers from './views/Drivers';
import Operations from './views/Operations';
import Maintenance from './views/Maintenance';
import Employees from './views/Employees';
import EPIs from './views/EPIs';
import Deliveries from './views/Deliveries';
import AdminProfileView from './views/AdminProfile';
import Auditor from './views/Auditor';
import Catalog from './views/Catalog';

import UsageUpdateModal from './components/UsageUpdateModal';
import { AppState, AdminProfile, AppNotification, Vehicle } from './types';
import { checkMaintenanceAlerts } from './services/notificationService';
import { Loader2 } from 'lucide-react';

import { supabase } from './supabase';

const App: React.FC = () => {
  const defaultAdmin: AdminProfile = {
    name: 'Gestor CAEL Logists',
    companyName: 'CAEL Angola',
    email: '',
    phone: ''
  };

  const [appData, setAppData] = useState<AppState>({
    drivers: [], vehicles: [], operations: [], maintenanceRecords: [],
    employees: [], epis: [], deliveries: [],
    admin: defaultAdmin,
    notifications: []
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string } | null>(null);
  const [showUsageUpdate, setShowUsageUpdate] = useState(false);
  const [vehiclesToUpdate, setVehiclesToUpdate] = useState<Vehicle[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ uid: session.user.id, email: session.user.email || '' });
        loadData(session.user.id);
      } else {
        setCurrentUser(null);
        loadData('public-demo'); // Carrega dados de demonstração
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ uid: session.user.id, email: session.user.email || '' });
        setIsAuthenticated(true);
        loadData(session.user.id);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        loadData('public-demo');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isAuthenticated && currentUser && appData.vehicles.length > 0 && !showUsageUpdate) {
      const today = new Date();
      const needsUpdate = appData.vehicles.filter(v => {
        if (!v.lastUsageUpdate) return true;
        const lastUpdate = new Date(v.lastUsageUpdate);
        const diffDays = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 15;
      });

      if (needsUpdate.length > 0) {
        setVehiclesToUpdate(needsUpdate);
        setShowUsageUpdate(true);
      }
    }
  }, [isAuthenticated, currentUser, appData.vehicles, showUsageUpdate]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const interval = setInterval(() => {
        const newAlerts = checkMaintenanceAlerts(appData);
        if (newAlerts.length > 0) {
          newAlerts.forEach(alert => {
            syncAdd('notifications', alert);
          });
        }
      }, 60000); // Verificar a cada minuto
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUser, appData]);

  const loadData = async (uid: string = 'default-user') => {
    try {
      const data = await loadFullState(uid);
      setAppData(prev => ({
        ...prev,
        ...data,
        admin: data.admin || prev.admin || defaultAdmin
      }));
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  const handleAuthSuccess = (user: any) => {
    setCurrentUser({ uid: user.id, email: user.email || '' });
    setIsAuthenticated(true);
    loadData(user.id);
  };

  const syncAdd = async (col: string, item: any) => {
    const uid = currentUser?.uid || 'public-demo';
    try {
      await saveToFirestore(uid, col, item.id, item);
      setAppData(prev => {
        const collection = (prev as any)[col] || [];
        const exists = collection.some((i: any) => i.id === item.id);
        if (exists) {
          return { ...prev, [col]: collection.map((i: any) => i.id === item.id ? item : i) };
        }
        return { ...prev, [col]: [...collection, item] };
      });
    } catch (e) {
      console.error(`Erro ao adicionar em ${col}:`, e);
      alert("Erro ao salvar dados. Verifique sua conexão.");
    }
  };

  const syncUpdate = async (col: string, item: any) => {
    const uid = currentUser?.uid || 'public-demo';
    try {
      await saveToFirestore(uid, col, item.id, item);
      setAppData(prev => ({
        ...prev,
        [col]: ((prev as any)[col] || []).map((i: any) => i.id === item.id ? item : i)
      }));
    } catch (e) {
      console.error(`Erro ao atualizar em ${col}:`, e);
      alert("Erro ao atualizar dados.");
    }
  };

  const syncDelete = async (col: string, id: string) => {
    const uid = currentUser?.uid || 'public-demo';
    try {
      await deleteFromFirestore(uid, col, id);
      setAppData(prev => ({
        ...prev,
        [col]: ((prev as any)[col] || []).filter((i: any) => i.id !== id)
      }));
    } catch (e) {
      console.error(`Erro ao deletar em ${col}:`, e);
      alert("Erro ao remover dados.");
    }
  };

  const handleMarkAsRead = (id: string) => {
    const notification = appData.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      syncUpdate('notifications', { ...notification, read: true });
    }
  };

  const handleClearNotifications = () => {
    appData.notifications.forEach(n => {
      syncDelete('notifications', n.id);
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen h-[100dvh] w-full bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="text-brand animate-spin" size={64} />
          <p className="text-muted font-black text-xs uppercase tracking-[0.3em] animate-pulse">Carregando Terminal Local...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      admin={appData.admin || defaultAdmin}
      notifications={appData.notifications}
      onMarkAsRead={handleMarkAsRead}
      onClearNotifications={handleClearNotifications}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {activeTab === 'catalog' && <Catalog />}
      {activeTab === 'dashboard' && <Dashboard data={appData} setActiveTab={setActiveTab} />}
      {activeTab === 'drivers' && (
        <Drivers
          drivers={appData.drivers}
          onAdd={d => syncAdd('drivers', d)}
          onUpdate={d => syncUpdate('drivers', d)}
          onDelete={id => syncDelete('drivers', id)}
        />
      )}
      {activeTab === 'fleet' && (
        <Fleet
          vehicles={appData.vehicles}
          maintenanceRecords={appData.maintenanceRecords}
          appData={appData}
          auth={appData.auth}
          onAdd={v => syncAdd('vehicles', v)}
          onDelete={id => syncDelete('vehicles', id)}
          onUpdate={v => syncUpdate('vehicles', v)}
        />
      )}
      {activeTab === 'operations' && (
        <Operations
          operations={appData.operations}
          drivers={appData.drivers}
          vehicles={appData.vehicles}
          onAdd={o => syncAdd('operations', o)}
          onUpdate={o => syncUpdate('operations', o)}
        />
      )}
      {activeTab === 'employees' && (
        <Employees
          employees={appData.employees}
          epis={appData.epis}
          deliveries={appData.deliveries}
          admin={appData.admin}
          auth={appData.auth}
          onAdd={e => syncAdd('employees', e)}
          onUpdate={e => syncUpdate('employees', e)}
          onDelete={id => syncDelete('employees', id)}
        />
      )}
      {activeTab === 'epis' && (
        <EPIs
          epis={appData.epis}
          auth={appData.auth}
          onAdd={e => syncAdd('epis', e)}
          onDelete={id => syncDelete('epis', id)}
        />
      )}
      {activeTab === 'deliveries' && (
        <Deliveries
          deliveries={appData.deliveries}
          employees={appData.employees}
          epis={appData.epis}
          onAdd={d => syncAdd('deliveries', d)}
          onUpdateStatus={(id, s) => {
            const delivery = appData.deliveries.find(d => d.id === id);
            if (delivery) syncUpdate('deliveries', { ...delivery, status: s });
          }}
        />
      )}
      {activeTab === 'profile' && (
        <AdminProfileView
          profile={appData.admin || defaultAdmin}
          onUpdate={p => syncUpdate('admin', p)}
          appData={appData}
          onRestore={() => { }}
        />
      )}
      {activeTab === 'auditor' && <Auditor data={appData} />}
      {activeTab === 'maintenance' && (
        <Maintenance
          data={appData}
          auth={appData.auth}
          onAdd={r => syncAdd('maintenanceRecords', r)}
          onUpdate={syncUpdate}
          onDelete={id => syncDelete('maintenanceRecords', id)}
        />
      )}

      {showUsageUpdate && (
        <UsageUpdateModal
          vehicles={vehiclesToUpdate}
          onUpdate={(v) => syncUpdate('vehicles', v)}
          onClose={() => setShowUsageUpdate(false)}
        />
      )}
    </Layout>
  );
};

export default App;

