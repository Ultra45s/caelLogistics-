import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { SyncProvider, useSync } from './contexts/SyncContext';

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
import FuelControl from './views/FuelControl';

import UsageUpdateModal from './components/UsageUpdateModal';
import { UpdateManager } from './components/UpdateManager';
import { Vehicle } from './types';
import { checkMaintenanceAlerts } from './services/notificationService';
import { Loader2 } from 'lucide-react';

import { initDB } from './services/localDb';

const defaultAdmin = {
  name: 'Gestor cael logistics',
  companyName: 'CAEL Angola',
  email: '',
  phone: ''
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { data, isLoading: dataLoading, addItem, updateItem, deleteItem } = useData();
  const { triggerSync } = useSync();

  const [activeTab, setActiveTab] = useState('catalog');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showUsageUpdate, setShowUsageUpdate] = useState(false);
  const [vehiclesToUpdate, setVehiclesToUpdate] = useState<Vehicle[]>([]);

  const isLoading = authLoading || dataLoading;

  useEffect(() => {
    initDB().then(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isAuthenticated && data.vehicles.length > 0 && !showUsageUpdate) {
      const today = new Date();
      const needsUpdate = data.vehicles.filter(v => {
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
  }, [isAuthenticated, data.vehicles, showUsageUpdate]);

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        const newAlerts = checkMaintenanceAlerts(data);
        if (newAlerts.length > 0) {
          newAlerts.forEach(alert => {
            addItem('notifications', alert);
          });
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, data]);

  const handleMarkAsRead = (id: string) => {
    const notification = data.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      updateItem('notifications', { ...notification, read: true });
    }
  };

  const handleClearNotifications = () => {
    data.notifications.forEach(n => {
      deleteItem('notifications', n.id);
    });
  };

  const handleLogout = async () => {
    await logout();
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
    return <Login />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      admin={data.admin || defaultAdmin}
      notifications={data.notifications}
      onMarkAsRead={handleMarkAsRead}
      onClearNotifications={handleClearNotifications}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {activeTab === 'catalog' && <Catalog />}
      {activeTab === 'dashboard' && <Dashboard data={data} setActiveTab={setActiveTab} />}
      {activeTab === 'drivers' && (
        <Drivers
          drivers={data.drivers}
          onAdd={d => addItem('drivers', d)}
          onUpdate={d => updateItem('drivers', d)}
          onDelete={id => deleteItem('drivers', id)}
          auth={data.auth}
        />
      )}
      {activeTab === 'fleet' && (
        <Fleet
          vehicles={data.vehicles}
          maintenanceRecords={data.maintenanceRecords}
          appData={data}
          auth={data.auth}
          onAdd={v => addItem('vehicles', v)}
          onDelete={id => deleteItem('vehicles', id)}
          onUpdate={v => updateItem('vehicles', v)}
        />
      )}
      {activeTab === 'fuel' && (
        <FuelControl
          fuelRecords={data.fuelRecords || []}
          vehicles={data.vehicles}
          onAdd={r => addItem('fuelRecords', r)}
          onUpdate={r => updateItem('fuelRecords', r)}
          onDelete={id => deleteItem('fuelRecords', id)}
          auth={data.auth}
        />
      )}
      {activeTab === 'operations' && (
        <Operations
          operations={data.operations}
          drivers={data.drivers}
          vehicles={data.vehicles}
          onAdd={o => addItem('operations', o)}
          onUpdate={o => updateItem('operations', o)}
          auth={data.auth}
          onDelete={id => deleteItem('operations', id)}
        />
      )}
      {activeTab === 'employees' && (
        <Employees
          employees={data.employees}
          epis={data.epis}
          deliveries={data.deliveries}
          admin={data.admin}
          auth={data.auth}
          onAdd={e => addItem('employees', e)}
          onUpdate={e => updateItem('employees', e)}
          onDelete={id => deleteItem('employees', id)}
        />
      )}
      {activeTab === 'epis' && (
        <EPIs
          epis={data.epis}
          auth={data.auth}
          onAdd={e => addItem('epis', e)}
          onDelete={id => deleteItem('epis', id)}
        />
      )}
      {activeTab === 'deliveries' && (
        <Deliveries
          deliveries={data.deliveries}
          employees={data.employees}
          epis={data.epis}
          onAdd={d => addItem('deliveries', d)}
          onUpdateStatus={(id, s) => {
            const delivery = data.deliveries.find(d => d.id === id);
            if (delivery) updateItem('deliveries', { ...delivery, status: s });
          }}
          auth={data.auth}
          onDelete={id => deleteItem('deliveries', id)}
        />
      )}
      {activeTab === 'profile' && (
        <AdminProfileView
          profile={data.admin || defaultAdmin}
          onUpdate={p => updateItem('admin', p)}
          appData={data}
          onRestore={() => { }}
        />
      )}
      {activeTab === 'auditor' && <Auditor data={data} />}
      {activeTab === 'maintenance' && (
        <Maintenance
          data={data}
          auth={data.auth}
          onAdd={r => addItem('maintenanceRecords', r)}
          onUpdate={updateItem}
          onDelete={id => deleteItem('maintenanceRecords', id)}
        />
      )}

      {showUsageUpdate && (
        <UsageUpdateModal
          vehicles={vehiclesToUpdate}
          onUpdate={(v) => updateItem('vehicles', v)}
          onClose={() => setShowUsageUpdate(false)}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SyncProvider>
        <DataProvider>
          <AppContent />
          <UpdateManager />
        </DataProvider>
      </SyncProvider>
    </AuthProvider>
  );
};

export default App;
