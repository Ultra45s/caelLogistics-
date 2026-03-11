import React from 'react';
import {
  ShieldCheck,
  Truck,
  Users,
  Brain,
  ClipboardCheck,
  Wrench,
  LayoutDashboard,
  HardHat,
  Zap,
  Globe,
  Database,
  Lock
} from 'lucide-react';

const Catalog: React.FC = () => {
  const features = [
    {
      title: "Monitoramento em Tempo Real",
      description: "Dashboard centralizado com indicadores críticos de logística, segurança e manutenção. Visão holística da operação.",
      icon: LayoutDashboard,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Gestão de Frota e Máquinas",
      description: "Controle detalhado de veículos, incluindo especificações técnicas, status operacional e histórico de utilização.",
      icon: Truck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      title: "IA Logistics (Auditor Inteligente)",
      description: "Inteligência Artificial avançada que analisa dados operacionais para identificar riscos, sugerir otimizações e auditar processos.",
      icon: Brain,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      title: "Manutenção Preditiva",
      description: "Alertas automáticos baseados em quilometragem e tempo para garantir que a frota esteja sempre em condições ideais de segurança.",
      icon: Wrench,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    {
      title: "Controle de EPIs e Segurança",
      description: "Gestão completa de Equipamentos de Proteção Individual, desde o estoque até a entrega nominal para colaboradores.",
      icon: HardHat,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20"
    },
    {
      title: "Gestão de Colaboradores",
      description: "Base de dados centralizada de motoristas e funcionários, integrada com o histórico de segurança e entregas.",
      icon: Users,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20"
    },
    {
      title: "Fichas Digitais de Entrega",
      description: "Digitalização completa de processos de entrega de EPI, eliminando papel e garantindo rastreabilidade jurídica.",
      icon: ClipboardCheck,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    {
      title: "Segurança de Dados Cloud",
      description: "Sincronização em tempo real com Firebase, garantindo que seus dados estejam seguros e acessíveis de qualquer lugar.",
      icon: Lock,
      color: "text-slate-400",
      bg: "bg-white/5",
      border: "border-white/10"
    }
  ];

  const capabilities = [
    { label: "Sincronização Offline", icon: Zap },
    { label: "Acesso Multi-dispositivo", icon: Globe },
    { label: "Backup Automático", icon: Database },
    { label: "Auditoria por IA", icon: ShieldCheck }
  ];

  return (
    <div className="space-y-12 md:space-y-16 pb-24 scroll-container animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden glass-panel rounded-lg p-8 md:p-16 text-text-main shadow-md border border-white/10 group">
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600 rounded-full blur-[100px] md:blur-[150px] opacity-20 -mr-24 -mt-24 md:-mr-48 md:-mt-48 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-10 -ml-32 -mb-32"></div>
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 mb-6 md:mb-8 animate-in slide-in-from-left-4 duration-500">
            <ShieldCheck size={16} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-text-main">Sistema Certificado CAEL Logists</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase mb-6 md:mb-8 leading-[1.1] md:leading-[0.9] text-text-main animate-in slide-in-from-left-8 duration-700 break-words">
            Terminal Logístico <br />
            <span className="text-blue-500 font-black">CAEL Logists</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-bold leading-relaxed mb-8 md:mb-12 max-w-2xl animate-in slide-in-from-left-12 duration-1000">
            Uma solução integrada de alta performance para gestão de frotas, segurança do trabalho e inteligência operacional. Desenvolvido para o mercado logístico de Angola.
          </p>
          <div className="flex flex-wrap gap-3 md:gap-5 animate-in slide-in-from-bottom-8 duration-1000">
            {capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-3 bg-white/5 backdrop-blur-2xl px-4 md:px-6 py-2.5 md:py-3.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-default shadow-sm">
                <cap.icon size={16} className="text-blue-400" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-main">{cap.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {features.map((feature, i) => (
          <div key={i} className={`glass-card p-8 md:p-10 rounded-lg group border ${feature.border} hover:border-white/20 transition-all duration-700 hover:scale-[1.03] shadow-md relative overflow-hidden flex flex-col`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className={`w-14 h-14 md:w-16 md:h-16 ${feature.bg} rounded-lg flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500 border ${feature.border} shadow-md relative z-10`}>
              <feature.icon className={feature.color} size={28} />
            </div>
            <h3 className="text-lg md:text-xl font-black text-text-main uppercase tracking-tighter mb-4 relative z-10 leading-none break-words">{feature.title}</h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold leading-relaxed relative z-10">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Technical Specs */}
      <div className="glass-panel rounded-lg p-8 md:p-16 text-text-main flex flex-col lg:flex-row items-center justify-between gap-10 md:gap-12 border border-white/10 relative overflow-hidden shadow-md group">
        <div className="absolute inset-0 bg-blue-600/5 z-0 group-hover:bg-blue-600/10 transition-colors duration-1000"></div>
        <div className="relative z-10 max-w-2xl text-center lg:text-left">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 leading-[1.1] md:leading-none break-words">Pronto para a Escala Global</h2>
          <p className="text-base md:text-lg text-slate-400 font-bold leading-relaxed">
            O CAEL Logists utiliza tecnologias de ponta como React 19, Firebase Cloud Firestore e Inteligência Artificial Generativa para garantir que sua operação nunca pare, independente do volume de dados.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center group/stat">
            <p className="text-4xl md:text-6xl font-black mb-2 text-blue-400 tracking-tighter group-hover/stat:scale-110 transition-transform duration-500">100%</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Cloud Native</p>
          </div>
          <div className="text-center group/stat">
            <p className="text-4xl md:text-6xl font-black mb-2 text-emerald-400 tracking-tighter group-hover/stat:scale-110 transition-transform duration-500">0ms</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Data Latency</p>
          </div>
          <div className="text-center group/stat">
            <p className="text-4xl md:text-6xl font-black mb-2 text-purple-400 tracking-tighter group-hover/stat:scale-110 transition-transform duration-500">24/7</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-500">Monitoramento</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
