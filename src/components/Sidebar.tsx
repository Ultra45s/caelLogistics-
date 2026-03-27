import React from 'react';
import {
    LayoutDashboard,
    Users,
    Truck,
    LogOut,
    Container,
    Wrench,
    HardHat,
    ClipboardCheck,
    ShieldCheck,
    ChevronRight,
    Brain,
    X,
    User,
    Settings,
    Droplet
} from 'lucide-react';
import { AdminProfile } from '../types';

export const navItems = [
    { id: 'dashboard', label: 'Monitoramento', icon: LayoutDashboard, category: 'Geral' },
    { id: 'fleet', label: 'Frota e Máquinas', icon: Truck, category: 'Logística' },
    { id: 'drivers', label: 'Motoristas', icon: Users, category: 'Logística' },
    { id: 'fuel', label: 'Abastecimentos', icon: Droplet, category: 'Logística' },
    { id: 'operations', label: 'Entregas e Serviços', icon: Container, category: 'Logística' },
    { id: 'maintenance', label: 'Manutenção', icon: Wrench, category: 'Logística' },
    { id: 'employees', label: 'Colaboradores', icon: Users, category: 'Segurança' },
    { id: 'epis', label: 'Catálogo de EPI', icon: HardHat, category: 'Segurança' },
    { id: 'deliveries', label: 'Fichas de EPI', icon: ClipboardCheck, category: 'Segurança' },
    { id: 'auditor', label: 'IA Logistics', icon: Brain, category: 'Inteligência' },
    { id: 'profile', label: 'Sede Central', icon: User, category: 'Config' },
    { id: 'catalog', label: 'Catálogo App', icon: ShieldCheck, category: 'Sistema' },
];

export const categories = ['Geral', 'Logística', 'Segurança', 'Inteligência', 'Config', 'Sistema'];

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    admin: AdminProfile;
}

const Sidebar: React.FC<SidebarProps> = ({
    isSidebarOpen,
    setIsSidebarOpen,
    activeTab,
    setActiveTab,
    onLogout,
    admin
}) => {
    return (
        <aside className={`fixed inset-y-0 left-0 z-[70] w-72 glass-panel text-text-main transform transition-all duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:shadow-none border-r border-white/10`}>
            <div className="flex flex-col h-full">
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter uppercase leading-none">CAEL<span className="text-brand-text ml-1">Logistics</span></span>
                            <span className="text-[8px] font-black text-muted uppercase tracking-[0.4em] mt-1">Terminal Operacional</span>
                        </div>
                    </div>
                    <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-8 overflow-y-auto custom-scrollbar">
                    {categories.map(cat => (
                        <div key={cat} className="space-y-1">
                            <p className="px-4 text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-3 mt-4">{cat}</p>
                            {navItems.filter(i => i.category === cat).map((item) => (
                                <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                                    className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-lg transition-all active:scale-[0.98] ${activeTab === item.id ? 'bg-brand text-text-main shadow-lg shadow-brand/30' : 'text-muted hover:bg-white/5 hover:text-text-main'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} className={activeTab === item.id ? 'text-text-main' : 'text-muted group-hover:text-brand-text transition-colors'} />
                                        <span className="font-bold text-xs tracking-tight">{item.label}</span>
                                    </div>
                                    {activeTab === item.id && <ChevronRight size={14} className="opacity-50" />}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-6 space-y-4">
                    <button
                        onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border group ${activeTab === 'profile' ? 'bg-brand/10 border-brand/30 shadow-lg shadow-brand/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                        <div className="w-12 h-12 rounded-lg border border-white/20 overflow-hidden shrink-0 shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
                            {admin?.photoUrl ? (
                                <img src={admin.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-brand-text bg-brand/10 uppercase italic">
                                    {(admin?.name || 'G').charAt(0)}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Settings size={16} className="text-white animate-pulse" />
                            </div>
                        </div>
                        <div className="text-left overflow-hidden">
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest leading-none mb-1.5 opacity-60">Sede Central</p>
                            <p className="text-xs font-black text-text-main truncate uppercase tracking-tight">{admin?.name || 'Gestor'}</p>
                        </div>
                    </button>

                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-5 py-4 text-rose-400 bg-rose-400/5 hover:bg-rose-400/10 rounded-lg border border-rose-400/20 active:scale-95 transition-all group">
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Sair do Terminal</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

