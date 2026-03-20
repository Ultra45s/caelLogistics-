
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Delivery, DeliveryStatus, Employee, EPI } from '../types';
import { 
  ClipboardList, Plus, Search, User, Package, ShieldAlert, 
  CheckCircle2, X, RefreshCcw, Zap, History, ChevronDown, 
  SearchIcon, UserCircle, HardHat, AlertTriangle, Clock
} from 'lucide-react';

interface DeliveriesProps {
  deliveries: Delivery[];
  employees: Employee[];
  epis: EPI[];
  onAdd: (delivery: Delivery) => void;
  onUpdateStatus: (id: string, status: DeliveryStatus) => void;
}

// Sub-componente para Seletor com Busca
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
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg transition-all text-left group ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 bg-white/5'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {selectedItem?.photo ? (
            <img src={selectedItem.photo} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="text-slate-600 group-hover:text-blue-400 transition-colors"><Icon size={20} /></div>
          )}
          <span className={`text-sm font-black uppercase tracking-tight truncate ${selectedItem ? 'text-text-main' : 'text-slate-600'}`}>
            {selectedItem ? selectedItem.name : placeholder}
          </span>
        </div>
        <ChevronDown size={18} className={`text-slate-600 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[160] w-full mt-3 glass-panel border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-2xl">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-text-main outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 scroll-container">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item.id); setIsOpen(false); setSearchTerm(''); }}
                className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left group ${selectedId === item.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
              >
                {item.photo ? (
                  <img src={item.photo} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                ) : (
                  <div className={`p-2.5 rounded-lg border ${selectedId === item.id ? 'bg-blue-500 border-blue-400' : 'bg-white/5 border-white/5 text-slate-600 group-hover:text-blue-400'}`}>
                    <Icon size={18} />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-tight truncate">{item.name}</p>
                  {item.info && <p className={`text-[9px] font-bold uppercase tracking-widest truncate mt-0.5 ${selectedId === item.id ? 'text-blue-100' : 'text-slate-600'}`}>{item.info}</p>}
                </div>
              </button>
            )) : (
              <div className="p-10 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Nenhum resultado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Deliveries: React.FC<DeliveriesProps> = ({ deliveries, employees, epis, onAdd, onUpdateStatus }) => {
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [search, setSearch] = useState('');
  const [deliveryType, setDeliveryType] = useState<'normal' | 'replacement' | 'damaged'>('normal');
  const [isAutoReplace, setIsAutoReplace] = useState(false);

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

  useEffect(() => {
    if (!isAutoReplace) {
      let status = DeliveryStatus.IN_USE;
      if (deliveryType === 'replacement') status = DeliveryStatus.REPLACED;
      if (deliveryType === 'damaged') status = DeliveryStatus.DAMAGED;
      setNewDelivery(prev => ({ ...prev, status }));
    }
  }, [deliveryType, isAutoReplace]);

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

  const needsJustification = !isAutoReplace && (deliveryType !== 'normal' || isEarlyReplacement);

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

  const getEpiStatusInfo = (delivery: Delivery) => {
    const epi = epis.find(e => e.id === delivery.epiId);
    if (!epi) return { status: delivery.status, diffDays: 999 };

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
    if (diffDays < 0) finalStatus = DeliveryStatus.EXPIRED;

    return { status: finalStatus, diffDays, expirationDate };
  };

  const filtered = deliveries.filter(d => {
    const emp = employees.find(e => e.id === d.employeeId);
    const epi = epis.find(e => e.id === d.epiId);
    const searchLower = search.toLowerCase();
    return emp?.name.toLowerCase().includes(searchLower) || emp?.biNumber.toLowerCase().includes(searchLower) || epi?.name.toLowerCase().includes(searchLower);
  });

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
    <div className="space-y-10 scroll-container animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Pesquisar entregas por colaborador ou equipamento..." 
            className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-lg focus:bg-white/10 focus:border-blue-500/50 shadow-2xl outline-none text-text-main placeholder:text-slate-800 font-bold text-sm transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="flex items-center justify-center gap-4 bg-blue-600 text-white px-12 py-6 rounded-lg hover:bg-blue-500 transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 active:scale-95 border border-blue-400/20 group"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" /> Registrar Nova Entrega
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="glass-panel rounded-lg p-12 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 my-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full -mr-40 -mt-40"></div>
            
            <div className="flex items-center justify-between mb-12 relative z-10">
               <div className="flex items-center gap-6">
                 <div className="p-5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10">
                   {isAutoReplace ? <Zap size={32} /> : <ClipboardList size={32} />}
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter leading-none">
                     {isAutoReplace ? 'Substituição Imediata' : 'Entrega de EPI'}
                   </h2>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Protocolo de Segurança Operacional</p>
                 </div>
               </div>
              <button onClick={resetForm} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg text-slate-600 hover:text-text-main hover:bg-white/10 transition-all border border-white/5"><X size={28} /></button>
            </div>

            {!isAutoReplace && (
              <div className="mb-12 relative z-10">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2 block mb-5">Selecione o Fluxo de Operação</label>
                <div className="grid grid-cols-3 gap-6">
                  <button type="button" onClick={() => setDeliveryType('normal')} className={`flex flex-col items-center gap-4 p-8 rounded-lg border transition-all duration-500 group/flow ${deliveryType === 'normal' ? 'border-blue-500/50 bg-blue-500/20 text-blue-400 shadow-2xl shadow-blue-500/20' : 'border-white/5 bg-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'}`}>
                    <CheckCircle2 size={32} className="group-hover/flow:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Primeira Entrega</span>
                  </button>
                  <button type="button" onClick={() => setDeliveryType('replacement')} className={`flex flex-col items-center gap-4 p-8 rounded-lg border transition-all duration-500 group/flow ${deliveryType === 'replacement' ? 'border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-2xl shadow-amber-500/20' : 'border-white/5 bg-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'}`}>
                    <RefreshCcw size={32} className="group-hover/flow:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Substituição</span>
                  </button>
                  <button type="button" onClick={() => setDeliveryType('damaged')} className={`flex flex-col items-center gap-4 p-8 rounded-lg border transition-all duration-500 group/flow ${deliveryType === 'damaged' ? 'border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-2xl shadow-rose-500/20' : 'border-white/5 bg-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'}`}>
                    <ShieldAlert size={32} className="group-hover/flow:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-widest">Dano / Extravio</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SearchableSelect
                  label="Colaborador Beneficiário"
                  placeholder="Pesquisar por nome ou BI..."
                  items={employeeItems}
                  selectedId={newDelivery.employeeId || ''}
                  onSelect={(id) => setNewDelivery({...newDelivery, employeeId: id})}
                  disabled={isAutoReplace}
                  icon={UserCircle}
                />
                <SearchableSelect
                  label="Equipamento de Proteção"
                  placeholder="Pesquisar equipamento..."
                  items={epiItems}
                  selectedId={newDelivery.epiId || ''}
                  onSelect={(id) => setNewDelivery({...newDelivery, epiId: id})}
                  disabled={isAutoReplace}
                  icon={HardHat}
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Quantidade</label>
                  <input required type="number" min="1" className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg" value={newDelivery.quantity === 0 ? '' : newDelivery.quantity} onChange={e => setNewDelivery({...newDelivery, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Data da Movimentação</label>
                  <input required type="date" className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg" value={newDelivery.deliveryDate} onChange={e => setNewDelivery({...newDelivery, deliveryDate: e.target.value})} />
                </div>
              </div>

              {(needsJustification || isAutoReplace) && (
                <div className={`p-8 rounded-lg border transition-all duration-700 ${isAutoReplace ? 'bg-blue-600/10 border-blue-500/30 shadow-2xl shadow-blue-600/10' : 'bg-white/5 border-blue-500/20 ring-8 ring-blue-500/5'}`}>
                  <label className={`text-[10px] font-black uppercase tracking-[0.3em] block mb-4 ${isAutoReplace ? 'text-blue-400' : 'text-blue-400'}`}>
                    Justificativa da Operação {needsJustification && '*'} {isAutoReplace && '(Liberada p/ Expiração)'}
                  </label>
                  <textarea 
                    required={needsJustification} 
                    readOnly={isAutoReplace}
                    placeholder="Descreva detalhadamente o motivo desta substituição..." 
                    className={`w-full p-6 rounded-lg min-h-[140px] font-bold text-text-main border border-transparent focus:border-blue-500/50 focus:bg-white/10 bg-white/5 transition-all outline-none placeholder:text-slate-900 text-lg resize-none ${isAutoReplace ? 'opacity-60' : ''}`} 
                    value={newDelivery.justification} 
                    onChange={e => setNewDelivery({...newDelivery, justification: e.target.value})} 
                  />
                </div>
              )}

              <div className="flex gap-8 pt-6">
                <button type="button" onClick={resetForm} className="flex-1 py-6 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:text-text-main transition-colors">Cancelar</button>
                <button type="submit" className="flex-[2] py-6 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-500 shadow-2xl shadow-blue-600/30 uppercase tracking-widest text-[10px] active:scale-95 border border-blue-400/20 transition-all">CONFIRMAR REGISTRO DE ENTREGA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-lg border border-white/10 overflow-hidden shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-50"></div>
        <div className="overflow-x-auto scroll-container relative z-10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase text-slate-500 font-black tracking-[0.3em] border-b border-white/10">
                <th className="px-10 py-8">Colaborador</th>
                <th className="px-10 py-8">EPI Entregue</th>
                <th className="px-10 py-8 text-center">Gestão de Alertas</th>
                <th className="px-10 py-8">Histórico / Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length > 0 ? [...filtered].reverse().map(delivery => {
                const emp = employees.find(e => e.id === delivery.employeeId);
                const epi = epis.find(e => e.id === delivery.epiId);
                const isActive = activeDeliveryIds.has(delivery.id);
                const info = getEpiStatusInfo(delivery);
                const isExpired = info.status === DeliveryStatus.EXPIRED && isActive;
                const isWarning = info.diffDays >= 0 && info.diffDays <= 7 && isActive;
                
                return (
                  <tr key={delivery.id} className={`hover:bg-white/5 transition-all duration-500 group/row ${isExpired ? 'bg-rose-500/5' : isWarning ? 'bg-amber-500/5' : !isActive ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center text-slate-800 shadow-2xl overflow-hidden border border-white/10 group-hover/row:scale-110 transition-transform duration-500">
                          {emp?.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <User size={28} />}
                        </div>
                        <div>
                          <p className="text-base font-black text-text-main uppercase tracking-tighter leading-none">{emp?.name || 'N/A'}</p>
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            BI: {emp?.biNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                         <div className={`p-3 rounded-lg bg-white/5 border transition-all duration-500 group-hover/row:scale-110 ${isExpired ? 'border-rose-500/30 shadow-2xl shadow-rose-500/10' : isWarning ? 'border-amber-500/30 shadow-2xl shadow-amber-500/10' : isActive ? 'border-blue-500/30 shadow-2xl shadow-blue-500/10' : 'border-white/5'}`}>
                           <Package size={24} className={isExpired ? 'text-rose-400' : isWarning ? 'text-amber-400' : isActive ? 'text-blue-400' : 'text-slate-700'} />
                         </div>
                         <div>
                           <span className={`text-base font-black uppercase tracking-tighter ${isExpired ? 'text-rose-400' : isWarning ? 'text-amber-400' : isActive ? 'text-text-main' : 'text-slate-700'}`}>{epi?.name || 'Item Removido'}</span>
                           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{epi?.category || '---'}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
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
                          <span className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3 border transition-all duration-500
                            ${isExpired ? 'bg-rose-600/20 text-rose-400 border-rose-500/30 shadow-2xl shadow-rose-600/20 animate-pulse' : 
                              isWarning ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-2xl shadow-amber-500/10' :
                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-2xl shadow-emerald-500/10'}
                          `}>
                            {isExpired ? <ShieldAlert size={14} /> : 
                             isWarning ? <AlertTriangle size={14} /> : <Clock size={14} />}
                            {isExpired ? 'Vencimento Crítico' : cdString}
                          </span>
                        );
                      })() : (
                        <span className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3 border transition-all duration-500 bg-white/5 text-slate-700 border-white/5`}>
                          <History size={14} /> Histórico
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center justify-between gap-8">
                        <div className="flex-1">
                          <p className={`text-[11px] font-black tracking-widest uppercase ${isExpired ? 'text-rose-400' : 'text-slate-500'}`}>
                            {new Date(delivery.deliveryDate).toLocaleDateString()}
                          </p>
                          <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">Quantidade: {delivery.quantity} Un.</p>
                        </div>
                        {isExpired && (
                          <button onClick={() => handleQuickReplace(delivery)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 shadow-2xl shadow-blue-600/30 transition-all active:scale-90 flex items-center gap-3 border border-blue-400/20 group/btn">
                            <Zap size={18} fill="white" className="group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Renovar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="py-40 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
                    <div className="relative z-10">
                      <div className="w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center mx-auto mb-8 text-slate-900 border border-white/10 group-hover:scale-110 transition-transform duration-700 shadow-2xl">
                        <ClipboardList size={64} />
                      </div>
                      <p className="text-slate-700 font-black uppercase text-sm tracking-[0.4em] opacity-40">Sem registros operacionais</p>
                      <button onClick={() => setShowForm(true)} className="mt-8 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:text-blue-300 transition-colors">Iniciar Primeira Entrega</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Deliveries;

