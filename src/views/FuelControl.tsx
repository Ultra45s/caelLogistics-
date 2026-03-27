import React, { useState, useMemo, useEffect } from 'react';
import { FuelRecord, Vehicle, AssetType } from '../types';
import {
  Droplet, Plus, Search, Calendar, Edit3, Trash2, 
  X, BarChart3, Info, TrendingDown, TrendingUp,
  Percent, Fuel, Gauge, History, ChevronRight, AlertTriangle, ShieldAlert
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface FuelControlProps {
  fuelRecords: FuelRecord[];
  vehicles: Vehicle[];
  onAdd: (record: FuelRecord) => void;
  onUpdate: (record: FuelRecord) => void;
  onDelete: (id: string, masterKeyHash?: string) => void;
  auth?: { masterKeyHash?: string };
}

const FUEL_PRICE_PER_LITER = 400; // Preço fixo do combustível em KZ

const FuelControl: React.FC<FuelControlProps> = ({ fuelRecords, vehicles, onAdd, onUpdate, onDelete, auth }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  
  // Master Key Security
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState('');
  const [deleteError, setDeleteError] = useState(false);

  const initialFormState: Partial<FuelRecord> = {
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    quantityLiters: 0,
    amountPaid: 0,
    currentKmOrHours: 0,
    fuelType: 'Gasóleo',
    observations: ''
  };

  const [formRecord, setFormRecord] = useState<Partial<FuelRecord>>(initialFormState);

  // Calcula automaticamente o valor com base na quantidade
  const calculatedAmount = (formRecord.quantityLiters || 0) * FUEL_PRICE_PER_LITER;

  const handleOpenForm = (record?: FuelRecord) => {
    if (record) {
      setFormRecord(record);
      setEditingId(record.id);
    } else {
      setFormRecord(initialFormState);
      setEditingId(null);
    }
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecord.vehicleId) return alert('Selecione uma viatura.');
    
    if (editingId) {
      onUpdate(formRecord as FuelRecord);
    } else {
      onAdd({ ...formRecord as FuelRecord, id: crypto.randomUUID() });
    }

    setShowForm(false);
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToDelete) return;

    try {
        const isValid = await (window as any).electron.ipcRenderer.invoke('verify-password', masterKey, auth?.masterKeyHash);
        if (isValid) {
            onDelete(recordToDelete);
            setShowDeleteModal(false);
            setRecordToDelete(null);
            setMasterKey('');
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

  // Process data to calculate consumption
  const recordsWithConsumption = useMemo(() => {
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.currentKmOrHours - b.currentKmOrHours);
    
    const enhanced = sorted.map((record, index, array) => {
      const prevRecords = array.slice(0, index).filter(r => r.vehicleId === record.vehicleId);
      const prev = prevRecords[prevRecords.length - 1];
      
      let consumption = 0;
      let diffDistance = 0;

      if (prev && record.currentKmOrHours > prev.currentKmOrHours) {
        diffDistance = record.currentKmOrHours - prev.currentKmOrHours;
        consumption = diffDistance / record.quantityLiters;
      }

      const v = vehicles.find(vx => vx.id === record.vehicleId);
      return {
        ...record,
        consumption,
        diffDistance,
        unit: v?.category === 'Máquina' ? 'h' : 'km'
      };
    });

    return enhanced.reverse(); 
  }, [fuelRecords, vehicles]);

  const filtered = useMemo(() => {
    return recordsWithConsumption.filter(record => {
      const v = vehicles.find(vx => vx.id === record.vehicleId);
      const matchesSearch = v?.plate.toLowerCase().includes(search.toLowerCase()) || v?.brand.toLowerCase().includes(search.toLowerCase());
      
      const recordDate = new Date(record.date);
      const start = dateFilter.start ? new Date(dateFilter.start) : null;
      const end = dateFilter.end ? new Date(dateFilter.end) : null;
      const matchesDate = (!start || recordDate >= start) && (!end || recordDate <= end);
      
      const matchesVehicle = selectedVehicleId === 'all' || record.vehicleId === selectedVehicleId;

      return matchesSearch && matchesDate && matchesVehicle;
    });
  }, [recordsWithConsumption, search, dateFilter, vehicles, selectedVehicleId]);

  const stats = useMemo(() => {
    const totalLiters = filtered.reduce((acc, r) => acc + r.quantityLiters, 0);
    const totalCost = filtered.reduce((acc, r) => acc + r.amountPaid, 0);
    const avgConsumption = filtered.length > 0 ? filtered.reduce((acc, r) => acc + r.consumption, 0) / filtered.filter(r => r.consumption > 0).length || 0 : 0;
    
    return {
      totalLiters,
      totalCost,
      count: filtered.length,
      avgConsumption
    };
  }, [filtered]);

  const chartData = useMemo(() => {
    if (selectedVehicleId === 'all') return [];
    const vehicleRecords = recordsWithConsumption.filter(r => r.vehicleId === selectedVehicleId).reverse();
    return vehicleRecords.map(r => ({
      date: new Date(r.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
      consumption: Number(r.consumption.toFixed(2)),
      liters: r.quantityLiters
    }));
  }, [selectedVehicleId, recordsWithConsumption]);

  return (
    <div className="space-y-12 pb-24 scroll-container animate-in fade-in duration-1000">
      {/* Premium Dashboard Header */}
      <div className="bg-slate-900/50 backdrop-blur-[40px] p-12 rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5 opacity-50"></div>
        <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="lg:pr-12 lg:border-r border-white/10 text-center lg:text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Monitorização Energética</p>
            <div className="flex items-end gap-3 justify-center lg:justify-start">
                <h3 className="text-5xl font-black text-white tracking-tighter leading-none">{stats.totalLiters.toLocaleString()}</h3>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Litros Globais</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 justify-center lg:justify-start flex-1">
            <div className="px-8 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Custo Operacional Total</span>
                    <span className="text-2xl font-black text-white leading-none">{stats.totalCost.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                    <BarChart3 size={20} />
                </div>
            </div>
            <div className="px-8 py-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Média de Eficiência</span>
                    <span className="text-2xl font-black text-white leading-none">{stats.avgConsumption.toFixed(2)} km/L</span>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-2xl">
                    <Gauge size={20} />
                </div>
            </div>
            <div className="px-8 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Nº de Abastecimentos</span>
                    <span className="text-2xl font-black text-white leading-none">{stats.count}</span>
                </div>
                <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-xl flex items-center justify-center border border-white/5 shadow-2xl">
                    <Fuel size={20} />
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-lg border border-white/10 flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20"><Droplet size={28} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Litros (Filtro)</p>
            <p className="text-2xl font-black text-text-main mt-1">{stats.totalLiters.toLocaleString()} L</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-lg border border-white/10 flex items-center gap-6">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center border border-emerald-500/20"><BarChart3 size={28} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Custo Total (Filtro)</p>
            <p className="text-2xl font-black text-text-main mt-1">{stats.totalCost.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-lg border border-white/10 flex items-center gap-6">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center border border-amber-500/20"><Info size={28} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Registros (Filtro)</p>
            <p className="text-2xl font-black text-text-main mt-1">{stats.count}</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filter Terminal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="flex flex-col sm:flex-row gap-6 flex-1">
            <div className="relative group flex-1">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors pointer-events-none" size={24} />
                <input 
                    type="text" 
                    placeholder="Filtrar por matrícula ou unidade técnica..." 
                    className="w-full pl-16 pr-8 py-6 bg-white/[0.02] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-blue-500/40 shadow-2xl outline-none text-white placeholder:text-slate-800 font-bold text-sm transition-all" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                />
            </div>
            <div className="relative group">
                <Fuel className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors pointer-events-none" size={20} />
                <select
                    className="pl-16 pr-10 py-6 bg-white/[0.02] border border-white/10 rounded-2xl focus:bg-white/[0.05] focus:border-blue-500/40 shadow-2xl outline-none text-white font-black text-[10px] uppercase tracking-widest appearance-none transition-all cursor-pointer min-w-[240px]"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                    <option value="all" className="bg-slate-950">Frotas (Todas)</option>
                    {vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-950">{v.plate} • {v.brand}</option>)}
                </select>
                <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 rotate-90 pointer-events-none" />
            </div>
        </div>
        <button 
          onClick={() => handleOpenForm()} 
          className="flex items-center justify-center gap-6 bg-blue-600 text-white px-12 py-6 rounded-2xl hover:bg-blue-500 transition-all font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 border border-white/10 group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" strokeWidth={2.5} /> 
          Lançar Abastecimento
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Advanced Consumption Analytics Chart */}
        <div className="xl:col-span-2 bg-slate-900/50 backdrop-blur-[40px] p-10 rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="font-black text-white text-xs uppercase tracking-[0.4em] flex items-center gap-4">
                <TrendingUp className="text-blue-400" size={20} /> Análise Dinâmica de Eficiência
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Métricas e performance energética da unidade</p>
            </div>
            {selectedVehicleId !== 'all' && (
                <div className="px-6 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Viatura Seleccionada</span>
                </div>
            )}
          </div>
          
          <div className="h-[300px] w-full relative z-10">
            {selectedVehicleId === 'all' ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30">
                    <BarChart3 size={64} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Seleccione uma viatura para análise individual</p>
                </div>
            ) : chartData.length < 2 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 opacity-30">
                    <History size={64} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Dados históricos insuficientes para projecção</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 900 }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={15}
                    />
                    <YAxis 
                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 900 }} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', backdropFilter: 'blur(20px)', padding: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
                        itemStyle={{ color: '#60a5fa', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }} 
                        labelStyle={{ color: '#475569', fontSize: '10px', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}
                    />
                    <Area type="monotone" dataKey="consumption" name="Eficiência" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#fuelGradient)" animationDuration={2000} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Date Filters & Small Context - Glassmorphism */}
        <div className="bg-slate-900/50 backdrop-blur-[40px] p-10 rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.5)] flex flex-col justify-between">
            <div className="space-y-8">
                <h3 className="font-black text-white text-xs uppercase tracking-[0.4em] flex items-center gap-4">
                    <Calendar className="text-blue-400" size={20} /> Período Fiscal
                </h3>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Início do Ciclo</label>
                        <input type="date" className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-blue-500/40 transition-all" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Termo do Ciclo</label>
                        <input type="date" className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-blue-500/40 transition-all" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
                    </div>
                </div>
                <button 
                  onClick={() => setDateFilter({ start: '', end: '' })}
                  className="w-full py-4 text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                    Repor Filtros Temporais
                </button>
            </div>
            <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-4 text-slate-500 group">
                    <Info size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Cálculo de eficiência baseado em abastecimentos consecutivos por viatura.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Fuel Records Ledger Table */}
      <div className="bg-slate-900/50 backdrop-blur-[40px] rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-30"></div>
        <div className="overflow-x-auto scroll-container relative z-10">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase text-slate-500 font-black tracking-[0.4em] border-b border-white/10">
                <th className="px-10 py-8">Unidade Técnica</th>
                <th className="px-10 py-8">Registo Temporal</th>
                <th className="px-10 py-8">Leitura (km/h)</th>
                <th className="px-10 py-8 text-center">Abastecimento</th>
                <th className="px-10 py-8 text-right">Eficiência Energética</th>
                <th className="px-10 py-8 text-center">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((record, idx) => {
                const v = vehicles.find(vx => vx.id === record.vehicleId);
                const isBad = record.unit === 'km' && record.consumption > 0 && record.consumption < 4;
                const isExcellent = record.unit === 'km' && record.consumption > 7;
                
                return (
                  <tr key={record.id} className="hover:bg-white/[0.03] transition-all duration-700 group/row animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover/row:scale-110 transition-transform duration-700">
                             <Gauge size={24} strokeWidth={1} className="text-slate-800" />
                          </div>
                          <div>
                             <p className="text-base font-black text-white uppercase tracking-tighter leading-none mb-2">{v?.plate || '---'}</p>
                             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{v?.brand}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-base font-black text-white uppercase tracking-tighter leading-none mb-2">
                        {new Date(record.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest border border-white/5">{record.fuelType}</span>
                    </td>
                    <td className="px-10 py-8">
                       <span className="text-lg font-black text-slate-300 leading-none">{record.currentKmOrHours.toLocaleString()}</span>
                       <span className="text-[10px] font-black text-slate-600 uppercase ml-2">{record.unit}</span>
                    </td>
                    <td className="px-10 py-8 text-center">
                       <div className="inline-flex flex-col items-center">
                          <span className="text-2xl font-black text-blue-400 tracking-tighter leading-none mb-2">{record.quantityLiters} L</span>
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{record.amountPaid.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      {record.consumption > 0 ? (
                        <div className={`inline-flex flex-col items-end gap-2 p-4 rounded-2xl border transition-all duration-700 ${isBad ? 'bg-rose-500/5 border-rose-500/20' : isExcellent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                           <div className="flex items-center gap-3">
                              <span className={`text-base font-black ${isBad ? 'text-rose-400' : isExcellent ? 'text-emerald-400' : 'text-white'}`}>{record.consumption.toFixed(2)} {record.unit}/L</span>
                              {isBad ? <TrendingDown size={14} className="text-rose-400" /> : isExcellent ? <TrendingUp size={14} className="text-emerald-400" /> : <Percent size={14} className="text-blue-400" />}
                           </div>
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">{isBad ? 'Consumo Elevado' : isExcellent ? 'Alta Performance' : 'Média Estável'}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-800">
                          <History size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">REGISTO INICIAL</span>
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-8 text-center">
                      <div className="flex justify-center gap-6">
                        <button onClick={() => handleOpenForm(record)} className="text-slate-700 hover:text-blue-400 transition-all p-2 hover:bg-white/5 rounded-xl"><Edit3 size={18} /></button>
                        <button onClick={() => { setRecordToDelete(record.id); setShowDeleteModal(true); }} className="text-slate-700 hover:text-rose-400 transition-all p-2 hover:bg-white/5 rounded-xl"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-48 text-center opacity-30">
                    <div className="flex flex-col items-center gap-8">
                       <Droplet size={64} strokeWidth={1} />
                       <div className="space-y-3">
                          <p className="text-2xl font-black text-slate-700 uppercase tracking-widest">Sem Registos de Combustível</p>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em]">Inicie o controlo energético da frota</p>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fuel Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-slate-900/90 backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-2xl shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-500 relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
             
             <div className="flex justify-between items-center mb-10 relative z-10">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/10">
                   <Droplet size={32} strokeWidth={1.5} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black uppercase tracking-tight leading-none text-white">{editingId ? 'Actualizar Registo' : 'Novo Abastecimento'}</h2>
                   <p className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.4em] mt-2 italic">Controlo de Ativos Energéticos</p>
                 </div>
               </div>
               <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={32} /></button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Viatura / Máquina</label>
                   <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all appearance-none cursor-pointer" value={formRecord.vehicleId} onChange={e => setFormRecord({...formRecord, vehicleId: e.target.value})}>
                     <option value="" className="bg-slate-950">Seleccionar Ativo...</option>
                     {vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-950">{v.plate} • {v.brand}</option>)}
                   </select>
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Data do Evento</label>
                   <div className="relative group">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input required type="date" className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all" value={formRecord.date} onChange={e => setFormRecord({...formRecord, date: e.target.value})} />
                   </div>
                 </div>
               </div>

<div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Litros Adquiridos</label>
                    <input required type="number" step="0.01" min="1" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-black text-blue-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all text-2xl text-center" value={formRecord.quantityLiters || ''} onChange={e => setFormRecord({...formRecord, quantityLiters: Number(e.target.value), amountPaid: Number(e.target.value) * FUEL_PRICE_PER_LITER})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Leitura Telemétrica</label>
                    <input required type="number" step="0.1" min="0" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all text-xl text-center" value={formRecord.currentKmOrHours || ''} onChange={e => setFormRecord({...formRecord, currentKmOrHours: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Montante (AOA)</label>
                    <input required type="number" step="0.01" min="0" className="w-full p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl font-black text-emerald-400 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all text-xl text-center shadow-inner" value={formRecord.amountPaid || ''} onChange={e => setFormRecord({...formRecord, amountPaid: Number(e.target.value)})} />
                    <p className="text-[9px] text-emerald-500/60 text-center mt-1">
                      {formRecord.quantityLiters ? `${formRecord.quantityLiters}L × ${FUEL_PRICE_PER_LITER}KZ = ${calculatedAmount.toLocaleString()}KZ` : `Preço: ${FUEL_PRICE_PER_LITER}KZ/L`}
                    </p>
                  </div>
                </div>

               <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2">Observações Técnicas</label>
                 <textarea placeholder="Inserir detalhes adicionais sobre o abastecimento (ex: posto de combustível, anomalias)..." className="w-full p-6 bg-white/[0.02] border border-white/10 rounded-2xl font-medium text-white outline-none focus:border-blue-500/30 transition-all min-h-[100px] resize-none text-sm placeholder:text-slate-900" value={formRecord.observations} onChange={e => setFormRecord({...formRecord, observations: e.target.value})} />
               </div>

               <div className="flex gap-6 pt-6 border-t border-white/5">
                 <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors">Abortar Operação</button>
                 <button type="submit" className="flex-[2] py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:bg-blue-500 active:scale-95 transition-all border border-white/10">
                   {editingId ? 'Confirmar Actualização' : 'Efectuar Lançamento Contraposto'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Secure Deletion Modal - Master Key Protocol */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className={`bg-slate-900 border ${deleteError ? 'border-rose-500/50' : 'border-white/10'} p-12 rounded-[3rem] w-full max-w-md shadow-[0_32px_128px_rgba(0,0,0,0.8)] transition-all duration-300 ${deleteError ? 'animate-shake' : 'animate-in zoom-in-95'}`}>
             <div className="text-center space-y-8">
               <div className={`w-24 h-24 ${deleteError ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-white/5'} rounded-[2rem] flex items-center justify-center mx-auto border shadow-2xl transition-colors duration-500`}>
                 <ShieldAlert size={48} strokeWidth={1} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-4">Eliminação Segura</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                    Esta acção é irreversível e afecta os relatórios financeiros. Insira a <span className="text-blue-400">Master Key</span> para autorizar.
                  </p>
               </div>
               
               <form onSubmit={handleSecureDelete} className="space-y-6">
                 <input
                   autoFocus
                   type="password"
                   placeholder="Introduzir Chave Mestra..."
                   className={`w-full p-6 bg-white/5 border ${deleteError ? 'border-rose-500/40 text-rose-400' : 'border-white/10 text-white'} rounded-2xl text-center font-black tracking-[1em] outline-none focus:ring-4 ${deleteError ? 'focus:ring-rose-500/10' : 'focus:ring-blue-500/10'} transition-all`}
                   value={masterKey}
                   onChange={(e) => setMasterKey(e.target.value)}
                 />
                 <div className="flex gap-4">
                   <button 
                     type="button" 
                     onClick={() => { setShowDeleteModal(false); setRecordToDelete(null); setMasterKey(''); setDeleteError(false); }}
                     className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-600/20 hover:bg-rose-500 active:scale-95 transition-all border border-white/10"
                   >
                     Confirmar Apagar
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

export default FuelControl;

