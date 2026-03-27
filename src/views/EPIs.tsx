import React, { useState, useMemo } from 'react';
import { EPI, LifespanUnit, AuthData } from '../types';
import { hashCredential } from '../lib/db';
import { Plus, Search, HardHat, ShieldCheck, Clock, Trash2, Lock, Loader2 } from 'lucide-react';
import { Button, Input, Select, Modal, Card, Badge } from '../components/ui';

interface EPIsProps {
  epis: EPI[];
  auth?: AuthData;
  onAdd: (epi: EPI) => void;
  onDelete: (id: string) => void;
}

const categoryOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'Proteção Facial', label: 'Proteção Facial' },
  { value: 'Mãos', label: 'Mãos (Luvas)' },
  { value: 'Pés', label: 'Pés (Botas/Sapatos)' },
  { value: 'Cabeça', label: 'Cabeça (Capacetes)' },
  { value: 'Corpo', label: 'Corpo (Fardamento)' },
  { value: 'Proteção Auditiva', label: 'Proteção Auditiva' },
  { value: 'Descartáveis', label: 'Descartáveis' }
];

const EPIs: React.FC<EPIsProps> = ({ epis, auth, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

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

    try {
      setIsVerifying(true);
      const isValid = await (window as any).electron?.ipcRenderer?.invoke('verify-password', confirmPassword, auth?.masterKeyHash);
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
    <div className="space-y-12 pb-24 scroll-container animate-in fade-in duration-1000">
      <div className="bg-slate-900/50 backdrop-blur-[40px] p-12 rounded-[3rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/5 opacity-50"></div>
        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="md:pr-12 md:border-r border-white/10 text-center md:text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Catálogo Ativo</p>
            <div className="flex items-end gap-3 justify-center md:justify-start">
                <h3 className="text-5xl font-black text-white tracking-tighter leading-none">{epis.length}</h3>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Itens</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start flex-1">
            {categoryStats.map(([cat, count], idx) => (
              <div key={cat} className="px-8 py-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-6 hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-default group/cat shadow-xl animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover/cat:text-white transition-colors">{cat}</span>
                <span className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center text-sm font-black border border-blue-500/20 shadow-2xl group-hover/cat:bg-blue-600 group-hover/cat:text-white transition-all">{count}</span>
              </div>
            ))}
            {categoryStats.length === 0 && (
              <div className="flex items-center gap-4 text-slate-700 italic">
                <ShieldCheck size={20} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">O catálogo de segurança aguarda registos iniciais</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <Input
          placeholder="Rastrear item no inventário técnico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={24} strokeWidth={1.5} />}
          className="flex-1"
        />
        <Button onClick={() => setShowForm(true)} leftIcon={<Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />}>
          Integrar EPI
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registo de Equipamento" size="lg">
        <form onSubmit={handleSubmit} className="space-y-10">
          <Input
            label="Designação do Material"
            placeholder="Ex: Luvas de Nitrilo High-Performance"
            value={newEpi.name}
            onChange={e => setNewEpi({ ...newEpi, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Select
              label="Categoria Técnica"
              options={categoryOptions}
              value={newEpi.category}
              onChange={e => setNewEpi({ ...newEpi, category: e.target.value })}
              required
            />
            <Input
              label="Intervalo de Validade"
              type="number"
              min="1"
              value={newEpi.lifespanValue === 0 ? '' : newEpi.lifespanValue}
              onChange={e => setNewEpi({ ...newEpi, lifespanValue: e.target.value === '' ? 0 : Number(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Unidade de Tempo Temporal</label>
            <div className="grid grid-cols-3 gap-6">
              {(['days', 'weeks', 'months'] as LifespanUnit[]).map(unit => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setNewEpi({ ...newEpi, lifespanUnit: unit })}
                  className={`py-5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.3em] transition-all ${newEpi.lifespanUnit === unit
                      ? 'border-blue-500/50 bg-blue-600/20 text-blue-400 shadow-2xl shadow-blue-500/10'
                      : 'border-white/5 bg-white/[0.02] text-slate-600 hover:border-white/10 hover:text-slate-400'
                    }`}
                >
                  {unit === 'days' ? 'Dias' : unit === 'weeks' ? 'Semanas' : 'Meses'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-6 pt-6">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
              Abortar
            </Button>
            <Button type="submit" className="flex-[2]">
              Validar e Arquivar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Expurgo de Inventário" size="sm">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="w-24 h-24 bg-rose-600/10 text-rose-500 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-600/10">
            <Trash2 size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-bold leading-relaxed px-6">
              Confirme a <strong className="text-white">Chave Mestra</strong> para remover <strong className="text-white">{itemToDelete?.name}</strong>.
            </p>
          </div>
          
          <form onSubmit={handleSecureDelete} className="w-full space-y-8">
            <Input
              type="password"
              placeholder="Chave de Segurança"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              required
            />
            <div className="flex gap-4">
              <Button type="button" variant="ghost" onClick={() => { setItemToDelete(null); setConfirmPassword(''); }} className="flex-1">
                Abortar
              </Button>
              <Button type="submit" variant="danger" isLoading={isVerifying} leftIcon={<Trash2 size={18} />} className="flex-[2]">
                Validar Purga
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-32">
        {filtered.map((epi, idx) => (
          <Card key={epi.id} className="relative overflow-hidden" padding="lg" hover>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center gap-8 mb-10 relative z-10">
              <div className="w-20 h-20 bg-blue-600/10 text-blue-400 rounded-[2rem] flex items-center justify-center border border-blue-500/20 shadow-2xl group-hover:bg-blue-600/20 transition-all duration-500">
                <HardHat size={36} strokeWidth={1.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-white leading-none truncate uppercase tracking-tighter text-xl mb-3">{epi.name}</h4>
                <Badge variant="info">{epi.category}</Badge>
              </div>
              <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setItemToDelete(epi); }} className="w-12 h-12">
                <Trash2 size={24} strokeWidth={1.5} />
              </Button>
            </div>

            <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 flex items-center justify-between relative z-10 group-hover:bg-white/[0.06] transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
                  <Clock size={18} className="text-blue-400" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Prazo Técnico</span>
              </div>
              <span className="text-base font-black text-white uppercase tracking-tighter">
                {epi.lifespanValue} {getUnitLabel(epi.lifespanUnit, epi.lifespanValue)}
              </span>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-48 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-28 h-28 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 text-slate-900 border border-white/5 transition-transform duration-700 shadow-2xl"><ShieldCheck size={56} strokeWidth={1} /></div>
              <h3 className="text-2xl font-black text-slate-700 uppercase tracking-widest mb-4">Catálogo Inexistente</h3>
              <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em]">Inicie a integração do inventário de segurança</p>
              <Button onClick={() => setShowForm(true)} variant="secondary" className="mt-12">
                Cadastrar Item #01
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EPIs;
