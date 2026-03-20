import React, { useState, useMemo } from 'react';
import { FuelRecord, Vehicle, AssetType } from '../types';
import {
  Droplet, Plus, Search, Calendar, Edit3, Trash2, 
  X, BarChart3, Info, TrendingDown, TrendingUp
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface FuelControlProps {
  fuelRecords: FuelRecord[];
  vehicles: Vehicle[];
  onAdd: (record: FuelRecord) => void;
  onUpdate: (record: FuelRecord) => void;
  onDelete: (id: string) => void;
}

const FuelControl: React.FC<FuelControlProps> = ({ fuelRecords, vehicles, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

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
    
    // Auto-update vehicle telemetry logic should ideally live higher up or in an effect,
    // but we'll rely on app state logic or just store it.

    if (editingId) {
      onUpdate(formRecord as FuelRecord);
    } else {
      onAdd({ ...formRecord as FuelRecord, id: crypto.randomUUID() });
    }

    setShowForm(false);
  };

  // Process data to calculate consumption
  const recordsWithConsumption = useMemo(() => {
    // Sort all records chronologically
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.currentKmOrHours - b.currentKmOrHours);
    
    const enhanced = sorted.map((record, index, array) => {
      // Find the previous record for the same vehicle
      const prevRecords = array.slice(0, index).filter(r => r.vehicleId === record.vehicleId);
      const prev = prevRecords[prevRecords.length - 1];
      
      let consumption = 0;
      let diffDistance = 0;

      if (prev && record.currentKmOrHours > prev.currentKmOrHours) {
        diffDistance = record.currentKmOrHours - prev.currentKmOrHours;
        consumption = diffDistance / record.quantityLiters;
      }

      return {
        ...record,
        consumption,
        diffDistance,
        unit: vehicles.find(v => v.id === record.vehicleId)?.category === 'Máquina' ? 'h' : 'km'
      };
    });

    return enhanced.reverse(); // Newest first for display
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
    return {
      totalLiters,
      totalCost,
      count: filtered.length
    };
  }, [filtered]);

  // Chart data for selected vehicle
  const chartData = useMemo(() => {
    if (selectedVehicleId === 'all') return [];
    const vehicleRecords = recordsWithConsumption.filter(r => r.vehicleId === selectedVehicleId).reverse(); // chronological for chart
    return vehicleRecords.map(r => ({
      date: new Date(r.date).toLocaleDateString(),
      consumption: Number(r.consumption.toFixed(2)),
      liters: r.quantityLiters
    }));
  }, [selectedVehicleId, recordsWithConsumption]);

  return (
    <div className="space-y-6 pb-24 scroll-container animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Gestão de Combustível</h2>
          <p className="text-xs font-bold text-slate-400">Controle de abastecimentos e métricas de consumo</p>
        </div>
        <div className="flex gap-4">
          <select
            className="bg-white/5 border border-white/10 px-6 py-4 rounded-lg font-bold text-xs text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 min-w-[200px]"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            <option value="all" className="bg-slate-900">Todas Viaturas</option>
            {vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate} ({v.brand})</option>)}
          </select>
          <button onClick={() => handleOpenForm()} className="bg-blue-600 text-white px-8 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20">
            <Plus size={16} /> Novo Abastecimento
          </button>
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

      {/* Busca e Filtros */}
      <div className="glass-panel p-5 rounded-lg border border-white/10 flex flex-col md:flex-row gap-5 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por matrícula ou marca..."
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-lg outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-medium text-text-main"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto px-2">
          <Calendar size={16} className="text-slate-500" />
          <input type="date" className="p-3 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase text-text-main outline-none focus:border-blue-500/50" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
          <span className="text-slate-700">-</span>
          <input type="date" className="p-3 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase text-text-main outline-none focus:border-blue-500/50" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
        </div>
      </div>

      {/* Gráfico (Exibido apenas quando uma única viatura está selecionada) */}
      {selectedVehicleId !== 'all' && chartData.length > 1 && (
        <div className="glass-panel p-8 rounded-lg border border-white/10 mb-8 min-h-[350px]">
          <h3 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
            <TrendingDown className="text-blue-400" size={18} /> Evolução de Consumo (km/L ou L/h)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                itemStyle={{ color: '#60a5fa', fontSize: '10px', fontWeight: 'bold' }} 
                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="consumption" name="Consumo" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorConsumption)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista de Abastecimentos */}
      <div className="glass-panel border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] uppercase tracking-widest text-slate-500 font-black">
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Viatura</th>
                <th className="px-6 py-5">Leitura TKM/h</th>
                <th className="px-6 py-5">Combustível</th>
                <th className="px-6 py-5 text-center">Volume</th>
                <th className="px-6 py-5 text-right">Consumo Calculado</th>
                <th className="px-6 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(record => {
                const v = vehicles.find(vx => vx.id === record.vehicleId);
                const isGood = record.consumption > 0 && record.consumption > 3; // Example threshold
                return (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5 font-bold text-sm text-text-main">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="px-6 py-5">
                      <p className="font-black text-sm text-text-main uppercase">{v?.plate}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{v?.brand}</p>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-300">{record.currentKmOrHours.toLocaleString()} {record.unit}</td>
                    <td className="px-6 py-5 text-xs text-slate-400 font-bold uppercase">{record.fuelType}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-blue-400 text-lg">{record.quantityLiters} L</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {record.consumption > 0 ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs font-black text-slate-300">{record.consumption.toFixed(2)} {record.unit}/L</span>
                          {record.unit === 'km' && (
                            record.consumption < 2 ? <TrendingDown size={14} className="text-rose-400" /> : <TrendingUp size={14} className="text-emerald-400" />
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] tracking-widest uppercase text-slate-600 font-bold border border-white/10 px-2 py-1 rounded">Ref. Ini.</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleOpenForm(record)} className="text-slate-500 hover:text-blue-400 transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => { if(window.confirm('Excluir abastecimento?')) onDelete(record.id); }} className="text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Droplet size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Nenhum registro de abastecimento encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulário Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="glass-panel p-10 w-full max-w-2xl rounded-lg animate-in zoom-in-95 duration-300 border border-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
             
             <div className="flex justify-between items-center mb-8 relative z-10">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg"><Droplet size={24} /></div>
                 <div>
                   <h2 className="text-lg font-black uppercase tracking-tight leading-none text-text-main">Registro de Abastecimento</h2>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Lançamento de Despesa/Consumo</p>
                 </div>
               </div>
               <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-2 rounded-lg border border-white/5"><X size={24} /></button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
               <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Viatura / Máquina</label>
                   <select required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 text-text-main" value={formRecord.vehicleId} onChange={e => setFormRecord({...formRecord, vehicleId: e.target.value})}>
                     <option value="" className="bg-slate-900">Selecione...</option>
                     {vehicles.map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate} - {v.brand}</option>)}
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Data</label>
                   <input required type="date" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 text-text-main" value={formRecord.date} onChange={e => setFormRecord({...formRecord, date: e.target.value})} />
                 </div>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Quantidade (Litros)</label>
                   <input required type="number" step="0.01" min="1" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-black outline-none focus:ring-2 focus:ring-blue-500/50 text-xl text-blue-400" value={formRecord.quantityLiters || ''} onChange={e => setFormRecord({...formRecord, quantityLiters: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Leitura Odômetro/Horímetro</label>
                   <input required type="number" step="0.1" min="0" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 text-text-main" value={formRecord.currentKmOrHours || ''} onChange={e => setFormRecord({...formRecord, currentKmOrHours: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Valor Faturado (AOA)</label>
                   <input required type="number" step="0.01" min="0" className="w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg font-bold outline-none focus:ring-2 focus:ring-amber-500/50 text-amber-400" value={formRecord.amountPaid || ''} onChange={e => setFormRecord({...formRecord, amountPaid: Number(e.target.value)})} />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Observações (Opcional)</label>
                 <textarea className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-medium outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px] text-text-main" value={formRecord.observations} onChange={e => setFormRecord({...formRecord, observations: e.target.value})} />
               </div>

               <div className="flex gap-4 pt-4 border-t border-white/10">
                 <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-text-main transition-colors">Cancelar</button>
                 <button type="submit" className="flex-[2] py-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all outline-none border border-blue-400/20">
                   Salvar Abastecimento
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelControl;
