
import React, { useState, useRef } from 'react';
import { AdminProfile, AppState } from '../types';
import { User, Building2, Mail, Phone, Camera, Save, ShieldCheck, Database, Download, Upload, Trash2, AlertTriangle, Beaker, RotateCcw, Zap, Cloud, CloudOff, Globe, Loader2, CheckCircle2, Image as ImageIcon, MapPin, Hash } from 'lucide-react';
import { createBackup, generateTestData } from '../db';

interface AdminProfileViewProps {
  profile: AdminProfile;
  appData: AppState;
  onUpdate: (profile: AdminProfile) => void;
  onRestore: (data: AppState) => void;
}

const AdminProfileView: React.FC<AdminProfileViewProps> = ({ profile, appData, onUpdate, onRestore }) => {
  const [editingProfile, setEditingProfile] = useState<AdminProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [googleUser, setGoogleUser] = useState<any>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl' | 'logoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingProfile(prev => ({ ...prev, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('success');
      setGoogleUser({ name: profile.name, email: profile.email });
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editingProfile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-24 animate-in fade-in duration-700 scroll-container">
      <div className="glass-panel rounded-lg shadow-2xl border border-white/10 overflow-hidden relative group">
        <div className="h-52 bg-slate-950 relative p-10 mt-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50"></div>
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full"></div>

          <div className="flex justify-end relative z-10">
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Logotipo Corporativo</div>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-32 h-20 bg-white/5 backdrop-blur-xl rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer overflow-hidden group/logo hover:bg-white/10 transition-all shadow-2xl"
              >
                {editingProfile.logoUrl ? (
                  <img src={editingProfile.logoUrl} className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="text-text-main/20" size={28} />
                )}
                <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-text-main" />
                </div>
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} />
            </div>
          </div>

          <div className="absolute -bottom-16 left-12 z-20">
            <div className="w-40 h-40 bg-slate-950 rounded-lg p-2 shadow-2xl relative border border-white/10">
              <div className="w-full h-full bg-white/5 backdrop-blur-2xl rounded-md overflow-hidden flex items-center justify-center border border-white/10 group/photo">
                {editingProfile.photoUrl ? (
                  <img src={editingProfile.photoUrl} className="w-full h-full object-cover" />
                ) : (
                  <User className="text-slate-800" size={64} />
                )}
                <div onClick={() => photoInputRef.current?.click()} className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera size={32} className="text-text-main" />
                </div>
              </div>
              <button onClick={() => photoInputRef.current?.click()} className="absolute bottom-2 right-2 bg-blue-600 text-white p-3.5 rounded-lg border-4 border-slate-950 shadow-2xl hover:bg-blue-500 transition-colors"><Camera size={20} /></button>
            </div>
            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photoUrl')} />
          </div>
        </div>

        <div className="pt-24 px-12 pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter leading-none mb-3">{editingProfile.name || 'Gestor Operacional'}</h2>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 flex items-center gap-2">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verificado</span>
                </div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  {editingProfile.companyName || 'Terminal CAEL Angola'}
                </p>
              </div>
            </div>
            {isSaved && (
              <div className="bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 animate-in fade-in slide-in-from-right-4 flex items-center gap-2">
                <CheckCircle2 size={16} />
                Configurações Aplicadas
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Identificação do Gestor</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input required className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={editingProfile.name} onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })} placeholder="Ex: Manuel dos Santos" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">E-mail de Acesso</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input required className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={editingProfile.email} onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} placeholder="gestao@cael.ao" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Razão Social / Entidade</label>
                <div className="relative group">
                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input required className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={editingProfile.companyName} onChange={e => setEditingProfile({ ...editingProfile, companyName: e.target.value })} placeholder="Nome da Empresa" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">NIF (Identificação Fiscal)</label>
                <div className="relative group">
                  <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={editingProfile.taxId || ''} onChange={e => setEditingProfile({ ...editingProfile, taxId: e.target.value.toUpperCase() })} placeholder="000000000" />
                </div>
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Sede Operacional / Endereço</label>
                <div className="relative group">
                  <MapPin className="absolute left-5 top-6 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <textarea className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-md font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[100px] resize-none" value={editingProfile.address || ''} onChange={e => setEditingProfile({ ...editingProfile, address: e.target.value })} placeholder="Luanda, Angola..." />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Terminal de Contato</label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input required className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={editingProfile.phone} onChange={e => setEditingProfile({ ...editingProfile, phone: e.target.value })} placeholder="+244 000 000 000" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-blue-600 text-white px-12 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 shadow-2xl shadow-blue-600/30 flex items-center gap-3 active:scale-95 transition-all border border-blue-400/20">
                <Save size={20} /> Atualizar Sede Central
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-panel rounded-lg border border-white/10 p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
          <h3 className="font-black text-text-main uppercase text-sm mb-8 flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30"><Globe size={24} /></div>
            Sincronização em Nuvem
          </h3>

          <div className="p-8 bg-white/5 rounded-lg border border-white/10 flex flex-col items-center text-center gap-6 relative z-10">
            {googleUser ? (
              <>
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20 text-emerald-400 shadow-2xl shadow-emerald-500/10 animate-in zoom-in-50">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <p className="font-black text-text-main text-base tracking-tight uppercase">{googleUser.email}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Terminal Protegido</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-slate-700">
                  <CloudOff size={40} />
                </div>
                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-xs">Seus dados estão restritos a este terminal. Conecte sua conta Cloud para garantir redundância total.</p>
              </>
            )}

            <button
              onClick={handleGoogleSync}
              disabled={syncStatus === 'syncing'}
              className={`w-full py-5 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-2xl border
                ${syncStatus === 'success' ? 'bg-emerald-600 text-white border-emerald-400/20 shadow-emerald-600/30' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}
              `}
            >
              {syncStatus === 'syncing' ? <Loader2 className="animate-spin" size={18} /> : syncStatus === 'success' ? <CheckCircle2 size={18} /> : <Cloud size={18} className="text-blue-400" />}
              {syncStatus === 'syncing' ? 'Estabelecendo Conexão...' : syncStatus === 'success' ? 'Sincronização Ativa' : 'Conectar Google Cloud'}
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-10 text-text-main relative overflow-hidden group border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-1000"><Database size={150} /></div>
          <div className="relative z-10">
            <h3 className="font-black uppercase text-sm mb-3 flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30"><Zap size={24} /></div>
              Protocolos Avançados
            </h3>
            <p className="text-xs text-slate-500 font-bold mb-10 tracking-wide">Gestão de redundância de dados e restauração de sistema.</p>
            <div className="space-y-4">
              <button onClick={() => createBackup(appData)} className="w-full bg-white/5 hover:bg-white/10 p-5 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all border border-white/10 shadow-xl"><Download size={20} className="text-blue-400" /> Exportar Backup Operacional</button>
              <button onClick={() => generateTestData()} className="w-full bg-rose-600/10 hover:bg-rose-600/20 p-5 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all border border-rose-500/20 text-rose-400 shadow-xl"><RotateCcw size={20} /> Resetar e Gerar Telemetria</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileView;

