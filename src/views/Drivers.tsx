
import React, { useState } from 'react';
import { Driver } from '../types';
import { Users, Plus, Search, Trash2, X, Fingerprint, Award } from 'lucide-react';

interface DriversProps {
  drivers: Driver[];
  onAdd: (driver: Driver) => void;
  onUpdate: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

const Drivers: React.FC<DriversProps> = ({ drivers, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    name: '', biNumber: '', licenseNumber: '', role: 'Motorista Pesados', admissionDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...newDriver as Driver, id: crypto.randomUUID(), photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newDriver.name}` });
    setShowForm(false);
  };

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.biNumber.includes(search));

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700 scroll-container">
       <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou BI..." 
            className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg outline-none focus:ring-4 focus:ring-blue-500/10 text-text-main placeholder:text-slate-600 backdrop-blur-xl transition-all font-bold" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all border border-blue-400/20 flex items-center justify-center gap-3"
        >
          <Plus size={22} /> Novo Motorista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(d => (
          <div key={d.id} className="glass-card p-8 rounded-lg border border-white/10 shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-colors"></div>
            
            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div className="relative">
                <img src={d.photoUrl} className="w-20 h-20 rounded-lg bg-white/5 border border-white/10 p-1 shadow-2xl group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-950 shadow-lg"></div>
              </div>
              <div>
                <h4 className="text-xl font-black text-text-main leading-none mb-2 uppercase tracking-tight">{d.name}</h4>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                  {d.role}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-8 relative z-10">
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-slate-900 rounded-md text-slate-500"><Fingerprint size={18} /></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Identidade (BI)</p>
                    <p className="text-sm font-black text-text-main tracking-wider">{d.biNumber}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-slate-900 rounded-md text-slate-500"><Award size={18} /></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Carta de Condução</p>
                    <p className="text-sm font-black text-text-main tracking-wider">{d.licenseNumber}</p>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => onDelete(d.id)} 
              className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest border border-rose-500/10 rounded-lg hover:bg-rose-500/10 transition-all active:scale-95 relative z-10"
            >
              Remover do Terminal
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center glass-panel rounded-lg border-2 border-dashed border-white/10">
             <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
                <Users size={48} className="text-slate-900 opacity-40" />
             </div>
             <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em] opacity-40">Nenhum motorista encontrado</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-lg p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 my-auto">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><Users size={28} /></div>
                 <h2 className="text-3xl font-black text-text-main uppercase tracking-tight">Novo Motorista</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-600 hover:text-text-main transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <input required placeholder="Ex: João Manuel" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-900" value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nº de BI</label>
                <input required placeholder="000000000LA000" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-900" value={newDriver.biNumber} onChange={e => setNewDriver({...newDriver, biNumber: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nº da Carta de Condução</label>
                <input required placeholder="000000000" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-900" value={newDriver.licenseNumber} onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Função Operacional</label>
                <select className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none" value={newDriver.role} onChange={e => setNewDriver({...newDriver, role: e.target.value})}>
                  <option className="bg-slate-950">Motorista Pesados</option>
                  <option className="bg-slate-950">Operador de Máquinas</option>
                  <option className="bg-slate-950">Ajudante de Carga</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all border border-blue-400/20 mt-6">
                Confirmar Cadastro no Terminal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;

