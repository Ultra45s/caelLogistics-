import React, { useMemo } from 'react';
import { AppState, ServiceStatus, AssetType } from '../types';
import {
  Truck, Container as ContainerIcon, Users, AlertTriangle, Activity, Zap,
  HardHat, ShieldCheck, ClipboardCheck, Wrench, ArrowUpRight,
  Clock, FileText, ChevronRight, Droplet, Warehouse, ShieldAlert,
  ArrowRight,
  TrendingUp,
  Boxes,
  CheckCircle2
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
    { name: 'Em Dia', value: Math.max(0, (data.vehicles.length + data.employees.length) - (maintenanceAlerts + epiAlerts)), color: '#10b981' },
    { name: 'Críticos', value: maintenanceAlerts + epiAlerts, color: '#f43f5e' }
  ];

  const topConsumers = useMemo(() => {
    if (!data.fuelRecords || data.fuelRecords.length === 0) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const consumptionMap = new Map<string, number>();
    data.fuelRecords.filter(r => new Date(r.date) >= thirtyDaysAgo).forEach(r => {
      consumptionMap.set(r.vehicleId, (consumptionMap.get(r.vehicleId) || 0) + r.quantityLiters);
    });
    
    return Array.from(consumptionMap.entries())
      .map(([vehicleId, liters]) => ({
        vehicle: data.vehicles.find(v => v.id === vehicleId),
        liters
      }))
      .filter(x => x.vehicle)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
  }, [data.fuelRecords, data.vehicles]);

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
      {/* Hero Header Premium */}
      <div className="relative overflow-hidden bg-white/[0.02] backdrop-blur-[40px] rounded-[3rem] p-12 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-20 -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[130px] opacity-10 -ml-48 -mb-48"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="space-y-6">
            <div>
                <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-4 leading-none">Terminal de Comando Central</h2>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">cael <span className="text-slate-500">logistics</span></h1>
            </div>
            <p className="text-slate-400 text-lg font-medium max-w-xl leading-relaxed">
              Gestão inteligente de fluxos, activos frotistas e conformidade operacional em tempo real.
            </p>
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-[0.2em] leading-none">Volumetria Total</p>
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-black text-white leading-none tracking-tighter">{totalOps + totalDeliveries}</p>
                    <TrendingUp className="text-emerald-500" size={24} />
                </div>
              </div>
              <div className="bg-blue-600/10 border border-blue-500/20 px-8 py-5 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
                <p className="text-[9px] font-black text-blue-400 uppercase mb-2 tracking-[0.2em] leading-none">Fluxos Activos</p>
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-black text-blue-100 leading-none tracking-tighter">{activeOps}</p>
                    <Zap className="text-blue-400 animate-pulse" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full lg:w-96">
            {[
                { tab: 'operations', label: 'Último Carregamento', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-600/10' },
                { tab: 'deliveries', label: 'Registo SST/EPI', icon: HardHat, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
                { tab: 'fleet', label: 'Gestão de Activos', icon: Boxes, color: 'text-amber-400', bg: 'bg-amber-600/10' }
            ].map((link, i) => (
                <button 
                    key={i}
                    onClick={() => setActiveTab(link.tab)} 
                    className="p-5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-500"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 ${link.bg} ${link.color} rounded-xl border border-white/5 group-hover:scale-110 transition-transform`}>
                            <link.icon size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{link.label}</span>
                    </div>
                    <ArrowRight size={18} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Monitor de Atividade Recente */}
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white/[0.02] backdrop-blur-[30px] p-10 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Activity size={24} className="text-blue-400" /> Fluxos Recentes
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 ml-9">Últimas acções registadas no arquivo</p>
              </div>
              <button 
                onClick={() => setActiveTab('operations')} 
                className="bg-white/5 px-6 py-3 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
              >
                Ver Histórico Completo
              </button>
            </div>

            <div className="space-y-4">
              {data.operations.slice(-5).reverse().map((op, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:bg-white/[0.06] transition-all group animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <ContainerIcon size={24} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase leading-none mb-2">{op.client}</p>
                      <div className="flex items-center gap-3">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${op.status === ServiceStatus.DELIVERED ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{op.status}</span>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{op.origin} <ArrowRight size={10} className="inline mx-1" /> {op.destination}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white tracking-widest">{op.startDate}</p>
                    <p className="text-[8px] font-black text-slate-700 uppercase">{op.containerNumber || 'Carga Geral'}</p>
                  </div>
                </div>
              ))}
              {data.operations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-800">
                  <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/5 opacity-40">
                    <FileText size={48} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Nenhum registo no arquivo central</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Top Consumidores */}
            <div className="bg-white/[0.02] backdrop-blur-[30px] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <Droplet size={18} className="text-amber-500" /> Consumo de Combustível
                    </h3>
                    <TrendingUp size={16} className="text-slate-700" />
                </div>
                <div className="space-y-4">
                    {topConsumers.map((tc, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="text-xs font-black text-slate-500 w-6">0{i+1}</div>
                                <div>
                                    <p className="text-xs font-black text-white uppercase leading-none">{tc.vehicle?.plate}</p>
                                    <p className="text-[8px] font-black text-slate-700 uppercase mt-1 tracking-widest">{tc.vehicle?.brand}</p>
                                </div>
                            </div>
                            <span className="text-sm font-black text-blue-400">{tc.liters.toLocaleString()} L</span>
                        </div>
                    ))}
                    {topConsumers.length === 0 && (
                        <p className="text-[9px] font-black text-slate-700 uppercase text-center py-8">Sem dados recentes</p>
                    )}
                </div>
            </div>

            {/* Acesso Rápido a Auditoria */}
            <div className="bg-white/[0.02] backdrop-blur-[30px] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <ShieldCheck size={18} className="text-emerald-500" /> Auditoria Geral
                    </h3>
                    <div className="space-y-4">
                        <div onClick={() => setActiveTab('maintenance')} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <Wrench size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Registos Oficina</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-700">{lastMaintenance?.date || '---'}</span>
                        </div>
                        <div onClick={() => setActiveTab('deliveries')} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <ClipboardCheck size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cartões de EPI</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-700">{lastDelivery?.deliveryDate || '---'}</span>
                        </div>
                    </div>
                </div>
                <button 
                  onClick={() => setActiveTab('auditor')}
                  className="w-full mt-6 py-4 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all shadow-xl"
                >
                    Mapa de Conformidade
                </button>
            </div>
          </div>
        </div>

        {/* Sidebar de Status Lateral */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-white/[0.02] backdrop-blur-[30px] p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10 w-full text-center">Protocolo de Segurança</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceData} innerRadius="75%" outerRadius="95%" paddingAngle={12} dataKey="value" stroke="none" cornerRadius={16}>
                    {complianceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-5xl font-black text-white leading-none tracking-tighter">
                  {Math.round(((Math.max(0, (data.vehicles.length + data.employees.length) - (maintenanceAlerts + epiAlerts))) / (data.vehicles.length + data.employees.length || 1)) * 100)}%
                </span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Compliance</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-10">
              <div className="bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/10 text-center shadow-lg">
                <ShieldAlert className="mx-auto text-rose-500 mb-2" size={20} />
                <p className="text-2xl font-black text-rose-400 leading-none">{maintenanceAlerts + epiAlerts}</p>
                <p className="text-[7px] font-black text-rose-500/50 uppercase tracking-widest mt-2 px-1">Pontos de Atenção</p>
              </div>
              <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 text-center shadow-lg">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={20} />
                <p className="text-2xl font-black text-emerald-400 leading-none">{totalOps}</p>
                <p className="text-[7px] font-black text-emerald-500/50 uppercase tracking-widest mt-2 px-1">Registos Válidos</p>
              </div>
            </div>
            
            <div className="w-full mt-10 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 px-4">
                    <span>Manutenção</span>
                    <span className={maintenanceAlerts > 0 ? 'text-rose-500' : 'text-emerald-500'}>{maintenanceAlerts} ALERTAS</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${Math.min(100, ( (data.vehicles.length - maintenanceAlerts) / (data.vehicles.length || 1)) * 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 px-4 mt-6">
                    <span>Equipamentos (EPI)</span>
                    <span className={epiAlerts > 0 ? 'text-orange-500' : 'text-emerald-500'}>{epiAlerts} EXPIRADOS</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, ( (data.employees.length - epiAlerts) / (data.employees.length || 1)) * 100)}%` }} />
                </div>
            </div>
          </div>
          
          <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
             <ShieldCheck size={40} className="mb-6 opacity-40" />
             <h4 className="text-xl font-black uppercase tracking-tight mb-2">Terminal Seguro</h4>
             <p className="text-blue-100 text-sm font-bold leading-relaxed opacity-80 mb-8">
               Toda a exclusão de dados requer autenticação de segundo factor via **Chave Mestra**.
             </p>
             <button onClick={() => setActiveTab('auditor')} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center justify-center gap-3">
               Relatório Auditoria <ArrowRight size={16} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
