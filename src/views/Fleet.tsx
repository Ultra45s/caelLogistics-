
import React, { useState } from 'react';
import { Vehicle, AssetType, AuthData, MaintenanceRecord, AppState } from '../types';
import { hashCredential } from '../db';
import { handlePrintMaintenance } from '../services/printService';
import { Truck, Plus, Trash2, ShieldCheck, ShieldAlert, Wrench, Search, X, FileText, Settings, Activity, Gauge, Info, Fuel, Calendar, Loader2, Lock, Edit3, Image as ImageIcon, Printer } from 'lucide-react';

interface FleetProps {
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  appData: AppState;
  auth?: AuthData;
  onAdd: (vehicle: Vehicle) => void;
  onUpdate: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const Fleet: React.FC<FleetProps> = ({ vehicles, maintenanceRecords, appData, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewingDetails, setViewingDetails] = useState<Vehicle | null>(null);

  // Exclusão Segura
  const [itemToDelete, setItemToDelete] = useState<Vehicle | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    name: '', plate: '', type: AssetType.TRUCK, brand: '', model: '', year: '', chassis: '', fuelType: 'Diesel',
    lastMaintenanceDate: new Date().toISOString().split('T')[0], maintenanceIntervalDays: 180, maintenanceIntervalKm: 10000, currentKm: 0, currentHours: 0, photo: ''
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVehicle({ ...newVehicle, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTypeChange = (type: AssetType) => {
    let intervalKm = 10000;
    let intervalDays = 180;

    if (type === AssetType.LIGHT_VEHICLE) {
      intervalKm = 5000;
      intervalDays = 180;
    } else if (type === AssetType.MACHINE || type === AssetType.CRANE_TRUCK) {
      intervalKm = 1000; // 1000 horas
      intervalDays = 180;
    }

    setNewVehicle({ ...newVehicle, type, maintenanceIntervalKm: intervalKm, maintenanceIntervalDays: intervalDays });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(newVehicle as Vehicle);
    } else {
      onAdd({ ...newVehicle as Vehicle, id: crypto.randomUUID(), lastUsageUpdate: new Date().toISOString().split('T')[0] });
    }
    setShowForm(false);
    setEditingId(null);
    setNewVehicle({
      name: '', plate: '', type: AssetType.TRUCK, brand: '', model: '', year: '', chassis: '', fuelType: 'Diesel',
      lastMaintenanceDate: new Date().toISOString().split('T')[0], maintenanceIntervalDays: 180, maintenanceIntervalKm: 10000, currentKm: 0, currentHours: 0, photo: ''
    });
  };

  const handleEdit = (v: Vehicle) => {
    setNewVehicle(v);
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;

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

  const getMaintenanceStatus = (v: Vehicle) => {
    const isHourBased = v.type === AssetType.MACHINE || v.type === AssetType.CRANE_TRUCK;

    // Data: usa o registo mais recente como referência
    const lastRecord = maintenanceRecords
      .filter(r => r.vehicleId === v.id)
      .filter(r => isHourBased ? (r.currentHours || 0) > 0 : (r.currentKm || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const baseDate = lastRecord ? new Date(lastRecord.date) : new Date(v.lastMaintenanceDate);
    const diffDays = Math.floor((Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= v.maintenanceIntervalDays) return true;

    // Uso: usa os campos diretos do veículo (atualizados ao guardar manutenção)
    const lastUsage = isHourBased ? (v.lastMaintenanceHours || 0) : (v.lastMaintenanceKm || 0);
    const currentUsage = isHourBased ? (v.currentHours || 0) : v.currentKm;
    if (currentUsage > 0 && lastUsage > 0 && currentUsage - lastUsage >= v.maintenanceIntervalKm) return true;

    return false;
  };

  const filtered = vehicles.filter(v => {
    const term = search.toLowerCase();
    return v.name.toLowerCase().includes(term) ||
      v.plate.toLowerCase().includes(term) ||
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar por placa ou modelo..." className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 text-text-main placeholder:text-slate-500 backdrop-blur-md transition-all" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowForm(true)} className="bg-brand text-text-main px-8 py-4 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-brand/20 hover:bg-brand-hover active:scale-95 transition-all border border-brand/20">
          <Plus size={18} /> Adicionar Ativo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(v => {
          const needsMaintenance = getMaintenanceStatus(v);
          return (
            <div key={v.id} onClick={() => setViewingDetails(v)} className={`glass-card p-6 rounded-md cursor-pointer group relative overflow-hidden ${needsMaintenance ? 'border-amber-500/30' : ''}`}>
              {needsMaintenance && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl -mr-12 -mt-12"></div>
              )}
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-16 h-16 rounded-md border flex items-center justify-center overflow-hidden ${needsMaintenance ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-brand/10 text-brand-text border-brand/20'}`}>
                  {v.photo ? (
                    <img src={v.photo} className="w-full h-full object-cover" />
                  ) : (
                    <Truck size={24} className={v.type === AssetType.TRAILER ? 'rotate-180' : ''} />
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(v); }} className="text-muted hover:text-brand-text p-2 hover:bg-brand/10 rounded-md"><Edit3 size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setItemToDelete(v); }} className="text-muted hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-md"><Trash2 size={18} /></button>
                </div>
              </div>
              <h4 className="text-xl font-black text-text-main mb-1 uppercase tracking-tight truncate relative z-10">{v.brand} {v.model}</h4>
              <p className="text-[10px] font-black text-brand-text uppercase tracking-[0.2em] mb-4 relative z-10">{v.type}</p>

              <div className="bg-white/5 p-4 rounded-lg space-y-3 border border-white/5 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-muted uppercase tracking-widest">Matrícula</span>
                  <span className="text-sm font-black text-text-main">{v.plate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${needsMaintenance ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {needsMaintenance ? 'Revisão Necessária' : 'Operacional'}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-center relative z-10">
                <span className="text-[10px] font-black text-brand-text uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">Ver Ficha Técnica <X size={12} className="rotate-45" /></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL FICHA TÉCNICA */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="glass-panel rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="p-10 bg-white/5 border-b border-white/10 text-text-main flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-3xl -mr-32 -mt-32"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-brand/20 border border-brand/30 rounded-lg flex items-center justify-center shadow-2xl shadow-brand/10 overflow-hidden">
                  {viewingDetails.photo ? (
                    <img src={viewingDetails.photo} className="w-full h-full object-cover" />
                  ) : (
                    <Truck size={40} className="text-brand-text" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">{viewingDetails.brand} {viewingDetails.model}</h2>
                  <p className="text-[10px] font-black text-brand-text uppercase tracking-[0.3em] mt-2">{viewingDetails.type} • MATRÍCULA: {viewingDetails.plate}</p>
                </div>
              </div>
              <button onClick={() => setViewingDetails(null)} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-text-main relative z-10"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-transparent">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Especificações</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-blue-400" size={18} />
                      <div><p className="text-[9px] font-black text-slate-500 uppercase">Ano de Fabrico</p><p className="text-sm font-bold text-text-main">{viewingDetails.year || 'N/A'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Fuel className="text-blue-400" size={18} />
                      <div><p className="text-[9px] font-black text-slate-500 uppercase">Combustível</p><p className="text-sm font-bold text-text-main">{viewingDetails.fuelType || 'Diesel'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Info className="text-blue-400" size={18} />
                      <div><p className="text-[9px] font-black text-slate-500 uppercase">Chassis</p><p className="text-xs font-mono font-bold text-text-main">{viewingDetails.chassis || 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Manutenção</h3>
                  <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Última Revisão</p>
                      <p className="text-sm font-black text-text-main">{new Date(viewingDetails.lastMaintenanceDate).toLocaleDateString('pt-PT')}</p>
                    </div>
                    {(() => {
                      const isHourBased = viewingDetails.type === AssetType.MACHINE || viewingDetails.type === AssetType.CRANE_TRUCK;
                      const unit = isHourBased ? 'Horas' : 'KM';
                      // Próxima data
                      const baseDate = new Date(viewingDetails.lastMaintenanceDate);
                      const nextDate = new Date(baseDate);
                      nextDate.setDate(baseDate.getDate() + viewingDetails.maintenanceIntervalDays);
                      const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      // Próximo KM/Hora
                      const lastUsage = isHourBased ? (viewingDetails.lastMaintenanceHours || 0) : (viewingDetails.lastMaintenanceKm || 0);
                      const currentUsage = isHourBased ? (viewingDetails.currentHours || 0) : viewingDetails.currentKm;
                      const nextUsage = lastUsage > 0 ? lastUsage + viewingDetails.maintenanceIntervalKm : null;
                      const usageLeft = nextUsage ? nextUsage - currentUsage : null;
                      return (
                        <>
                          <div className={`p-4 rounded-lg border ${daysLeft <= 0 ? 'bg-rose-500/10 border-rose-500/20' : daysLeft <= 30 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">📅 Próxima Data</p>
                            <p className={`text-sm font-black ${daysLeft <= 0 ? 'text-rose-400' : daysLeft <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {nextDate.toLocaleDateString('pt-PT')}
                            </p>
                            <p className={`text-[9px] font-bold mt-1 ${daysLeft <= 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                              {daysLeft <= 0 ? `${Math.abs(daysLeft)} dias em atraso` : `Faltam ${daysLeft} dias`}
                            </p>
                          </div>
                          {nextUsage !== null && (
                            <div className={`p-4 rounded-lg border ${usageLeft !== null && usageLeft <= 0 ? 'bg-rose-500/10 border-rose-500/20' : usageLeft !== null && usageLeft <= viewingDetails.maintenanceIntervalKm * 0.1 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">🔧 Próximo Limite</p>
                              <p className={`text-sm font-black ${usageLeft !== null && usageLeft <= 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                {nextUsage.toLocaleString()} {unit}
                              </p>
                              <p className={`text-[9px] font-bold mt-1 ${usageLeft !== null && usageLeft <= 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                {usageLeft !== null && usageLeft <= 0 ? `${Math.abs(usageLeft)} ${unit} ultrapassadas` : usageLeft !== null ? `Faltam ${usageLeft.toLocaleString()} ${unit}` : ''}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Telemetria Atual</h3>
                  <div className="flex flex-col items-center justify-center bg-blue-500/5 rounded-xl p-8 border border-blue-500/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                    <Gauge className="text-blue-400 mb-2 relative z-10" size={32} />
                    <p className="text-3xl font-black text-text-main leading-none relative z-10">
                      {viewingDetails.type === AssetType.MACHINE || viewingDetails.type === AssetType.CRANE_TRUCK ? viewingDetails.currentHours : viewingDetails.currentKm?.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2 relative z-10">{viewingDetails.type === AssetType.MACHINE || viewingDetails.type === AssetType.CRANE_TRUCK ? 'Horas Totais' : 'KM Totais'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Wrench size={16} className="text-blue-400" /> Histórico Permanente de Manutenção
                </h3>
                <div className="space-y-4">
                  {maintenanceRecords.filter(r => r.vehicleId === viewingDetails.id).length > 0 ? (
                    maintenanceRecords
                      .filter(r => r.vehicleId === viewingDetails.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(record => (
                        <div key={record.id} className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col md:flex-row gap-6 hover:bg-white/10 transition-all">
                          <div className="shrink-0 flex flex-col justify-center border-r border-white/10 pr-6 w-32">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{record.type}</span>
                            <span className="text-xs font-bold text-slate-400 tracking-tight">{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex-1 flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-black text-text-main mb-2 tracking-tight leading-tight">{record.description}</p>
                              <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Resp: <span className="text-slate-400">{record.responsible}</span></span>
                                <span className="flex items-center gap-1.5"><Gauge size={12} /> Leitura: <span className="text-slate-400">{record.currentKm || record.currentHours || 'N/A'} {viewingDetails.type === AssetType.MACHINE || viewingDetails.type === AssetType.CRANE_TRUCK ? 'Horas' : 'KM'}</span></span>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePrintMaintenance(record, appData)}
                              className="p-2.5 bg-white/5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 rounded-lg transition-all border border-white/5 shadow-sm"
                              title="Imprimir Ficha"
                            >
                              <Printer size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10 border-dashed">
                      <FileText size={32} className="text-slate-600 mb-3 opacity-50" />
                      <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Nenhum registo de manutenção para este ativo.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO VEÍCULO */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel rounded-lg p-10 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-text-main uppercase tracking-tight">{editingId ? 'Editar Ativo' : 'Registo de Ativo'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-500 hover:text-text-main transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-32 h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => document.getElementById('vehicle-photo')?.click()}>
                  {newVehicle.photo ? (
                    <img src={newVehicle.photo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto text-slate-600 mb-2" size={32} />
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Foto do Ativo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <span className="text-[8px] font-black text-text-main uppercase tracking-widest">Alterar</span>
                  </div>
                </div>
                <input id="vehicle-photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Veículo/Máquina</label>
                  <select className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" value={newVehicle.type} onChange={e => handleTypeChange(e.target.value as AssetType)}>
                    {Object.values(AssetType).map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matrícula</label>
                  <input required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold uppercase text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={newVehicle.plate} onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Marca (Ex: Volvo, Scania, Toyota...)" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" value={newVehicle.brand} onChange={e => setNewVehicle({ ...newVehicle, brand: e.target.value })} />
                <input required placeholder="Modelo (Ex: FH 540, Hilux...)" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input placeholder="Ano" type="number" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" value={newVehicle.year} onChange={e => setNewVehicle({ ...newVehicle, year: e.target.value })} />
                <input placeholder="Chassis" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" value={newVehicle.chassis} onChange={e => setNewVehicle({ ...newVehicle, chassis: e.target.value })} />
                <select className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={newVehicle.fuelType} onChange={e => setNewVehicle({ ...newVehicle, fuelType: e.target.value })}>
                  <option className="bg-slate-900">Diesel</option><option className="bg-slate-900">Gasolina</option><option className="bg-slate-900">Elétrico</option>
                </select>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-lg border border-blue-500/10">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Configuração Preditiva de Manutenção</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Última Revisão</label>
                    <input type="date" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={newVehicle.lastMaintenanceDate} onChange={e => setNewVehicle({ ...newVehicle, lastMaintenanceDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Intervalo ({newVehicle.type === AssetType.MACHINE || newVehicle.type === AssetType.CRANE_TRUCK ? 'Horas' : 'KM'})</label>
                    <input type="number" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" value={newVehicle.maintenanceIntervalKm} onChange={e => setNewVehicle({ ...newVehicle, maintenanceIntervalKm: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-lg font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all border border-blue-400/20">{editingId ? 'Guardar Alterações' : 'Registar no Inventário'}</button>
            </form>
          </div>
        </div>
      )}

      {/* EXCLUSÃO SEGURA */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className={`glass-panel rounded-lg p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 transition-transform border border-white/10 ${deleteError ? 'animate-shake' : ''}`}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20 flex items-center justify-center">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-xl font-black text-text-main uppercase tracking-tight">Eliminar Ativo?</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Confirme a **Chave Mestra** para remover <strong>{itemToDelete.plate}</strong>. Esta ação é irreversível e apagará todo o histórico do veículo.
              </p>
              <form onSubmit={handleSecureDelete} className="w-full space-y-4 pt-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input required autoFocus type="password" placeholder="Chave Mestra" className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setItemToDelete(null)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-text-main transition-colors">Cancelar</button>
                  <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-4 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 border border-rose-400/20 active:scale-95 transition-all">
                    {isVerifying ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fleet;

