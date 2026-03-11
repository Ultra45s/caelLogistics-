
import React, { useMemo } from 'react';
import { AppState, ServiceStatus, AssetType, DeliveryStatus } from '../types';
import {
  Truck, Container, Users, AlertTriangle, Activity, Zap,
  HardHat, ShieldCheck, ClipboardCheck, Wrench, ArrowUpRight,
  Clock, FileText, ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  data: AppState;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, setActiveTab }) => {
  const activeOps = data.operations.filter(o => o.status === ServiceStatus.IN_TRANSIT || o.status === ServiceStatus.PENDING_RETURN).length;
  const totalOps = data.operations.length;
  const totalDeliveries = data.deliveries.length;
  const lastMaintenance = data.maintenanceRecords.slice().reverse()[0];
  const lastDelivery = data.deliveries.slice().reverse()[0];

  // Lógica de Alertas de Manutenção
  const maintenanceAlerts = data.vehicles.filter(v => {
    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
    const lastRecord = data.maintenanceRecords
      .filter(r => r.vehicleId === v.id)
      .filter(r => isHourBased ? (r.currentHours || 0) > 0 : (r.currentKm || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const baseDate = lastRecord ? new Date(lastRecord.date) : new Date(v.lastMaintenanceDate);
    const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= v.maintenanceIntervalDays) return true;

    // Usa campos diretos do veículo para o cálculo de uso
    const lastUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
    const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
    if (currentUsage > 0 && lastUsage > 0 && currentUsage - lastUsage >= v.maintenanceIntervalKm) return true;

    return false;
  }).length;

  const epiAlerts = useMemo(() => {
    const latestMap = new Map<string, any>();
    data.deliveries.forEach(d => {
      const epi = data.epis.find(e => e.id === d.epiId);
      if (!epi) return;
      const key = `${d.employeeId}-${d.epiId}`;
      const delDate = new Date(d.deliveryDate);
      let lifespan = epi.lifespanValue;
      if (epi.lifespanUnit === 'weeks') lifespan *= 7;
      if (epi.lifespanUnit === 'months') lifespan *= 30;
      const expiry = new Date(delDate.getTime() + lifespan * 24 * 60 * 60 * 1000);
      if (!latestMap.has(key) || delDate.getTime() > latestMap.get(key).date.getTime()) {
        latestMap.set(key, { expiry, date: delDate });
      }
    });
    return Array.from(latestMap.values()).filter(v => v.expiry < new Date()).length;
  }, [data.deliveries, data.epis]);

  const complianceData = [
    { name: 'Em Dia', value: (data.vehicles.length + data.employees.length) - (maintenanceAlerts + epiAlerts), color: '#10b981' },
    { name: 'Críticos', value: maintenanceAlerts + epiAlerts, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 scroll-container">
      {/* Hero Header */}
      <div className="relative overflow-hidden glass-panel rounded-lg p-10 text-text-main shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-10 -ml-20 -mb-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none uppercase">Terminal <span className="text-blue-400">Logístico</span></h2>
            <p className="text-slate-400 text-sm font-bold max-w-md leading-relaxed">Central de registros para carregamentos, frota e SST.</p>
            <div className="flex gap-4 pt-4">
              <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-lg backdrop-blur-md">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Total Arquivado</p>
                <p className="text-xl font-black text-text-main">{totalOps + totalDeliveries}</p>
              </div>
              <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-4 rounded-lg backdrop-blur-md">
                <p className="text-[8px] font-black text-blue-400 uppercase mb-1 tracking-widest">Ativos em Curso</p>
                <p className="text-xl font-black text-blue-100">{activeOps}</p>
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Acesso */}
          <div className="grid grid-cols-1 gap-3 w-full lg:w-80">
            <button onClick={() => setActiveTab('operations')} className="glass-card p-4 rounded-lg flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20"><Truck size={16} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Último Carregamento</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-500 group-hover:text-text-main transition-colors" />
            </button>
            <button onClick={() => setActiveTab('deliveries')} className="glass-card p-4 rounded-lg flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/20"><HardHat size={16} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Última Entrega EPI</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-500 group-hover:text-text-main transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monitor de Atividade Recente */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-lg border border-white/10 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-text-main uppercase tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-blue-400" /> Histórico Operacional Recente
            </h3>
            <button onClick={() => setActiveTab('operations')} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">Ver Todos</button>
          </div>

          <div className="space-y-3 flex-1">
            {data.operations.slice(-5).reverse().map((op, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-text-main uppercase leading-none mb-1">{op.client}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{op.status} • {op.origin} - {op.destination}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-500">{op.startDate}</span>
              </div>
            ))}
            {data.operations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                <FileText size={48} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest mt-4 opacity-40">Nenhum registro no arquivo</p>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard de Conformidade e Atalhos Técnicos */}
        <div className="space-y-6">
          <div className="glass-panel p-8 rounded-lg border border-white/10 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-black text-text-main uppercase tracking-tight mb-8 w-full">Saúde do Sistema</h3>
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceData} innerRadius="75%" outerRadius="95%" paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                    {complianceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-text-main leading-none">
                  {Math.round(((data.vehicles.length + data.employees.length - maintenanceAlerts - epiAlerts) / (data.vehicles.length + data.employees.length || 1)) * 100)}%
                </span>
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Conformidade</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 text-center">
                <p className="text-lg font-black text-rose-400">{maintenanceAlerts + epiAlerts}</p>
                <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Críticos</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 text-center">
                <p className="text-lg font-black text-emerald-400">{totalOps}</p>
                <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Logs Totais</p>
              </div>
            </div>
          </div>

          {/* Cards de Último Registro */}
          <div className="glass-panel p-6 rounded-lg text-text-main space-y-4 border border-white/10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Acesso Rápido a Logs</p>
            <div onClick={() => setActiveTab('maintenance')} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3">
                <Wrench size={16} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                <div>
                  <p className="text-[10px] font-black uppercase text-text-main">Última Oficina</p>
                  <p className="text-[8px] text-slate-500 uppercase">{lastMaintenance?.date || 'Nenhum'}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-600" />
            </div>
            <div onClick={() => setActiveTab('deliveries')} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3">
                <ClipboardCheck size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-[10px] font-black uppercase text-text-main">Última Ficha EPI</p>
                  <p className="text-[8px] text-slate-500 uppercase">{lastDelivery?.deliveryDate || 'Nenhum'}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

