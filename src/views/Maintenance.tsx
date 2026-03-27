import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vehicle, AssetType, MaintenanceType, MaintenanceRecord, AppState, AuthData } from '../types';
import {
  Wrench, Calendar, AlertTriangle, CheckCircle2, ShieldCheck,
  Zap, Plus, X, Search, History, Settings2, User, Gauge,
  Trash2, ShieldAlert, Lock, Loader2, Printer, FileText, ChevronRight,
  Paperclip, FileUp, ImageIcon, Eye, Activity, RefreshCw, Clock,
  ArrowUpRight, TrendingUp, BarChart3, AlertCircle
} from 'lucide-react';
import { handlePrintMaintenance } from '../services/printService';

interface MaintenanceProps {
  data: AppState;
  auth?: { masterKeyHash?: string };
  onAdd: (record: MaintenanceRecord) => void;
  onUpdate: (col: string, item: any) => void;
  onDelete: (id: string, masterKeyHash?: string) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [viewingVehicleHistory, setViewingVehicleHistory] = useState<Vehicle | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Secure Deletion Protocol
  const [itemToDelete, setItemToDelete] = useState<MaintenanceRecord | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    type: MaintenanceType.PREVENTIVE,
    description: '',
    observations: '',
    date: new Date().toISOString().split('T')[0],
    responsible: '',
    currentKm: 0,
    currentHours: 0,
    attachments: []
  });

  const [usageEdit, setUsageEdit] = useState<Record<string, string>>({});
  const [usageUpdating, setUsageUpdating] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (v: Vehicle) => {
    if (!v.lastUsageUpdate) return { days: 15, hours: 0, minutes: 0, seconds: 0, overdue: false };
    const lastMs = new Date(v.lastUsageUpdate).getTime();
    const deadlineMs = lastMs + 15 * 24 * 60 * 60 * 1000;
    const diffMs = deadlineMs - now;
    if (diffMs <= 0) {
      const overdueMs = Math.abs(diffMs);
      const days = Math.floor(overdueMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((overdueMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((overdueMs % (60 * 60 * 1000)) / 60000);
      const seconds = Math.floor((overdueMs % 60000) / 1000);
      return { days, hours, minutes, seconds, overdue: true };
    }
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return { days, hours, minutes, seconds, overdue: false };
  };

  const getUsageInfo = (v: Vehicle) => {
    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
    const unit = isHourBased ? 'h' : 'km';
    const prevUsage = isHourBased ? (v.previousHours || v.lastMaintenanceHours || 0) : (v.previousKm || v.lastMaintenanceKm || 0);
    const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
    const limit = v.maintenanceIntervalKm;
    const used = Math.max(0, currentUsage - prevUsage);
    const percent = limit > 0 && prevUsage > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const remaining = Math.max(0, limit - used);

    const daysSinceUpdate = v.lastUsageUpdate
      ? Math.floor((now - new Date(v.lastUsageUpdate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const needsUpdate = daysSinceUpdate >= 15;

    return { isHourBased, unit, prevUsage, currentUsage, limit, used, percent, remaining, daysSinceUpdate, needsUpdate };
  };

  const handleUsageUpdate = (v: Vehicle) => {
    const raw = usageEdit[v.id];
    if (!raw) return;
    const numVal = Number(raw);
    if (isNaN(numVal) || numVal < 0) return;

    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
    const today = new Date().toISOString().split('T')[0];

    const lastMaintUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
    const usedSinceMaint = numVal - lastMaintUsage;
    const limitReached = lastMaintUsage > 0 && usedSinceMaint >= v.maintenanceIntervalKm;

    if (limitReached) {
      const autoRecord: MaintenanceRecord = {
        id: crypto.randomUUID(),
        vehicleId: v.id,
        type: MaintenanceType.PREVENTIVE,
        description: `Manutenção preventiva automática — limite de ${v.maintenanceIntervalKm.toLocaleString()} ${isHourBased ? 'horas' : 'km'} atingido (leitura: ${numVal.toLocaleString()} ${isHourBased ? 'h' : 'km'}).`,
        responsible: 'Sistema Autómato',
        date: today,
        currentKm: isHourBased ? 0 : numVal,
        currentHours: isHourBased ? numVal : 0,
        isUrgent: false
      };
      onAdd(autoRecord);
      onUpdate('vehicles', {
        ...v,
        currentKm: isHourBased ? v.currentKm : numVal,
        currentHours: isHourBased ? numVal : v.currentHours,
        lastMaintenanceDate: today,
        lastMaintenanceKm: isHourBased ? v.lastMaintenanceKm : numVal,
        lastMaintenanceHours: isHourBased ? numVal : v.lastMaintenanceHours,
        previousKm: isHourBased ? v.previousKm : numVal,
        previousHours: isHourBased ? numVal : v.previousHours,
        lastUsageUpdate: today
      });
    } else {
      onUpdate('vehicles', {
        ...v,
        currentKm: isHourBased ? v.currentKm : numVal,
        currentHours: isHourBased ? numVal : v.currentHours,
        previousKm: isHourBased ? v.previousKm : numVal,
        previousHours: isHourBased ? numVal : v.previousHours,
        lastUsageUpdate: today
      });
    }

    setUsageEdit(prev => { const n = { ...prev }; delete n[v.id]; return n; });
    setUsageUpdating(null);
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;

    try {
        const isValid = await (window as any).electron.ipcRenderer.invoke('verify-password', confirmPassword, auth?.masterKeyHash);
        if (isValid) {
            onDelete(itemToDelete.id);
            setItemToDelete(null);
            setConfirmPassword('');
            setDeleteError(false);
        } else {
            setDeleteError(true);
            setTimeout(() => setDeleteError(false), 2000);
        }
    } catch (err) {
        console.error("Erro na validação da Master Key", err);
        setDeleteError(true);
    }
  };

  const URGENT_KEYWORDS = ['travão', 'freio', 'motor', 'fuga', 'falha', 'quebra', 'óleo', 'fumaça', 'elétrica', 'pneu'];

  const checkUrgency = (desc: string) => {
    const lowerDesc = desc.toLowerCase();
    return URGENT_KEYWORDS.some(kw => lowerDesc.includes(kw));
  };

  const selectedVehicle = useMemo(() => data.vehicles.find(v => v.id === selectedVehicleId), [data.vehicles, selectedVehicleId]);

  const getMaintenanceAlerts = (v: Vehicle) => {
    const alerts = [];
    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;

    const lastRecord = data.maintenanceRecords
      .filter(r => r.vehicleId === v.id)
      .filter(r => isHourBased ? (r.currentHours || 0) > 0 : (r.currentKm || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const baseDate = lastRecord ? new Date(lastRecord.date) : new Date(v.lastMaintenanceDate);
    const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= v.maintenanceIntervalDays) {
      alerts.push({ type: 'date', message: `Prazo Excedido (${diffDays} dias)` });
    }

    const lastUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
    const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
    if (currentUsage > 0 && lastUsage > 0 && currentUsage - lastUsage >= v.maintenanceIntervalKm) {
      alerts.push({ type: 'usage', message: `Limite de Uso Atingido` });
    }

    return alerts;
  };

  const filteredHistory = useMemo(() => {
    return data.maintenanceRecords.filter(record => {
      const v = data.vehicles.find(v => v.id === record.vehicleId);
      const searchLower = historySearch.toLowerCase();
      return (
        v?.plate.toLowerCase().includes(searchLower) ||
        v?.brand.toLowerCase().includes(searchLower) ||
        v?.model.toLowerCase().includes(searchLower) ||
        record.description.toLowerCase().includes(searchLower) ||
        record.responsible.toLowerCase().includes(searchLower)
      );
    }).slice().reverse();
  }, [data.maintenanceRecords, data.vehicles, historySearch]);

  const vehicleSpecificHistory = useMemo(() => {
    if (!viewingVehicleHistory) return [];
    return data.maintenanceRecords
      .filter(r => r.vehicleId === viewingVehicleHistory.id)
      .slice().reverse();
  }, [data.maintenanceRecords, viewingVehicleHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentAttachments = newRecord.attachments || [];
    if (currentAttachments.length >= 3) {
      alert("Limite máximo de 3 ficheiros atingido.");
      return;
    }

    const availableSlots = 3 - currentAttachments.length;
    const filesToProcess = (Array.from(files) as File[]).slice(0, availableSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRecord(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setNewRecord(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index)
    }));
  };

  const onPrint = (record: MaintenanceRecord) => {
    handlePrintMaintenance(record, data);
  };

  const handleReview = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;

    const vehicle = data.vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const isHourBased = vehicle.type === AssetType.MACHINE || vehicle.type === AssetType.CRANE_TRUCK;
    const finalKm = newRecord.currentKm || vehicle.currentKm || 0;
    const finalHours = newRecord.currentHours || vehicle.currentHours || 0;

    const record: MaintenanceRecord = {
      ...newRecord as MaintenanceRecord,
      currentKm: isHourBased ? 0 : finalKm,
      currentHours: isHourBased ? finalHours : 0,
      id: crypto.randomUUID(),
      vehicleId: selectedVehicleId,
      isUrgent: checkUrgency(newRecord.description || '')
    };

    onAdd(record);

    if (vehicle) {
      const updatedVehicle = {
        ...vehicle,
        lastMaintenanceDate: record.date,
        lastMaintenanceKm: isHourBased ? vehicle.lastMaintenanceKm : finalKm,
        lastMaintenanceHours: isHourBased ? finalHours : vehicle.lastMaintenanceHours,
        currentKm: isHourBased ? vehicle.currentKm : finalKm,
        currentHours: isHourBased ? finalHours : vehicle.currentHours
      };
      onUpdate('vehicles', updatedVehicle);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setNewRecord({
      type: MaintenanceType.PREVENTIVE,
      description: '',
      observations: '',
      date: new Date().toISOString().split('T')[0],
      responsible: '',
      currentKm: 0,
      currentHours: 0,
      attachments: []
    });
    setSelectedVehicleId('');
  };

  const viewAttachment = (base64: string) => {
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  return (
    <div className="space-y-12 pb-24 scroll-container animate-in fade-in duration-1000">
      {/* Premium Diagnostic Hub Header */}
      <div className="flex flex-col xl:flex-row gap-10">
        <div className="flex-1 bg-slate-900/50 backdrop-blur-[40px] rounded-[3.5rem] p-12 border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/10">
                <Settings2 size={32} className="group-hover:rotate-180 transition-transform duration-1000" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tighter leading-none"><span className="text-blue-400">Terminal</span> de Diagnóstico</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Gestão de Integridade Operacional 360º</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-xl leading-relaxed">Sincronização de manutenção preditiva industrial em conformidade com normas técnicas de transporte pesado e segurança de ativos.</p>
            <div className="flex flex-wrap gap-6 mt-10">
              <button 
                onClick={() => setShowForm(true)} 
                className="bg-blue-600 text-white px-10 py-6 rounded-2xl hover:bg-blue-500 transition-all font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 border border-white/10 group flex items-center gap-4"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" /> Registar Intervenção
              </button>
              <button className="bg-white/[0.03] text-slate-500 px-10 py-6 rounded-2xl hover:bg-white/[0.05] hover:text-white transition-all font-black uppercase tracking-[0.3em] text-[10px] border border-white/5 flex items-center gap-4">
                 <Printer size={20} /> Relatório Global
              </button>
            </div>
          </div>
        </div>

        <div className="xl:w-[450px] bg-slate-900/50 backdrop-blur-[40px] rounded-[3.5rem] p-12 border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 blur-[80px] rounded-full -mr-24 -mt-24 transition-all duration-1000 group-hover:bg-rose-600/20"></div>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 flex items-center justify-center shadow-inner">
               <AlertCircle size={28} className="animate-pulse" />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Status de Risco</p>
               <h4 className="text-lg font-black text-white uppercase tracking-tighter">Alertas Activos</h4>
            </div>
          </div>
          <p className="text-6xl font-black text-white tracking-tighter leading-none">{data.vehicles.filter(v => getMaintenanceAlerts(v).length > 0).length}</p>
          <div className="flex items-center gap-3 mt-8">
             <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
             <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Inspecções Críticas Pendentes</p>
          </div>
        </div>
      </div>

      {/* Real-time Telemetric Monitor */}
      <div className="bg-slate-900/50 backdrop-blur-[40px] rounded-[3.5rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
               <Activity size={24} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Monitor Telemetria Quinzenal</h4>
              <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest mt-2">Sincronização Obrigatória (Ciclo 15 Dias) • Auto-Manutenção Preventiva</p>
            </div>
          </div>
          {data.vehicles.filter(v => getUsageInfo(v).needsUpdate).length > 0 && (
            <div className="px-6 py-3 bg-amber-500/5 border border-amber-500/20 rounded-full flex items-center gap-3 animate-pulse">
               <Clock size={14} className="text-amber-400" />
               <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">{data.vehicles.filter(v => getUsageInfo(v).needsUpdate).length} Unidades em Atraso</span>
            </div>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {data.vehicles.map((v, idx) => {
            const info = getUsageInfo(v);
            const isEditing = usageUpdating === v.id;
            const progressColor = info.percent >= 100 ? 'bg-rose-500' : info.percent >= 80 ? 'bg-amber-500' : 'bg-blue-500';
            const shadowColor = info.percent >= 100 ? 'shadow-[0_0_20px_rgba(244,63,94,0.3)]' : info.percent >= 80 ? 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_20px_rgba(59,130,246,0.3)]';

            return (
              <div key={v.id} className={`p-10 hover:bg-white/[0.02] transition-all duration-700 animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-10">
                  <div className="flex items-center gap-8 min-w-[280px]">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-110">
                          {v.photo ? <img src={v.photo} className="w-full h-full object-cover" /> : <Wrench size={32} className="text-slate-800 m-auto absolute inset-0" />}
                        </div>
                        {info.needsUpdate && <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl"><AlertTriangle size={10} className="text-slate-950" /></div>}
                    </div>
                    <div>
                      <p className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-2">{v.brand} {v.model}</p>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{v.plate} • {v.type}</p>
                      <div className="mt-4">
                        {(() => {
                            const cd = getCountdown(v);
                            return (
                            <span className={`inline-flex items-center gap-3 text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border transition-colors duration-700 ${cd.overdue ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse' : 'text-slate-500 bg-white/5 border-white/10'}`}>
                                <Clock size={12} />
                                {cd.overdue ? `Atraso: ${cd.days}d ${cd.hours}h` : `Próx: ${cd.days}d ${cd.hours}h`}
                            </span>
                            );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white tracking-tighter">{info.currentUsage.toLocaleString()}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{info.unit}</span>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${info.percent >= 100 ? 'text-rose-400' : info.percent >= 80 ? 'text-amber-400' : 'text-blue-400'}`}>
                        {info.percent}% • {info.percent >= 100 ? 'Intervenção Crítica' : `Faltam ${info.remaining.toLocaleString()} ${info.unit}`}
                      </span>
                    </div>
                    <div className="h-4 bg-white/[0.03] rounded-full border border-white/5 overflow-hidden p-1 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor} ${shadowColor}`}
                        style={{ width: `${Math.min(100, info.percent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">
                      <span>Baseline: {info.prevUsage.toLocaleString()}</span>
                      <span>Target: {(info.prevUsage + info.limit).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-blue-500/30">
                        <input
                          autoFocus
                          type="number"
                          className="w-28 px-4 py-3 bg-transparent text-white font-black text-sm outline-none placeholder:text-slate-800"
                          value={usageEdit[v.id] || ''}
                          onChange={e => setUsageEdit(prev => ({ ...prev, [v.id]: e.target.value }))}
                          placeholder="Nova Leitura"
                          onKeyDown={e => e.key === 'Enter' && handleUsageUpdate(v)}
                        />
                        <button onClick={() => handleUsageUpdate(v)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-500 transition-all"><CheckCircle2 size={20} /></button>
                        <button onClick={() => setUsageUpdating(null)} className="w-10 h-10 bg-white/5 text-slate-500 rounded-xl flex items-center justify-center hover:text-white transition-all"><X size={20} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setUsageUpdating(v.id); setUsageEdit(prev => ({ ...prev, [v.id]: String(info.currentUsage) })); }}
                        className={`px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all active:scale-95 border flex items-center gap-4 shadow-xl ${info.needsUpdate ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-white'}`}
                      >
                        <RefreshCw size={16} className={info.needsUpdate ? 'animate-spin-slow' : ''} /> Actualizar Telemetria
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Alerts & Critical Windows */}
        <div className="bg-slate-900/50 backdrop-blur-[40px] rounded-[3.5rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-inner">
                 <AlertTriangle size={24} />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Gestor de Conformidade</h4>
            </div>
            <ArrowUpRight size={20} className="text-slate-800" />
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px] scroll-container flex-1">
            {data.vehicles.map((v, idx) => {
              const alerts = getMaintenanceAlerts(v);
              const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
              const unit = isHourBased ? 'H' : 'KM';

              const baseDate = new Date(v.lastMaintenanceDate);
              const nextDate = new Date(baseDate);
              nextDate.setDate(baseDate.getDate() + v.maintenanceIntervalDays);
              const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              const lastUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
              const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
              const nextUsage = lastUsage > 0 ? lastUsage + v.maintenanceIntervalKm : null;
              const usageLeft = nextUsage ? nextUsage - currentUsage : null;

              return (
                <div key={v.id} className={`p-10 hover:bg-white/[0.03] transition-all group cursor-pointer relative overflow-hidden`} onClick={() => setViewingVehicleHistory(v)}>
                  <div className="flex items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-8">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700 ${alerts.length > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-2xl shadow-amber-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {v.photo ? <img src={v.photo} className="w-full h-full object-cover rounded-xl" /> : <Gauge size={24} />}
                       </div>
                       <div>
                          <h5 className="font-black text-white text-base uppercase tracking-tighter leading-none mb-3 group-hover:text-blue-400 transition-colors">{v.plate}</h5>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{v.brand} {v.model}</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                       {alerts.length > 0 ? (
                          <div className="flex flex-col items-end gap-3">
                             {alerts.map((a, i) => <span key={i} className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse shadow-2xl shadow-rose-600/30">{a.message}</span>)}
                             <button onClick={(e) => { e.stopPropagation(); handleReview(v.id); }} className="text-[9px] font-black text-blue-400 uppercase tracking-widest py-2 px-4 bg-blue-600/10 rounded-lg hover:bg-blue-600 hover:text-white transition-all">Ver Detalhes</button>
                          </div>
                       ) : (
                          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                             <CheckCircle2 size={12} />
                             <span className="text-[9px] font-black uppercase tracking-widest">Conforme</span>
                          </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="mt-8 flex gap-6">
                     <div className="flex-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Janela de Tempo</p>
                        <p className={`text-[10px] font-black uppercase ${daysLeft <= 0 ? 'text-rose-400' : 'text-slate-400'}`}>{nextDate.toLocaleDateString()} ({daysLeft}d)</p>
                     </div>
                     <div className="flex-1 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Escala de Uso</p>
                        <p className={`text-[10px] font-black uppercase ${usageLeft !== null && usageLeft <= 0 ? 'text-rose-400' : 'text-slate-400'}`}>{nextUsage?.toLocaleString() || '---'} {unit}</p>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical Ledger History */}
        <div className="bg-slate-900/50 backdrop-blur-[40px] rounded-[3.5rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                 <History size={24} />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Ledger de Intervenções</h4>
            </div>
            <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
                <input 
                    type="text" 
                    placeholder="Pesquisar histórico..." 
                    className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-blue-500/40 w-48 placeholder:text-slate-800"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                />
            </div>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px] scroll-container flex-1">
            {filteredHistory.map((record, idx) => {
              const v = data.vehicles.find(v => v.id === record.vehicleId);
              return (
                <div key={record.id} className="p-10 hover:bg-white/[0.03] transition-all group border-l-4 border-transparent hover:border-blue-500">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${record.type === MaintenanceType.CORRECTIVE ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{record.type}</span>
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</span>
                       </div>
                       <h5 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => setSelectedRecord(record)}>{v?.plate} • {v?.brand}</h5>
                    </div>
                    <div className="flex items-center gap-3">
                       <button onClick={() => onPrint(record)} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-700 hover:text-blue-400 transition-all"><Printer size={20} /></button>
                       <button onClick={() => { setItemToDelete(record); }} className="p-3 bg-white/5 border border-white/10 rounded-xl text-slate-700 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">{record.description}</p>
                  
                  {record.attachments && record.attachments.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-4">
                       {record.attachments.map((_, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] font-black text-slate-700">
                             <Paperclip size={12} /> ANEXO 0{i+1}
                          </div>
                       ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Specific Vehicle History Modal */}
      {viewingVehicleHistory && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-[20px] z-[200] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-slate-900/80 backdrop-blur-[40px] rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)]">
            <div className="p-12 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] border border-blue-500/20 flex items-center justify-center shadow-inner">
                   {viewingVehicleHistory.photo ? <img src={viewingVehicleHistory.photo} className="w-full h-full object-cover rounded-[1.8rem]" /> : <Wrench size={40} className="text-blue-400" />}
                </div>
                <div>
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{viewingVehicleHistory.plate}</h2>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3">{viewingVehicleHistory.brand} {viewingVehicleHistory.model} • Histórico Técnico</p>
                </div>
              </div>
              <button onClick={() => setViewingVehicleHistory(null)} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {vehicleSpecificHistory.length > 0 ? vehicleSpecificHistory.map((record, idx) => (
                    <div key={record.id} className="p-8 bg-white/[0.02] rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group animate-in slide-in-from-bottom-8" style={{ animationDelay: `${idx * 100}ms` }}>
                       <div className="flex justify-between items-start mb-6">
                          <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${record.type === MaintenanceType.CORRECTIVE ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{record.type}</span>
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</span>
                       </div>
                       <h6 className="text-lg font-black text-white uppercase tracking-tighter mb-4">{record.responsible}</h6>
                       <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">{record.description}</p>
                       <div className="flex items-center justify-between pt-6 border-t border-white/5">
                          <div className="flex items-center gap-2">
                             <Gauge size={14} className="text-slate-800" />
                             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{record.currentKm || record.currentHours || '---'} {viewingVehicleHistory.type === AssetType.MACHINE ? 'H' : 'KM'}</span>
                          </div>
                          <button onClick={() => onPrint(record)} className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline px-4 py-2 bg-blue-600/5 rounded-lg transition-all">Exportar PDF</button>
                       </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-32 text-center">
                       <History size={64} className="text-slate-900 mx-auto mb-8 opacity-20" />
                       <p className="text-slate-700 font-black uppercase text-[12px] tracking-[0.4em]">Nenhuma intervenção registada para este activo</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-[20px] z-[300] flex items-center justify-center p-6 overflow-y-auto animate-in fade-in duration-500">
          <div className="bg-slate-900/80 backdrop-blur-[40px] rounded-[3.5rem] w-full max-w-4xl p-12 border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] my-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                   <Wrench size={28} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Registo de Intervenção <span className="text-blue-400">Técnica</span></h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-white transition-colors"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Ativo em Oficina</label>
                    <select 
                        required 
                        className="w-full px-8 py-5 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-sm outline-none focus:border-blue-500/50 appearance-none cursor-pointer placeholder:text-slate-800"
                        value={selectedVehicleId}
                        onChange={e => setSelectedVehicleId(e.target.value)}
                    >
                        <option value="" className="bg-slate-900 text-slate-500">Escolha o Activo...</option>
                        {data.vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate} - {v.brand} {v.model}</option>)}
                    </select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Natureza do Serviço</label>
                    <select 
                        required 
                        className="w-full px-8 py-5 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-sm outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                        value={newRecord.type}
                        onChange={e => setNewRecord({...newRecord, type: e.target.value as MaintenanceType})}
                    >
                        {Object.values(MaintenanceType).map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Relatório Técnico Detalhado</label>
                 <textarea 
                    required 
                    placeholder="Descreva as anomalias detectadas e os serviços executados..." 
                    className="w-full px-8 py-6 bg-white/[0.03] border border-white/10 rounded-[2rem] font-medium text-white text-sm outline-none focus:border-blue-500/50 min-h-[160px] custom-scrollbar placeholder:text-slate-800"
                    value={newRecord.description}
                    onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{selectedVehicle?.type === AssetType.MACHINE ? 'Horas Actuais' : 'Km Actual'}</label>
                    <input 
                        required 
                        type="number" 
                        className="w-full px-8 py-5 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-sm outline-none focus:border-blue-500/50"
                        value={selectedVehicle?.type === AssetType.MACHINE ? (newRecord.currentHours || '') : (newRecord.currentKm || '')}
                        onChange={e => selectedVehicle?.type === AssetType.MACHINE ? setNewRecord({...newRecord, currentHours: Number(e.target.value)}) : setNewRecord({...newRecord, currentKm: Number(e.target.value)})}
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Responsável Técnica</label>
                    <input 
                        required 
                        placeholder="Mecânico ou Oficina" 
                        className="w-full px-8 py-5 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-sm outline-none focus:border-blue-500/50 placeholder:text-slate-800"
                        value={newRecord.responsible}
                        onChange={e => setNewRecord({...newRecord, responsible: e.target.value})}
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Data Execução</label>
                    <input 
                        required 
                        type="date" 
                        className="w-full px-8 py-5 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-sm outline-none focus:border-blue-500/50"
                        value={newRecord.date}
                        onChange={e => setNewRecord({...newRecord, date: e.target.value})}
                    />
                 </div>
              </div>

              <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem]">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
                           <Paperclip size={18} className="text-blue-400" /> Documentação Auxiliar (Max 3)
                        </h4>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95"
                    >
                        <FileUp size={24} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileUpload} />
                 </div>
                 <div className="grid grid-cols-3 gap-6">
                    {(newRecord.attachments || []).map((att, idx) => (
                        <div key={idx} className="relative aspect-video bg-slate-950 rounded-2xl border border-white/5 overflow-hidden group shadow-2xl">
                           {att.startsWith('data:image') ? <img src={att} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-800"><FileText size={32} /></div>}
                           <div className="absolute inset-0 bg-rose-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[4px]">
                              <button type="button" onClick={() => removeAttachment(idx)} className="p-3 bg-white text-rose-600 rounded-xl shadow-2xl transition-transform active:scale-90"><Trash2 size={20} /></button>
                           </div>
                        </div>
                    ))}
                    {Array.from({ length: 3 - (newRecord.attachments?.length || 0) }).map((_, i) => (
                        <div key={i} className="aspect-video bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-slate-900 group-hover:border-blue-500/30 transition-colors">
                           <ImageIcon size={32} />
                        </div>
                    ))}
                 </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-[0_32px_128px_rgba(37,99,235,0.3)] active:scale-95 transition-all border border-white/10 flex items-center justify-center gap-6 group">
                <ShieldCheck size={28} className="group-hover:scale-110 transition-transform" /> Validar & Sincronizar Intervenção
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Secure Deletion Protocol Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-[30px] z-[500] flex items-center justify-center p-6 duration-500 animate-in fade-in">
          <div className={`bg-slate-900/80 backdrop-blur-[40px] rounded-[3.5rem] p-12 w-full max-w-lg border border-white/10 shadow-[0_64px_256px_rgba(0,0,0,0.8)] relative overflow-hidden text-center scale-up-center ${deleteError ? 'animate-shake' : ''}`}>
             <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-rose-600/50 to-transparent"></div>
             
             <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-[0_0_60px_rgba(244,63,94,0.1)]">
                <ShieldAlert size={48} />
             </div>

             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Protocolo de Exclusão</h3>
             <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto mb-12">Esta operação é irreversível e requer autorização via <b>Master Key</b> para manter a integridade fiscal do ledger.</p>

             <form onSubmit={handleSecureDelete} className="space-y-8">
                <div className="relative">
                   <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" size={24} />
                   <input 
                      required 
                      autoFocus 
                      type="password" 
                      placeholder="Master Key Chave" 
                      className="w-full pl-16 pr-8 py-6 bg-white/[0.03] border border-white/10 rounded-2xl font-black text-white text-base outline-none focus:border-rose-500/50 tracking-[0.6em] transition-all placeholder:text-[10px] placeholder:tracking-[0.3em] placeholder:text-slate-800" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                   />
                </div>
                
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setItemToDelete(null)} className="flex-1 py-6 bg-white/5 text-slate-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] border border-white/5 hover:bg-white/10 hover:text-white transition-all">Cancelar</button>
                   <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_60px_rgba(225,29,72,0.3)] active:scale-95 transition-all flex items-center justify-center gap-4">
                      {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />} Confirmar Exclusão
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Technical Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-[20px] z-[250] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-slate-900/80 backdrop-blur-[40px] rounded-[3.5rem] w-full max-w-3xl overflow-hidden border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] flex flex-col relative">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-50 pointer-events-none"></div>
             
             <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 flex items-center justify-center shadow-xl">
                      <FileText size={28} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Ficha Técnica</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">Detalhamento de Intervenção de Oficina</p>
                   </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white"><X size={24} /></button>
             </div>

             <div className="p-12 space-y-12 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">Registado em</p>
                      <p className="text-sm font-black text-white">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                   </div>
                   <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">Escopo</p>
                      <p className={`text-[10px] font-black uppercase ${selectedRecord.type === MaintenanceType.CORRECTIVE ? 'text-amber-400' : 'text-blue-400'}`}>{selectedRecord.type}</p>
                   </div>
                   <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">Técnico</p>
                      <p className="text-sm font-black text-white truncate">{selectedRecord.responsible}</p>
                   </div>
                   <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-3">Leitura Local</p>
                      <p className="text-sm font-black text-white tracking-widest">{selectedRecord.currentKm || selectedRecord.currentHours || '---'}</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-6">Parecer Técnico e Acções Operacionais</p>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{selectedRecord.description}</p>
                   </div>
                   
                   {selectedRecord.observations && (
                      <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-6">Considerações Suplementares</p>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed italic">{selectedRecord.observations}</p>
                      </div>
                   )}
                </div>

                {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                   <div className="space-y-6">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Repositório de Anexos Digitais</p>
                      <div className="flex flex-wrap gap-4">
                         {selectedRecord.attachments.map((att, i) => (
                            <button key={i} onClick={() => viewAttachment(att)} className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all">
                               <Paperclip size={18} className="text-blue-400" /> ANEXO_DOC_0{i+1}.DAT
                            </button>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             <div className="p-12 bg-white/[0.02] border-t border-white/5 flex gap-6">
                <button onClick={() => onPrint(selectedRecord)} className="flex-1 bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 active:scale-95 transition-all">
                   <Printer size={20} /> Exportar Dossiê Técnico
                </button>
                <button onClick={() => setSelectedRecord(null)} className="px-12 py-6 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] text-slate-500 hover:text-white transition-all">Fechar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;

