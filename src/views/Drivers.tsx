import React, { useState } from 'react';
import { Driver, AuthData } from '../types';
import { hashCredential } from '../lib/db';
import { User, Plus, Search, Trash2, Fingerprint, Award, Phone, Edit3, ShieldCheck, ShieldAlert, Lock, Loader2 } from 'lucide-react';
import { Button, Input, Modal, Card, Badge } from '../components/ui';

interface DriversProps {
  drivers: Driver[];
  auth?: AuthData;
  onAdd: (driver: Driver) => void;
  onUpdate: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

const Drivers: React.FC<DriversProps> = ({ drivers, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    name: '', biNumber: '', licenseNumber: '', role: 'Motorista Pesados', phone: '', status: 'Ativo', admissionDate: new Date().toISOString().split('T')[0]
  });

  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(newDriver as Driver);
    } else {
      onAdd({ ...newDriver as Driver, id: crypto.randomUUID(), photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newDriver.name}` });
    }
    setShowForm(false);
    setEditingId(null);
    setNewDriver({ name: '', biNumber: '', licenseNumber: '', role: 'Motorista Pesados', phone: '', status: 'Ativo', admissionDate: new Date().toISOString().split('T')[0] });
  };

  const handleEdit = (driver: Driver) => {
    setNewDriver(driver);
    setEditingId(driver.id);
    setShowForm(true);
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

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNewDriver({ name: '', biNumber: '', licenseNumber: '', role: 'Motorista Pesados', phone: '', status: 'Ativo', admissionDate: new Date().toISOString().split('T')[0] });
  };

  const filtered = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.biNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none mb-3">Corpo de Operadores e Motoristas</h2>
          <p className="text-sm font-bold text-slate-400">Gestão centralizada de credenciais e alocações</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
          <Input
            placeholder="Filtrar por nome ou BI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
            className="w-full md:w-80"
          />
          <Button onClick={() => { resetForm(); setShowForm(true); }} leftIcon={<Plus size={20} />}>
            Registar Motorista
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((d, idx) => (
          <Card key={d.id} className="relative overflow-hidden" padding="lg" hover>
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 transition-colors duration-700 ${d.status === 'Ativo' ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`}></div>
            
            <div className="flex flex-col items-center mb-8 relative z-10 text-center">
              <div className="relative mb-6">
                <img src={d.photoUrl} className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 p-1 shadow-2xl group-hover:scale-110 transition-transform duration-700" />
                <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl border-4 border-slate-900 shadow-xl ${d.status === 'Ativo' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {d.status === 'Ativo' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black text-white leading-none mb-3 uppercase tracking-tight">{d.name}</h4>
                <Badge variant="info">{d.role}</Badge>
              </div>
            </div>

            <div className="space-y-4 mb-8 relative z-10">
               <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-3">
                    <Fingerprint size={16} className="text-blue-500/40" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identidade</span>
                  </div>
                  <span className="text-xs font-black text-white tracking-widest">{d.biNumber}</span>
               </div>
               <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-3">
                    <Award size={16} className="text-blue-500/40" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carta</span>
                  </div>
                  <span className="text-xs font-black text-white tracking-widest">{d.licenseNumber}</span>
               </div>
               {d.phone && (
                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 group-hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center gap-3">
                    <Phone size={16} className="text-blue-500/40" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contacto</span>
                    </div>
                    <span className="text-xs font-bold text-white">{d.phone}</span>
                 </div>
               )}
            </div>

            <div className="flex items-center gap-4 relative z-10 w-full">
              <Button variant="secondary" onClick={() => handleEdit(d)} className="flex-1" leftIcon={<Edit3 size={16} />}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => setItemToDelete(d)} className="p-4">
                <Trash2 size={18} />
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center">
             <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6 border border-white/5">
                <User size={48} className="text-slate-800" strokeWidth={1} />
             </div>
             <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">Nenhum operador encontrado</p>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingId ? 'Editar Colaborador' : 'Novo Motorista'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nome por Extenso"
            placeholder="Ex: João Manuel Santos..."
            value={newDriver.name}
            onChange={e => setNewDriver({...newDriver, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Nº de BI"
              placeholder="000LA000"
              value={newDriver.biNumber}
              onChange={e => setNewDriver({...newDriver, biNumber: e.target.value.toUpperCase()})}
              required
            />
            <Input
              label="Nº da Carta"
              placeholder="000000000"
              value={newDriver.licenseNumber}
              onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value.toUpperCase()})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Telemóvel"
              placeholder="+244..."
              value={newDriver.phone}
              onChange={e => setNewDriver({...newDriver, phone: e.target.value})}
            />
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Função</label>
              <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none appearance-none" value={newDriver.role} onChange={e => setNewDriver({...newDriver, role: e.target.value})}>
                  <option className="bg-slate-900">Motorista Pesados</option>
                  <option className="bg-slate-900">Operador Máquinas</option>
                  <option className="bg-slate-900">Ajudante Carga</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Estado Operacional</label>
            <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none appearance-none" value={newDriver.status} onChange={e => setNewDriver({...newDriver, status: e.target.value as 'Ativo' | 'Inativo'})}>
                <option value="Ativo" className="bg-slate-900">Ativo / Disponível</option>
                <option value="Inativo" className="bg-slate-900">Inativo / Indisponível</option>
            </select>
          </div>

          <Button type="submit" fullWidth>
            {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Eliminar Motorista?" size="sm">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2rem] border border-rose-500/20 flex items-center justify-center shadow-xl shadow-rose-500/5">
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
              Confirme a <strong>Chave Mestra</strong> para remover <strong>{itemToDelete?.name}</strong>.
            </p>
          </div>
          <form onSubmit={handleSecureDelete} className="w-full space-y-6 pt-4">
            <Input
              type="password"
              placeholder="Chave Mestra de Segurança"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={20} />}
              required
            />
            <div className="flex gap-4">
              <Button type="button" variant="ghost" onClick={() => setItemToDelete(null)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" variant="danger" isLoading={isVerifying} leftIcon={<Trash2 size={18} />} className="flex-[2]">
                Confirmar
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Drivers;
