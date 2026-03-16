
import React, { useState, useMemo } from 'react';
import { EPI, LifespanUnit, AuthData } from '../types';
import { hashCredential } from '../db';
import { Plus, Search, HardHat, ShieldCheck, Clock, Trash2, CalendarRange, Filter, X, Lock, Loader2, ShieldAlert, ChevronDown } from 'lucide-react';

interface EPIsProps {
  epis: EPI[];
  auth?: AuthData;
  onAdd: (epi: EPI) => void;
  onDelete: (id: string) => void;
}

const EPIs: React.FC<EPIsProps> = ({ epis, auth, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  // Estados para exclusão segura
  const [itemToDelete, setItemToDelete] = useState<EPI | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newEpi, setNewEpi] = useState<Partial<EPI>>({
    name: '',
    category: '',
    lifespanValue: 1,
    lifespanUnit: 'months',
    registrationDate: new Date().toISOString().split('T')[0]
  });

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    epis.forEach(e => {
      stats[e.category] = (stats[e.category] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [epis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEpi.name && newEpi.category) {
      onAdd({ ...newEpi as EPI, id: crypto.randomUUID() });
      setNewEpi({ name: '', category: '', lifespanValue: 1, lifespanUnit: 'months', registrationDate: new Date().toISOString().split('T')[0] });
      setShowForm(false);
    }
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
    } catch (err) {
      console.error("Erro na verificação", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const filtered = epis.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const getUnitLabel = (unit: LifespanUnit, val: number) => {
    if (unit === 'days') return val === 1 ? 'Dia' : 'Dias';
    if (unit === 'weeks') return val === 1 ? 'Semana' : 'Semanas';
    return val === 1 ? 'Mês' : 'Meses';
  };

  return (
    <div className="space-y-10 pb-24 scroll-container animate-in fade-in duration-700">
      {/* Category Summary Bar */}
      <div className="glass-panel p-10 rounded-lg border border-white/10 shadow-2xl overflow-x-auto scroll-container relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-50"></div>
        <div className="flex items-center gap-12 min-w-max relative z-10">
          <div className="pr-12 border-r border-white/10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Total de Tipos</p>
            <h3 className="text-3xl font-black text-text-main tracking-tighter leading-none">{epis.length}</h3>
          </div>
          <div className="flex gap-5">
            {categoryStats.map(([cat, count]) => (
              <div key={cat} className="px-6 py-4 bg-white/5 border border-white/10 rounded-lg flex items-center gap-5 hover:bg-white/10 transition-all cursor-default group/cat shadow-xl">
                <span className="text-[11px] font-black text-slate-400 uppercase whitespace-nowrap tracking-[0.2em] group-hover/cat:text-blue-400 transition-colors">{cat}</span>
                <span className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black border border-blue-400/20 shadow-2xl shadow-blue-600/30 group-hover/cat:scale-110 transition-transform">{count}</span>
              </div>
            ))}
            {categoryStats.length === 0 && (
              <p className="text-[11px] font-bold text-slate-700 uppercase italic tracking-widest py-4">Cadastre itens para ver o resumo por categoria</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={22} />
          <input
            type="text"
            placeholder="Pesquisar equipamento no catálogo..."
            className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-lg focus:bg-white/10 focus:border-blue-500/50 shadow-2xl outline-none transition-all text-text-main placeholder:text-slate-800 font-bold text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-4 bg-blue-600 text-white px-12 py-6 rounded-lg hover:bg-blue-500 transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 active:scale-95 border border-blue-400/20 group"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />
          Novo Equipamento (EPI)
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="glass-panel rounded-lg p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 my-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

            <div className="flex justify-between items-center mb-12 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><HardHat size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter leading-none">Cadastrar EPI</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Catálogo de Segurança</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg text-slate-600 hover:text-text-main hover:bg-white/10 transition-all border border-white/5"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nome do Equipamento</label>
                <input required type="text" placeholder="Ex: Máscara descartável, Luvas de Nitrilo..."
                  className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-900 text-lg"
                  value={newEpi.name} onChange={e => setNewEpi({ ...newEpi, name: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Categoria Técnica</label>
                  <div className="relative group">
                    <select required className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                      value={newEpi.category} onChange={e => setNewEpi({ ...newEpi, category: e.target.value })}>
                      <option value="" className="bg-slate-950">Selecione...</option>
                      <option value="Proteção Facial" className="bg-slate-950">Proteção Facial</option>
                      <option value="Mãos" className="bg-slate-950">Mãos (Luvas)</option>
                      <option value="Pés" className="bg-slate-950">Pés (Botas)</option>
                      <option value="Cabeça" className="bg-slate-950">Cabeça (Capacetes)</option>
                      <option value="Corpo" className="bg-slate-950">Corpo (Fardamento)</option>
                      <option value="Proteção Auditiva" className="bg-slate-950">Proteção Auditiva</option>
                      <option value="Descartáveis" className="bg-slate-950">Descartáveis em Geral</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-blue-400 transition-colors" size={20} />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Prazo de Validade</label>
                  <input required type="number" min="1" className="w-full p-6 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg"
                    value={newEpi.lifespanValue === 0 ? '' : newEpi.lifespanValue} onChange={e => setNewEpi({ ...newEpi, lifespanValue: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Unidade de Tempo Operacional</label>
                <div className="grid grid-cols-3 gap-6">
                  {(['days', 'weeks', 'months'] as LifespanUnit[]).map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setNewEpi({ ...newEpi, lifespanUnit: unit })}
                      className={`py-6 rounded-lg border font-black text-[10px] uppercase tracking-[0.3em] transition-all ${newEpi.lifespanUnit === unit
                          ? 'border-blue-500/50 bg-blue-500/20 text-blue-400 shadow-2xl shadow-blue-500/20'
                          : 'border-white/5 bg-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'
                        }`}
                    >
                      {unit === 'days' ? 'DIAS' : unit === 'weeks' ? 'SEMANAS' : 'MESES'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-8 pt-10">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-6 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:text-text-main transition-colors">Cancelar Operação</button>
                <button type="submit" className="flex-[2] py-6 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-500 shadow-2xl shadow-blue-600/30 uppercase tracking-widest text-[10px] active:scale-95 border border-blue-400/20 transition-all">SALVAR EQUIPAMENTO NO CATÁLOGO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Segura para EPI */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[200] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className={`glass-panel rounded-lg p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-500 transition-transform border border-white/10 my-auto relative overflow-hidden ${deleteError ? 'animate-shake' : ''}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

            <div className="flex flex-col items-center text-center space-y-8 relative z-10">
              <div className="w-28 h-28 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-500/20">
                <ShieldAlert size={56} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-text-main uppercase tracking-tighter leading-none">Remover do Catálogo?</h3>
                <p className="text-sm text-slate-500 font-bold leading-relaxed max-sm mx-auto">
                  Você está removendo o EPI <span className="text-text-main">{itemToDelete.name}</span>.
                  <span className="block mt-4 font-black text-rose-400 uppercase text-[10px] tracking-[0.3em]">Ação Crítica e Irreversível</span>
                </p>
              </div>

              <form onSubmit={handleSecureDelete} className="w-full space-y-8 pt-4">
                <div className="space-y-4 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Senha de Autorização Mestra</label>
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within:text-blue-400 transition-colors" size={24} />
                    <input
                      required
                      autoFocus
                      type="password"
                      placeholder="Confirme sua identidade de gestor"
                      className={`w-full pl-16 pr-8 py-6 bg-white/5 border rounded-lg font-bold text-text-main outline-none transition-all placeholder:text-slate-900 text-lg ${deleteError ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 focus:border-blue-500/50'}`}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <button
                    type="button"
                    onClick={() => { setItemToDelete(null); setConfirmPassword(''); setDeleteError(false); }}
                    className="flex-1 py-6 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-text-main transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isVerifying}
                    type="submit"
                    className="flex-[2] bg-rose-600 text-white py-6 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-600/30 flex items-center justify-center gap-4 border border-rose-400/20 active:scale-95 transition-all"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                    Confirmar Exclusão
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filtered.map(epi => (
          <div key={epi.id} className="glass-card p-10 rounded-lg border border-white/5 shadow-2xl hover:border-blue-500/30 hover:scale-[1.03] transition-all duration-700 group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="flex items-center gap-6 mb-10 relative z-10">
              <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center border border-blue-500/20 shadow-inner group-hover:bg-blue-500/20 transition-all duration-500 group-hover:scale-110">
                <HardHat size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-text-main leading-none truncate uppercase tracking-tighter text-lg">{epi.name}</h4>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-3">{epi.category}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setItemToDelete(epi); }}
                className="w-12 h-12 flex items-center justify-center text-slate-800 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"
              >
                <Trash2 size={22} />
              </button>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/5 flex items-center justify-between relative z-10 group-hover:bg-white/10 transition-all duration-500">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <CalendarRange size={20} className="text-blue-400" />
                </div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Duração Técnica</span>
              </div>
              <span className="text-sm font-black text-text-main bg-blue-600/20 px-6 py-3 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-600/10 group-hover:scale-105 transition-transform">
                {epi.lifespanValue} {getUnitLabel(epi.lifespanUnit, epi.lifespanValue)}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-40 text-center glass-panel rounded-lg border-2 border-dashed border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
            <div className="relative z-10">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-900 border border-white/5 group-hover:scale-110 transition-transform duration-700 shadow-2xl"><HardHat size={64} /></div>
              <p className="text-slate-700 font-black uppercase text-sm tracking-[0.4em] opacity-40">Nenhum equipamento no catálogo</p>
              <button onClick={() => setShowForm(true)} className="mt-8 text-blue-400 font-black uppercase text-[10px] tracking-widest hover:text-blue-300 transition-colors">Cadastrar Primeiro Item</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EPIs;

