import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Delivery, DeliveryStatus, Employee, EPI } from '../types';
import { 
  ClipboardList, Plus, Search, User, Package, ShieldAlert, 
  CheckCircle2, X, RefreshCcw, Zap, History, ChevronDown, 
  SearchIcon, UserCircle, HardHat, AlertTriangle, Clock, ShieldCheck,
  Trash2, Loader2, Lock
} from 'lucide-react';

interface DeliveriesProps {
  deliveries: Delivery[];
  employees: Employee[];
  epis: EPI[];
  onAdd: (delivery: Delivery) => void;
  onUpdateStatus: (id: string, status: DeliveryStatus) => void;
  onDelete: (id: string, masterKeyHash?: string) => void;
  auth?: { masterKeyHash?: string };
}

// Sub-componente para Seletor com Busca - Modernized Glassmorphism
const SearchableSelect = <T extends { id: string; name: string; info?: string; photo?: string }>({ 
  label, 
  placeholder, 
  items, 
  selectedId, 
  onSelect, 
  disabled,
  icon: Icon
}: { 
  label: string; 
  placeholder: string; 
  items: T[]; 
  selectedId: string; 
  onSelect: (id: string) => void; 
  disabled?: boolean;
  icon: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.info && i.info.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-3 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-5 bg-white/[0.03] border border-white/10 rounded-2xl transition-all text-left shadow-2xl backdrop-blur-md group ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-blue-500/40 focus:ring-4 focus:ring-blue-500/10'}`}
      >
        <div className="flex items-center gap-4 overflow-hidden">
          {selectedItem?.photo ? (
            <img src={selectedItem.photo} className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-lg" />
          ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${selectedItem ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-700 group-hover:text-blue-400'}`}>
                <Icon size={20} />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-black uppercase tracking-tight truncate ${selectedItem ? 'text-white' : 'text-slate-700'}`}>
                {selectedItem ? selectedItem.name : placeholder}
            </span>
            {selectedItem?.info && <span className="text-[9px] font-black text-blue-400/50 uppercase tracking-widest truncate">{selectedItem.info}</span>}
          </div>
        </div>
        <ChevronDown size={20} className={`text-slate-700 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[160] w-full mt-4 bg-slate-900/90 border border-white/10 rounded-[2rem] shadow-[0_32px_128px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 backdrop-blur-3xl">
          <div className="p-5 border-b border-white/5 bg-white/[0.02]">
            <div className="relative group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors" size={16} />
              <input
                autoFocus
                type="text"
                placeholder="Filtrar registos..."
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-3 scroll-container space-y-2">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.id); setIsOpen(false); setSearchTerm(''); }}
                className={`w-full flex items-center gap-5 p-4 rounded-xl transition-all text-left group ${selectedId === item.id ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)]' : 'hover:bg-white/5'}`}
              >
                {item.photo ? (
                  <img src={item.photo} className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md" />
                ) : (
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${selectedId === item.id ? 'bg-blue-500 border-blue-400 shadow-inner' : 'bg-white/5 border-white/5 text-slate-700 group-hover:text-blue-400'}`}>
                    <Icon size={22} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-tight truncate leading-none mb-2">{item.name}</p>
                  {item.info && <p className={`text-[9px] font-bold uppercase tracking-[0.2em] truncate ${selectedId === item.id ? 'text-blue-100' : 'text-slate-600'}`}>{item.info}</p>}
                </div>
              </button>
            )) : (
              <div className="p-12 text-center opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Nenhum registo encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Deliveries: React.FC<DeliveriesProps> = ({ deliveries, employees, epis, onAdd, onUpdateStatus, onDelete, auth }) => {
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [search, setSearch] = useState('');
  const [deliveryType, setDeliveryType] = useState<'normal' | 'replacement' | 'damaged'>('normal');
  const [isAutoReplace, setIsAutoReplace] = useState(false);

  // Secure Deletion Protocol
  const [itemToDelete, setItemToDelete] = useState<Delivery | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newDelivery, setNewDelivery] = useState<Partial<Delivery>>({
    employeeId: '',
    epiId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    status: DeliveryStatus.IN_USE,
    justification: ''
  });

  const activeDeliveryIds = useMemo(() => {
    const latestMap = new Map<string, { id: string, date: number }>();
    deliveries.forEach(d => {
      const key = `${d.employeeId}-${d.epiId}`;
      const time = new Date(d.deliveryDate).getTime();
      if (!latestMap.has(key) || time > latestMap.get(key)!.date) {
        latestMap.set(key, { id: d.id, date: time });
      }
    });
    return new Set(Array.from(latestMap.values()).map(v => v.id));
  }, [deliveries]);

  const getEpiStatusInfo = (delivery: Delivery) => {
    const epi = epis.find(e => e.id === delivery.epiId);
    if (!epi) return { status: delivery.status, diffDays: 999, expirationDate: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delDate = new Date(delivery.deliveryDate);
    delDate.setHours(0, 0, 0, 0);

    let lifespanDays = epi.lifespanValue;
    if (epi.lifespanUnit === 'weeks') lifespanDays *= 7;
    if (epi.lifespanUnit === 'months') lifespanDays *= 30;

    const expirationDate = new Date(delDate.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let finalStatus = delivery.status;
    if (diffDays < 0 && activeDeliveryIds.has(delivery.id)) finalStatus = DeliveryStatus.EXPIRED;

    return { status: finalStatus, diffDays, expirationDate };
  };

  const deliveryStats = useMemo(() => {
    const stats: Record<string, number> = { 
        [DeliveryStatus.IN_USE]: 0, 
        [DeliveryStatus.EXPIRED]: 0, 
        [DeliveryStatus.REPLACED]: 0,
        [DeliveryStatus.DAMAGED]: 0
    };
    deliveries.forEach(d => {
        if (activeDeliveryIds.has(d.id)) {
            const info = getEpiStatusInfo(d);
            stats[info.status]++;
        } else {
            // Histórico (não ativo)
        }
    });
    return stats;
  }, [deliveries, activeDeliveryIds, epis]);

  const filtered = deliveries.filter(d => {
    const emp = employees.find(e => e.id === d.employeeId);
    const epi = epis.find(e => e.id === d.epiId);
    const searchLower = search.toLowerCase();
    return emp?.name.toLowerCase().includes(searchLower) || emp?.biNumber.toLowerCase().includes(searchLower) || epi?.name.toLowerCase().includes(searchLower);
  });

  const resetForm = () => {
    setNewDelivery({ 
      employeeId: '', 
      epiId: '', 
      deliveryDate: new Date().toISOString().split('T')[0], 
      quantity: 1, 
      status: DeliveryStatus.IN_USE, 
      justification: '' 
    });
    setDeliveryType('normal');
    setIsAutoReplace(false);
    setShowForm(false);
  };

  const isEarlyReplacement = useMemo(() => {
    if (isAutoReplace) return false;
    if (!newDelivery.employeeId || !newDelivery.epiId) return false;

    const lastDelivery = [...deliveries]
      .filter(d => d.employeeId === newDelivery.employeeId && d.epiId === newDelivery.epiId)
      .sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime())[0];

    if (!lastDelivery) return false;
    const epi = epis.find(e => e.id === newDelivery.epiId);
    if (!epi) return false;

    const today = new Date();
    today.setHours(0,0,0,0);
    const lastDate = new Date(lastDelivery.deliveryDate);
    lastDate.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let lifespanDays = epi.lifespanValue;
    if (epi.lifespanUnit === 'weeks') lifespanDays *= 7;
    if (epi.lifespanUnit === 'months') lifespanDays *= 30;

    return diffDays < lifespanDays;
  }, [newDelivery.employeeId, newDelivery.epiId, deliveries, epis, isAutoReplace]);

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;

    try {
      setIsVerifying(true);
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
    } finally {
      setIsVerifying(false);
    }
  };

  const needsJustification = !isAutoReplace && (deliveryType !== 'normal' || isEarlyReplacement);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelivery.employeeId) return alert("Selecione um colaborador.");
    if (!newDelivery.epiId) return alert("Selecione um equipamento.");
    
    if (needsJustification && !newDelivery.justification?.trim()) {
      alert("Justificativa obrigatória para este tipo de operação de EPI.");
      return;
    }

    onAdd({ ...newDelivery as Delivery, id: crypto.randomUUID() });
    resetForm();
  };

  const handleQuickReplace = (delivery: Delivery) => {
    setIsAutoReplace(true);
    setNewDelivery({
      employeeId: delivery.employeeId,
      epiId: delivery.epiId,
      deliveryDate: new Date().toISOString().split('T')[0],
      quantity: delivery.quantity,
      status: DeliveryStatus.IN_USE,
      justification: 'SUBSTITUIÇÃO CORRETIVA: Item anterior expirado.'
    });
    setDeliveryType('replacement');
    setShowForm(true);
  };

  // Mapeamento de itens para o SearchableSelect
  const employeeItems = employees.map(e => ({
    id: e.id,
    name: e.name,
    info: `BI: ${e.biNumber} • ${e.area}`,
    photo: e.photoUrl
  }));

  const epiItems = epis.map(e => ({
    id: e.id,
    name: e.name,
    info: e.category
  }));

  return (
    <div className="space-y-12 pb-24 scroll-container animate-in fade-in duration-1000">
      {/* Delivery Status Summary - Premium Glassmorphism */}
      <div className="bg-slate-900/50 backdrop-blur-[40px] p-12 rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5 opacity-50"></div>
        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="md:pr-12 md:border-r border-white/10 text-center md:text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Monitorização de EPIs</p>
            <div className="flex items-end gap-3 justify-center md:justify-start">
                <h3 className="text-5xl font-black text-white tracking-tighter leading-none">{filtered.length}</h3>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Registos</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 justify-center md:justify-start flex-1">
            <div className="px-8 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mb-1">Em Conformidade</span>
                    <span className="text-2xl font-black text-white leading-none">{deliveryStats[DeliveryStatus.IN_USE]}</span>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                    <ShieldCheck size={20} />
                </div>
            </div>
            <div className="px-8 py-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-rose-400/60 uppercase tracking-widest mb-1">Expirações Críticas</span>
                    <span className="text-2xl font-black text-white leading-none">{deliveryStats[DeliveryStatus.EXPIRED]}</span>
                </div>
                <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20 shadow-2xl">
                    <ShieldAlert size={20} />
                </div>
            </div>
            <div className="px-8 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-6 shadow-xl">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Substituições Realizadas</span>
                    <span className="text-2xl font-black text-white leading-none">{deliveryStats[DeliveryStatus.REPLACED] + deliveryStats[DeliveryStatus.DAMAGED]}</span>
                </div>
                <div className="w-10 h-10 bg-white/5 text-slate-500 rounded-xl flex items-center justify-center border border-white/5 shadow-2xl">
                    <RefreshCcw size={20} />
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Search and New Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="relative flex-1 group">
          <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors pointer-events-none">
            <Search size={24} strokeWidth={1.5} />
          </div>
          <input 
            type="text" 
            placeholder="Rastrear entregas por colaborador ou equipamento técnico..." 
            className="w-full pl-20 pr-10 py-7 bg-white/[0.02] border border-white/10 rounded-[2rem] focus:bg-white/[0.05] focus:border-blue-500/40 shadow-2xl outline-none text-white placeholder:text-slate-800 font-bold text-base backdrop-blur-md transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="flex items-center justify-center gap-6 bg-blue-600 text-white px-14 py-7 rounded-2xl hover:bg-blue-500 transition-all font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 border border-white/10 group h-full"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" strokeWidth={2.5} /> 
          Formalizar Entrega
        </button>
      </div>

      {/* Form Modal Overhaul */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-slate-900/90 backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-3xl shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-500 relative">
            
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/10">
                   {isAutoReplace ? <Zap size={32} strokeWidth={1.5} /> : <ClipboardList size={32} strokeWidth={1.5} />}
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                     {isAutoReplace ? 'Substituição Imediata' : 'Entrega de Equipamento'}
                   </h2>
                   <p className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.4em] mt-2 italic">Validação de Inventário e Segurança</p>
                 </div>
               </div>
              <button onClick={resetForm} className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={32} /></button>
            </div>

            {!isAutoReplace && (
              <div className="mb-12">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 block mb-6">Objectivo da Movimentação</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <button type="button" onClick={() => setDeliveryType('normal')} className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all duration-500 group/flow ${deliveryType === 'normal' ? 'border-blue-500/50 bg-blue-600/20 text-blue-400 shadow-2xl shadow-blue-500/10' : 'border-white/5 bg-white/[0.02] text-slate-700 hover:border-white/10 hover:text-slate-400'}`}>
                    <Package size={32} strokeWidth={1.5} className="group-hover/flow:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Entrega Padrão</span>
                  </button>
                  <button type="button" onClick={() => setDeliveryType('replacement')} className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all duration-500 group/flow ${deliveryType === 'replacement' ? 'border-amber-500/50 bg-amber-600/20 text-amber-400 shadow-2xl shadow-amber-500/10' : 'border-white/5 bg-white/[0.02] text-slate-700 hover:border-white/10 hover:text-slate-400'}`}>
                    <RefreshCcw size={32} strokeWidth={1.5} className="group-hover/flow:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Renovação Técnica</span>
                  </button>
                  <button type="button" onClick={() => setDeliveryType('damaged')} className={`flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all duration-500 group/flow ${deliveryType === 'damaged' ? 'border-rose-500/50 bg-rose-600/20 text-rose-400 shadow-2xl shadow-rose-500/10' : 'border-white/5 bg-white/[0.02] text-slate-700 hover:border-white/10 hover:text-slate-400'}`}>
                    <ShieldAlert size={32} strokeWidth={1.5} className="group-hover/flow:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Dano / Perda</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <SearchableSelect
                  label="Colaborador Destinatário"
                  placeholder="Pesquisar por nome ou BI..."
                  items={employeeItems}
                  selectedId={newDelivery.employeeId || ''}
                  onSelect={(id) => setNewDelivery({...newDelivery, employeeId: id})}
                  disabled={isAutoReplace}
                  icon={User}
                />
                <SearchableSelect
                  label="Equipamento de Proteção (EPI)"
                  placeholder="Seleccionar hardware técnico..."
                  items={epiItems}
                  selectedId={newDelivery.epiId || ''}
                  onSelect={(id) => setNewDelivery({...newDelivery, epiId: id})}
                  disabled={isAutoReplace}
                  icon={HardHat}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Quantidade Integrada</label>
                  <input required type="number" min="1" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all text-lg" value={newDelivery.quantity === 0 ? '' : newDelivery.quantity} onChange={e => setNewDelivery({...newDelivery, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Data do Termo de Entrega</label>
                    <div className="relative group">
                        <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input required type="date" className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all text-lg" value={newDelivery.deliveryDate} onChange={e => setNewDelivery({...newDelivery, deliveryDate: e.target.value})} />
                    </div>
                </div>
              </div>

              {(needsJustification || isAutoReplace) && (
                <div className={`p-8 rounded-[2rem] border transition-all duration-700 animate-in slide-in-from-top-4 ${isAutoReplace ? 'bg-blue-600/10 border-blue-500/30 shadow-2xl' : 'bg-white/[0.03] border-blue-500/20 shadow-xl'}`}>
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] block mb-5 flex items-center gap-3">
                    <AlertTriangle size={16} /> Justificativa Técnica {needsJustification && '(Obrigatória)'}
                  </label>
                  <textarea 
                    required={needsJustification} 
                    readOnly={isAutoReplace}
                    placeholder="Descreva detalhadamente o contexto desta operação de substituição ou entrega excepcional..." 
                    className={`w-full p-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:border-blue-500/30 transition-all placeholder:text-slate-900 text-base min-h-[120px] resize-none ${isAutoReplace ? 'opacity-50' : ''}`} 
                    value={newDelivery.justification} 
                    onChange={e => setNewDelivery({...newDelivery, justification: e.target.value})} 
                  />
                </div>
              )}

              <div className="flex gap-6 pt-6">
                <button type="button" onClick={resetForm} className="flex-1 py-5 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abortar</button>
                <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all border border-white/10">
                  Validar Entrega e Registar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliveries Inventory Table Overhaul */}
      <div className="bg-slate-900/50 backdrop-blur-[40px] rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-30"></div>
        <div className="overflow-x-auto scroll-container relative z-10">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase text-slate-500 font-black tracking-[0.4em] border-b border-white/10">
                <th className="px-12 py-10">Colaborador Destinatário</th>
                <th className="px-12 py-10">Equipamento Activo</th>
                <th className="px-12 py-10 text-center">Estado da Conformidade</th>
                <th className="px-12 py-10 text-right">Acções / Histórico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length > 0 ? [...filtered].reverse().map((delivery, idx) => {
                const emp = employees.find(e => e.id === delivery.employeeId);
                const epi = epis.find(e => e.id === delivery.epiId);
                const isActive = activeDeliveryIds.has(delivery.id);
                const info = getEpiStatusInfo(delivery);
                const isExpired = info.status === DeliveryStatus.EXPIRED && isActive;
                const isWarning = info.diffDays >= 0 && info.diffDays <= 7 && isActive;
                
                return (
                  <tr key={delivery.id} className={`hover:bg-white/[0.03] transition-all duration-700 group/row animate-in fade-in slide-in-from-left-4 ${isExpired ? 'bg-rose-500/[0.03]' : isWarning ? 'bg-amber-500/[0.03]' : !isActive ? 'opacity-30 grayscale-[0.8]' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden group-hover/row:scale-110 transition-transform duration-700">
                          {emp?.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <UserCircle size={32} strokeWidth={1} className="text-slate-800" />}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-3">{emp?.name || 'N/A'}</p>
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{emp?.biNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-6">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700 group-hover/row:scale-110 ${isExpired ? 'bg-rose-600/20 border-rose-500/30 text-rose-400' : isWarning ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' : isActive ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-slate-800'}`}>
                           <Package size={28} strokeWidth={1} />
                         </div>
                         <div className="flex flex-col">
                           <span className={`text-lg font-black uppercase tracking-tighter leading-none mb-2 ${isExpired ? 'text-rose-400' : isWarning ? 'text-amber-400' : isActive ? 'text-white' : 'text-slate-700'}`}>{epi?.name || 'Item Expurgado'}</span>
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{epi?.category || '---'}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-12 py-10 text-center">
                      {isActive && info.expirationDate ? (() => {
                        const ms = info.expirationDate.getTime() - now;
                        let cdString = '';
                        if (ms > 0) {
                          const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                          const s = Math.floor((ms % (1000 * 60)) / 1000);
                          cdString = ms > (1000 * 60 * 60 * 24) ? `${Math.floor(ms / (1000 * 60 * 60 * 24))}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;
                        }
                        
                        return (
                          <div className={`inline-flex flex-col items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-700
                            ${isExpired ? 'bg-rose-600/20 text-rose-400 border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.2)] animate-pulse' : 
                              isWarning ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]' :
                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]'}
                          `}>
                            <div className="flex items-center gap-3">
                                {isExpired ? <ShieldAlert size={16} /> : isWarning ? <AlertTriangle size={16} /> : <Clock size={16} />}
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isExpired ? 'CADUCADO' : 'TEMPO RESTANTE'}</span>
                            </div>
                            <span className="text-sm font-black tracking-tight">{isExpired ? 'CADUCADO' : cdString}</span>
                          </div>
                        );
                      })() : (
                        <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-slate-800">
                          <History size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">HISTÓRICO</span>
                        </div>
                      )}
                    </td>
                    <td className="px-12 py-10 text-right">
                      <div className="flex items-center justify-end gap-10">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-2">{new Date(delivery.deliveryDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest">Lote: {delivery.quantity} Un.</span>
                        </div>
                        {isExpired && (
                          <button onClick={() => handleQuickReplace(delivery)} className="w-14 h-14 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 shadow-2xl shadow-blue-600/40 transition-all active:scale-90 flex items-center justify-center border border-white/10 group/btn">
                            <Zap size={24} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform duration-500" />
                          </button>
                        )}
                        <button onClick={() => setItemToDelete(delivery)} className="w-14 h-14 bg-white/5 text-slate-700 rounded-2xl hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90 flex items-center justify-center border border-white/10 opacity-0 group-hover/row:opacity-100">
                           <Trash2 size={24} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="py-56 text-center group">
                    <div className="flex flex-col items-center gap-10 opacity-30 group-hover:opacity-50 transition-opacity duration-1000">
                      <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/20">
                        <ClipboardList size={56} strokeWidth={1} />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-700 uppercase tracking-widest">Sem Registos Logísticos</h3>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em]">Inicie o controlo de distribuição de activos</p>
                      </div>
                      <button onClick={() => setShowForm(true)} className="mt-6 px-12 py-5 bg-white/5 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-blue-600 transition-all rounded-2xl border border-white/10 shadow-2xl">Lançar Documento #01</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secure Deletion Protocol Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-[30px] z-[500] flex items-center justify-center p-6 duration-500 animate-in fade-in">
          <div className={`bg-slate-900/80 backdrop-blur-[40px] rounded-[3.5rem] p-12 w-full max-w-lg border border-white/10 shadow-[0_64px_256px_rgba(0,0,0,0.8)] relative overflow-hidden text-center scale-up-center ${deleteError ? 'animate-shake' : ''}`}>
             <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-rose-600/50 to-transparent"></div>
             
             <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-[0_0_60px_rgba(244,63,94,0.1)]">
                <ShieldAlert size={48} />
             </div>

             <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Protocolo de Segurança</h3>
             <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto mb-12">Deseja remover o registo de entrega? Esta acção requer <b>Master Key</b> para fins de auditoria.</p>

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
                      {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />} Confirmar Remoção
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
