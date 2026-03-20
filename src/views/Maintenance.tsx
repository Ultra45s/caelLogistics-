
import React, { useState, useMemo, useRef } from 'react';
import { Vehicle, AssetType, MaintenanceType, MaintenanceRecord, AppState, AuthData } from '../types';
import { hashCredential } from '../db';
import { handlePrintMaintenance } from '../services/printService';
import {
  Wrench, Calendar, AlertTriangle, CheckCircle2, ShieldCheck,
  Zap, Plus, X, Search, History, Settings2, User, Gauge,
  Trash2, ShieldAlert, Lock, Loader2, Printer, FileText, ChevronRight,
  Paperclip, FileUp, ImageIcon, Eye, Activity, RefreshCw, Clock
} from 'lucide-react';

interface MaintenanceProps {
  data: AppState;
  auth?: AuthData;
  onAdd: (record: MaintenanceRecord) => void;
  onUpdate: (col: string, item: any) => void;
  onDelete: (id: string) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [viewingVehicleHistory, setViewingVehicleHistory] = useState<Vehicle | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exclusão Segura
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

  // Monitor de Uso Quinzenal
  const [usageEdit, setUsageEdit] = useState<Record<string, string>>({});
  const [usageUpdating, setUsageUpdating] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Atualiza o relógio a cada segundo para o cronómetro regressivo em tempo real
  React.useEffect(() => {
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
    // Usa previousKm/Hours como baseline (leitura anterior guardada)
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

    // Verifica PRIMEIRO se atingiu o limite (compara contra lastMaintenance baseline)
    const lastMaintUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
    const usedSinceMaint = numVal - lastMaintUsage;
    const limitReached = lastMaintUsage > 0 && usedSinceMaint >= v.maintenanceIntervalKm;

    if (limitReached) {
      // Cria registo de manutenção Preventiva automática
      const autoRecord: MaintenanceRecord = {
        id: crypto.randomUUID(),
        vehicleId: v.id,
        type: MaintenanceType.PREVENTIVE,
        description: `Manutenção preventiva automática — limite de ${v.maintenanceIntervalKm.toLocaleString()} ${isHourBased ? 'horas' : 'km'} atingido (leitura: ${numVal.toLocaleString()} ${isHourBased ? 'h' : 'km'}).`,
        responsible: 'Sistema',
        date: today,
        currentKm: isHourBased ? 0 : numVal,
        currentHours: isHourBased ? numVal : 0,
        isUrgent: false
      };
      onAdd(autoRecord);
      // Reset COMPLETO: atualiza baseline de manutenção E de progresso
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
      // Apenas atualiza leitura + guarda leitura anterior como novo baseline do progress
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

    // Se não existe Chave Mestra configurada, apaga diretamente
    if (!auth || !auth.passwordHash) {
      onDelete(itemToDelete.id);
      setItemToDelete(null);
      setConfirmPassword('');
      return;
    }

    setIsVerifying(true);
    setDeleteError(false);
    try {
      const loginHash = await hashCredential(confirmPassword, auth.salt);
      if (loginHash.hash === auth.passwordHash) {
        onDelete(itemToDelete.id);
        setItemToDelete(null);
        setConfirmPassword('');
      } else {
        setDeleteError(true);
        setTimeout(() => setDeleteError(false), 2000);
      }
    } catch (err) { console.error(err); } finally { setIsVerifying(false); }
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

    // Data: usa a data do último registo válido, senão a data do veículo
    const lastRecord = data.maintenanceRecords
      .filter(r => r.vehicleId === v.id)
      .filter(r => isHourBased ? (r.currentHours || 0) > 0 : (r.currentKm || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const baseDate = lastRecord ? new Date(lastRecord.date) : new Date(v.lastMaintenanceDate);
    const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= v.maintenanceIntervalDays) {
      alerts.push({ type: 'date', message: `Prazo Excedido (${diffDays} dias)` });
    }

    // Uso: compara currentKm/Hours contra o valor guardado na última manutenção
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
    <div className="space-y-10 pb-24 animate-in fade-in duration-700 scroll-container">
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 glass-panel rounded-lg p-12 text-text-main relative overflow-hidden shadow-2xl border border-white/10 group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32 group-hover:opacity-30 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-10 -ml-24 -mb-24 group-hover:opacity-20 transition-opacity duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><Settings2 size={32} className="animate-spin-slow" /></div>
              <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Gestão <span className="text-blue-400">Oficina</span> 360º</h3>
            </div>
            <p className="text-slate-400 text-base font-medium max-w-xl leading-relaxed">Controle preditivo industrial em conformidade com normas técnicas de transporte pesado e segurança operacional.</p>
            <button onClick={() => setShowForm(true)} className="mt-10 bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-2xl shadow-blue-600/30 transition-all active:scale-95 border border-blue-400/20">
              <Plus size={22} /> Registar Nova Intervenção
            </button>
          </div>
        </div>

        <div className="w-full xl:w-96 glass-card rounded-lg p-10 border border-white/10 flex flex-col justify-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
          <div className="flex items-center gap-5 mb-6">
            <div className="p-4 bg-rose-600/10 text-rose-400 rounded-lg border border-rose-500/20 shadow-xl shadow-rose-600/5"><AlertTriangle size={32} className="animate-pulse" /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Pendências</span>
          </div>
          <p className="text-5xl font-black text-text-main tracking-tighter leading-none">{data.vehicles.filter(v => getMaintenanceAlerts(v).length > 0).length}</p>
          <p className="text-[10px] font-black text-rose-400 uppercase mt-4 tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Vencidas ou Próximas
          </p>
        </div>
      </div>

      {/* MONITOR DE USO QUINZENAL */}
      <div className="glass-panel rounded-lg border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20"><Activity size={20} /></div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Monitor de Uso Quinzenal</h4>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1">Atualize a leitura a cada 15 dias · Limite atingido = Manutenção Geral automática</p>
            </div>
          </div>
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest hidden md:block">
            {data.vehicles.filter(v => getUsageInfo(v).needsUpdate).length > 0 && (
              <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-2"><Clock size={12} /> {data.vehicles.filter(v => getUsageInfo(v).needsUpdate).length} a aguardar atualização</span>
            )}
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {data.vehicles.map(v => {
            const info = getUsageInfo(v);
            const isEditing = usageUpdating === v.id;
            const progressColor = info.percent >= 100 ? 'bg-rose-500' : info.percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
            const borderColor = info.percent >= 100 ? 'border-rose-500/20' : info.percent >= 80 ? 'border-amber-500/20' : 'border-emerald-500/20';

            return (
              <div key={v.id} className={`p-6 hover:bg-white/5 transition-all ${info.percent >= 100 ? 'bg-rose-500/5' : info.needsUpdate ? 'bg-amber-500/5' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Ícone + Nome */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center border ${borderColor} overflow-hidden shrink-0`}>
                      {v.photo ? <img src={v.photo} className="w-full h-full object-cover" /> : <Wrench size={24} className={info.percent >= 100 ? 'text-rose-400' : info.percent >= 80 ? 'text-amber-400' : 'text-emerald-400'} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-text-main uppercase tracking-tight leading-none">{v.brand} {v.model}</p>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{v.plate} · {v.type}</p>
                      {/* Cronómetro Regressivo de 15 Dias */}
                      {(() => {
                        const cd = getCountdown(v);
                        return (
                          <span className={`mt-1.5 inline-flex items-center gap-1.5 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${cd.overdue
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : cd.days < 3
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            }`}>
                            <Clock size={9} />
                            {cd.overdue
                              ? `${cd.days}d ${cd.hours}h ${cd.minutes}m ${cd.seconds}s em atraso`
                              : !v.lastUsageUpdate
                                ? 'Nunca atualizado'
                                : `Próx. leitura: ${cd.days}d ${cd.hours}h ${cd.minutes}m ${cd.seconds}s`
                            }
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {info.currentUsage.toLocaleString()} {info.unit} atual
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${info.percent >= 100 ? 'text-rose-400' : info.percent >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {info.percent}% {info.percent >= 100 ? '— LIMITE ATINGIDO' : `· Faltam ${info.remaining.toLocaleString()} ${info.unit}`}
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${progressColor} ${info.percent >= 100 ? 'animate-pulse' : ''}`}
                        style={{ width: `${Math.min(100, info.percent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                      <span>BASE: {info.prevUsage > 0 ? `${info.prevUsage.toLocaleString()} ${info.unit}` : 'N/A'}</span>
                      <span>LIMITE: {(info.prevUsage > 0 ? info.prevUsage + info.limit : info.limit).toLocaleString()} {info.unit}</span>
                    </div>
                  </div>

                  {/* Botão / Form de atualização */}
                  <div className="shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          placeholder={`${info.currentUsage}`}
                          value={usageEdit[v.id] || ''}
                          onChange={e => setUsageEdit(prev => ({ ...prev, [v.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleUsageUpdate(v); if (e.key === 'Escape') setUsageUpdating(null); }}
                          className="w-32 px-3 py-2.5 bg-white/5 border border-blue-500/30 rounded-lg text-text-main font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <button
                          onClick={() => handleUsageUpdate(v)}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20"
                        >OK</button>
                        <button
                          onClick={() => setUsageUpdating(null)}
                          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 hover:text-text-main hover:bg-white/10 transition-all"
                        ><X size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setUsageUpdating(v.id); setUsageEdit(prev => ({ ...prev, [v.id]: String(info.currentUsage) })); }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border ${info.needsUpdate || info.percent >= 80 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-text-main'}`}
                      >
                        <RefreshCw size={14} />
                        Atualizar Leitura
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {data.vehicles.length === 0 && (
            <div className="py-16 text-center text-slate-600 font-black text-[10px] uppercase tracking-widest">Sem veículos registados</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-panel rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20"><Gauge size={20} /></div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Monitor de Prazos e Alertas</h4>
            </div>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[700px] scroll-container">
            {data.vehicles.map(v => {
              const alerts = getMaintenanceAlerts(v);
              const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;
              const unit = isHourBased ? 'H' : 'KM';

              // Próxima data 
              const baseDate = new Date(v.lastMaintenanceDate);
              const nextDate = new Date(baseDate);
              nextDate.setDate(baseDate.getDate() + v.maintenanceIntervalDays);
              const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              // Próximo KM/Hora
              const lastUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
              const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
              const nextUsage = lastUsage > 0 ? lastUsage + v.maintenanceIntervalKm : null;
              const usageLeft = nextUsage ? nextUsage - currentUsage : null;

              return (
                <div key={v.id} className={`p-8 hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer ${alerts.length > 0 ? 'bg-amber-500/5' : ''}`} onClick={() => setViewingVehicleHistory(v)}>
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center border transition-all duration-500 group-hover:scale-110 ${alerts.length > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-xl shadow-amber-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-xl shadow-emerald-500/10'}`}>
                      {v.photo ? <img src={v.photo} className="w-full h-full object-cover rounded-lg" /> : <Wrench size={28} />}
                    </div>
                    <div>
                      <h5 className="font-black text-text-main text-base uppercase tracking-tight leading-none mb-2">{v.brand} {v.model}</h5>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{v.plate}</p>
                      <div className="flex gap-3 flex-wrap">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-md border ${daysLeft <= 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          daysLeft <= 30 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                          📅 {nextDate.toLocaleDateString('pt-PT')} {daysLeft <= 0 ? `(${Math.abs(daysLeft)} dias atraso)` : `(${daysLeft}d)`}
                        </span>
                        {nextUsage !== null && (
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-md border ${usageLeft !== null && usageLeft <= 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            usageLeft !== null && usageLeft <= v.maintenanceIntervalKm * 0.1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            🔧 {nextUsage.toLocaleString()} {unit} {usageLeft !== null && usageLeft <= 0 ? '(ultrapassado)' : usageLeft !== null ? `(faltam ${usageLeft.toLocaleString()})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {alerts.length > 0 ? (
                      <div className="flex flex-col items-end gap-3">
                        {alerts.map((a, i) => <span key={i} className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse border border-rose-400/20 shadow-lg shadow-rose-600/20">{a.message}</span>)}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReview(v.id); }}
                          className="bg-white/5 text-text-main px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 border border-white/10 shadow-sm"
                        >
                          Efetuar Revisão <ChevronRight size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border border-emerald-500/20 shadow-sm">
                        <CheckCircle2 size={14} /> Operacional
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20"><History size={20} /></div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Histórico Técnico</h4>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input
                type="text"
                placeholder="Filtrar..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-text-main outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[700px] scroll-container">
            {filteredHistory.map(record => {
              const v = data.vehicles.find(v => v.id === record.vehicleId);
              return (
                <div key={record.id} className="p-8 hover:bg-white/5 transition-all border-l-4 border-l-transparent hover:border-l-blue-500 group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${record.type === MaintenanceType.CORRECTIVE ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{record.type}</span>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => onPrint(record)} className="text-slate-600 hover:text-blue-400 p-2.5 bg-white/5 hover:bg-blue-500/10 rounded-lg transition-all border border-white/5" title="Imprimir Ficha"><Printer size={18} /></button>
                      <button onClick={() => setItemToDelete(record)} className="text-slate-800 hover:text-rose-500 p-2.5 bg-white/5 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/5"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <h5 className="text-base font-black text-text-main uppercase mb-2 tracking-tight leading-none cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setSelectedRecord(record)}>{v?.brand} {v?.model} - <span className="text-blue-400">{v?.plate}</span></h5>
                  <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">{record.description}</p>

                  {record.attachments && record.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {record.attachments.map((att, i) => (
                        <button
                          key={i}
                          onClick={() => viewAttachment(att)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 rounded-lg transition-all border border-white/5 shadow-sm"
                        >
                          <Paperclip size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Anexo {i + 1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredHistory.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                  <History size={48} className="text-slate-900 opacity-40" />
                </div>
                <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em] opacity-40">Nenhum histórico registado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL HISTÓRICO ESPECÍFICO DO VEÍCULO */}
      {viewingVehicleHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
          <div className="glass-panel rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="p-10 bg-white/5 border-b border-white/10 text-text-main flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl -mr-32 -mt-32"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center shadow-2xl shadow-blue-500/10 overflow-hidden">
                  {viewingVehicleHistory.photo ? <img src={viewingVehicleHistory.photo} className="w-full h-full object-cover" /> : <Wrench size={40} className="text-blue-400" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{viewingVehicleHistory.brand} {viewingVehicleHistory.model}</h2>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Histórico de Manutenção • {viewingVehicleHistory.plate}</p>
                </div>
              </div>
              <button onClick={() => setViewingVehicleHistory(null)} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-text-main relative z-10"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-transparent">
              <div className="space-y-6">
                {vehicleSpecificHistory.length > 0 ? vehicleSpecificHistory.map(record => (
                  <div key={record.id} className="p-8 bg-white/5 rounded-lg border border-white/10 hover:border-blue-500/50 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${record.type === MaintenanceType.CORRECTIVE ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{record.type}</span>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{new Date(record.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => onPrint(record)} className="p-3 bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 rounded-lg transition-all border border-white/5"><Printer size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Descrição do Serviço</p>
                        <p className="text-sm text-text-main font-medium leading-relaxed">{record.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Quilometragem/Horas</p>
                          <p className="text-sm font-black text-text-main">{record.currentKm || record.currentHours || 'N/A'}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Responsável</p>
                          <p className="text-sm font-black text-text-main truncate">{record.responsible}</p>
                        </div>
                      </div>
                    </div>

                    {record.attachments && record.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                        {record.attachments.map((att, i) => (
                          <button
                            key={i}
                            onClick={() => viewAttachment(att)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 rounded-lg transition-all border border-white/5"
                          >
                            <Paperclip size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Anexo {i + 1}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="py-20 text-center">
                    <History size={48} className="text-slate-800 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">Nenhum registo para este ativo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-lg p-12 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scroll-container border border-white/10 my-auto">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><Wrench size={28} /></div>
                <h2 className="text-xl font-black text-text-main uppercase tracking-tight">Lançamento de Oficina</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-text-main transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ativo em Manutenção</label>
                  <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none" value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
                    <option value="" className="bg-slate-950">Escolher Ativo...</option>
                    {data.vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-950">{v.plate} - {v.brand} {v.model}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tipo de Serviço</label>
                  <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none" value={newRecord.type} onChange={e => setNewRecord({ ...newRecord, type: e.target.value as MaintenanceType })}>
                    {Object.values(MaintenanceType).map(t => <option key={t} value={t} className="bg-slate-950">{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descrição Técnica dos Serviços</label>
                <textarea required placeholder="Relatório detalhado do serviço realizado..." className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-medium min-h-[150px] text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-900" value={newRecord.description} onChange={e => setNewRecord({ ...newRecord, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{selectedVehicle?.type === AssetType.MACHINE || selectedVehicle?.type === AssetType.CRANE_TRUCK ? 'Horas Atuais' : 'Quilometragem (KM)'}</label>
                  <input
                    required
                    type="number"
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={selectedVehicle?.type === AssetType.MACHINE || selectedVehicle?.type === AssetType.CRANE_TRUCK ? (newRecord.currentHours === 0 ? '' : (newRecord.currentHours || selectedVehicle?.currentHours || '')) : (newRecord.currentKm === 0 ? '' : (newRecord.currentKm || selectedVehicle?.currentKm || ''))}
                    onChange={e => selectedVehicle?.type === AssetType.MACHINE || selectedVehicle?.type === AssetType.CRANE_TRUCK ? setNewRecord({ ...newRecord, currentHours: e.target.value === '' ? 0 : Number(e.target.value) }) : setNewRecord({ ...newRecord, currentKm: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Técnico Responsável</label>
                  <input required placeholder="Nome do Mecânico/Oficina" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-900" value={newRecord.responsible} onChange={e => setNewRecord({ ...newRecord, responsible: e.target.value })} />
                </div>
              </div>

              {/* Upload de Anexos */}
              <div className="space-y-5 p-8 bg-white/5 rounded-lg border border-white/10 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Paperclip size={18} className="text-blue-400" /> Documentos Anexos (Max 3)
                    </h4>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">Faturas, relatórios técnicos ou imagens</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={(newRecord.attachments?.length || 0) >= 3}
                    className="p-4 bg-white/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-white/10 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <FileUp size={24} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {(newRecord.attachments || []).map((att, idx) => (
                    <div key={idx} className="relative group aspect-square bg-white/5 rounded-lg border border-white/10 overflow-hidden shadow-2xl">
                      {att.startsWith('data:image') ? (
                        <img src={att} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-800">
                          <FileText size={32} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-rose-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-3 bg-rose-600 text-white rounded-lg shadow-xl border border-rose-400/20 active:scale-90 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 3 - (newRecord.attachments?.length || 0) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-white/5 flex items-center justify-center text-slate-900 shadow-inner">
                      <ImageIcon size={32} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Data da Intervenção</label>
                <input required type="date" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={newRecord.date} onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-4 border border-blue-400/20 mt-6">
                <ShieldCheck size={24} /> Finalizar Intervenção Técnica
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXCLUSÃO SEGURA REGISTO */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4 overflow-y-auto">
          <div className={`glass-panel rounded-lg p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 transition-transform border border-white/10 my-auto ${deleteError ? 'animate-shake' : ''}`}>
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-500/10">
                <ShieldAlert size={48} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-text-main uppercase tracking-tight">Apagar Registo?</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                  Para remover este registo de manutenção, insira a **Chave Mestra**. Esta ação altera o status de conformidade do veículo.
                </p>
              </div>
              <form onSubmit={handleSecureDelete} className="w-full space-y-8 pt-4">
                <div className="relative text-left space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Chave de Autorização</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900" size={20} />
                    <input required autoFocus type="password" placeholder="••••••••" className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-900" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setItemToDelete(null)} className="flex-1 py-5 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-text-main transition-colors">Sair</button>
                  <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-600/20 flex items-center justify-center gap-3 border border-rose-400/20 active:scale-95 transition-all">
                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />} Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA MANUTENÇÃO */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[250] flex items-center justify-center p-4">
          <div className="glass-panel rounded-lg w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 overflow-hidden flex flex-col">
            <div className="p-8 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-text-main">Ficha de Manutenção</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Detalhes da Intervenção Técnica</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-500 hover:text-text-main">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Data</p>
                  <p className="text-sm font-black text-text-main">{new Date(selectedRecord.date).toLocaleDateString('pt-PT')}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Tipo</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${selectedRecord.type === MaintenanceType.CORRECTIVE ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                    {selectedRecord.type}
                  </span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Responsável</p>
                  <p className="text-sm font-black text-text-main">{selectedRecord.responsible}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Leitura na Intervenção</p>
                  <p className="text-sm font-black text-text-main">
                    {selectedRecord.currentKm || selectedRecord.currentHours || 'N/A'} {
                      data.vehicles.find(v => v.id === selectedRecord.vehicleId)?.type === AssetType.MACHINE ||
                        data.vehicles.find(v => v.id === selectedRecord.vehicleId)?.type === AssetType.CRANE_TRUCK ? 'Horas' : 'KM'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Descrição dos Serviços</p>
                  <p className="text-sm text-text-main font-medium leading-relaxed whitespace-pre-wrap">{selectedRecord.description}</p>
                </div>
                {selectedRecord.observations && (
                  <div className="p-6 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Observações Adicionais</p>
                    <p className="text-sm text-text-main font-medium leading-relaxed whitespace-pre-wrap">{selectedRecord.observations}</p>
                  </div>
                )}
              </div>

              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Anexos Digitais</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedRecord.attachments.map((att, i) => (
                      <button key={i} onClick={() => viewAttachment(att)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all border border-white/5 shadow-sm">
                        <Paperclip size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Anexo {i + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
              <button onClick={() => onPrint(selectedRecord)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 border border-blue-400/20">
                <Printer size={18} /> Imprimir Ficha Técnica
              </button>
              <button onClick={() => setSelectedRecord(null)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-lg font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-text-main hover:bg-white/10 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;

