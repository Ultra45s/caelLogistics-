
import React, { useState, useMemo } from 'react';
import { Operation, Driver, Vehicle, CargoType, ServiceStatus, AssetType, AuthData } from '../types';
import {
  Container, Plus, MapPin, Truck, X, ClipboardList, Info,
  Package, RefreshCw, Zap, ShieldCheck, Search, Filter,
  Calendar, FileDown, ArrowRight, BarChart3, CheckCircle2,
  Printer, History, AlertCircle, Hash, Edit3, Eye, Trash2, Lock, Loader2
} from 'lucide-react';
import { exportToCSV } from '../lib/db';

interface OperationsProps {
  operations: Operation[];
  drivers: Driver[];
  vehicles: Vehicle[];
  auth?: AuthData;
  onAdd: (op: Operation) => void;
  onUpdate: (op: Operation) => void;
  onDelete?: (id: string) => void;
}

const Operations: React.FC<OperationsProps> = ({ operations, drivers, vehicles, auth, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Estado para Exclusão Segura
  const [itemToDelete, setItemToDelete] = useState<Operation | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const initialFormState: Partial<Operation> = {
    driverId: '', truckId: '', trailerId: '', cargoType: CargoType.CONTAINER,
    cargoOtherSpecification: '', containerNumber: '',
    origin: '', destination: '', client: '', status: ServiceStatus.PENDING,
    startDate: new Date().toISOString().split('T')[0],
    containerReturnDate: ''
  };

  const [formOp, setFormOp] = useState<Partial<Operation>>(initialFormState);

  const handleOpenForm = (op?: Operation) => {
    if (op) {
      setFormOp(op);
      setEditingOpId(op.id);
    } else {
      setFormOp(initialFormState);
      setEditingOpId(null);
    }
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingOpId) {
      onUpdate(formOp as Operation);
    } else {
      const initialStatus = ServiceStatus.IN_TRANSIT;
      onAdd({ ...formOp as Operation, id: crypto.randomUUID(), status: initialStatus });
    }

    setShowForm(false);
    resetForm();
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete || !onDelete) return;
    setIsVerifying(true);
    setDeleteError(false);

    try {
      const { hashCredential } = await import('../lib/db');
      const hashedSearch = await hashCredential(confirmPassword, auth?.salt || '');
      if (hashedSearch === auth?.masterKeyHash) {
        onDelete(itemToDelete.id);
        setItemToDelete(null);
        setConfirmPassword('');
      } else {
        setDeleteError(true);
        setTimeout(() => setDeleteError(false), 500);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const resetForm = () => {
    setFormOp(initialFormState);
    setEditingOpId(null);
  };

  const updateStatus = (op: Operation, newStatus: ServiceStatus) => {
    const update: Partial<Operation> = { status: newStatus };

    // Automação da data de conclusão apenas se não houver uma data manual já definida
    if (newStatus === ServiceStatus.DELIVERED && !op.containerReturnDate) {
      update.containerReturnDate = new Date().toISOString().split('T')[0];
    }

    onUpdate({ ...op, ...update });
  };

  const handlePrintOperation = (op: Operation) => {
    const driver = drivers.find(d => d.id === op.driverId);
    const vehicle = vehicles.find(v => v.id === op.truckId);

    const printContent = `
      <html>
        <head>
          <title>Guia de Serviço - ${op.containerNumber || op.client}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; color: #0f172a; line-height: 1.4; padding: 0; margin: 0; }
            .a4-container { border: 2px solid #e2e8f0; padding: 15mm; min-height: 260mm; position: relative; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: 900; color: #f8fafc; z-index: -1; pointer-events: none; text-transform: uppercase; }
            
            .header { border-bottom: 5px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .header p { margin: 5px 0 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            
            .badge { display: inline-block; padding: 6px 16px; background: #0f172a; color: white; border-radius: 6px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
            
            .section { margin-bottom: 30px; }
            .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; border-left: 6px solid #3b82f6; padding-left: 15px; margin-bottom: 15px; background: #f8fafc; padding-top: 10px; padding-bottom: 10px; }
            
            .grid-2 { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .grid-3 { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 20px; }
            
            .info-box { border: 1px solid #cbd5e1; padding: 12px; border-radius: 10px; background: white; }
            .info-box b { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
            .info-box span { font-size: 13px; font-weight: 700; color: #1e293b; }
            
            .priority-box { background: #eff6ff; border: 2px solid #3b82f6; }
            .priority-box span { font-size: 24px; font-weight: 900; color: #1d4ed8; letter-spacing: -1px; }
            
            .footer { margin-top: 60px; display: grid; grid-template-cols: 1fr 1fr; gap: 50px; }
            .signature-area { border-top: 2px solid #0f172a; text-align: center; padding-top: 12px; }
            .signature-area b { font-size: 11px; display: block; text-transform: uppercase; margin-bottom: 2px; }
            .signature-area span { font-size: 9px; color: #64748b; font-weight: 600; }
            
            .doc-info { position: absolute; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="watermark">${op.status}</div>
            
            <div class="header">
              <div>
                <h1>Comprovativo de Serviço</h1>
                <p>Gestão de Ativos & Logística • cael logistics</p>
              </div>
              <div class="badge">${op.status}</div>
            </div>

            <div class="section">
              <div class="section-title">Informações do Cliente e Mercadoria</div>
              <div class="grid-2">
                <div class="info-box"><b>Cliente / Destinatário</b><span>${op.client}</span></div>
                <div class="info-box"><b>Tipo de Carga</b><span>${op.cargoType}</span></div>
                ${op.cargoOtherSpecification ? `<div class="info-box" style="grid-column: span 2;"><b>Especificação da Mercadoria</b><span>${op.cargoOtherSpecification}</span></div>` : ''}
                ${op.containerNumber ? `<div class="info-box priority-box" style="grid-column: span 2;"><b>IDENTIFICAÇÃO DO CONTENTOR</b><span>${op.containerNumber}</span></div>` : ''}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Logística e Datas de Operação</div>
              <div class="grid-2">
                <div class="info-box"><b>Origem do Carregamento</b><span>${op.origin}</span></div>
                <div class="info-box"><b>Destino da Entrega</b><span>${op.destination}</span></div>
                <div class="info-box"><b>Data de Início (Registo)</b><span>${op.startDate}</span></div>
                <div class="info-box"><b>Data de Conclusão (Arquivo)</b><span>${op.containerReturnDate || 'Processamento em Curso'}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Recursos e Pessoal</div>
              <div class="grid-2">
                <div class="info-box"><b>Motorista Encarregado</b><span>${driver?.name || 'Não atribuído'}</span></div>
                <div class="info-box"><b>Equipamento (Viatura)</b><span>${vehicle?.plate || '---'} (${vehicle?.brand} ${vehicle?.model})</span></div>
              </div>
            </div>

            <div class="footer">
              <div class="signature-area">
                <b>${driver?.name || 'Responsável'}</b>
                <span>Assinatura do Motorista</span>
              </div>
              <div class="signature-area">
                <b>Departamento de Operações</b>
                <span>Validação e Carimbo</span>
              </div>
            </div>

            <div class="doc-info">
              <span>ID Documento: ${op.id.split('-')[0].toUpperCase()}</span>
              <span>Gerado via cael logistics v2.5</span>
              <span>Página 1 de 1</span>
            </div>
          </div>
          <script>window.onload = function() { window.print(); setTimeout(window.close, 500); }</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
    }
  };

  const filtered = useMemo(() => {
    return operations.filter(op => {
      const matchesSearch =
        op.client.toLowerCase().includes(search.toLowerCase()) ||
        op.origin.toLowerCase().includes(search.toLowerCase()) ||
        op.destination.toLowerCase().includes(search.toLowerCase()) ||
        (op.containerNumber && op.containerNumber.toLowerCase().includes(search.toLowerCase()));

      const opDate = new Date(op.startDate);
      const start = dateFilter.start ? new Date(dateFilter.start) : null;
      const end = dateFilter.end ? new Date(dateFilter.end) : null;

      const matchesDate = (!start || opDate >= start) && (!end || opDate <= end);

      return matchesSearch && matchesDate;
    });
  }, [operations, search, dateFilter]);

  const stats = useMemo(() => {
    return {
      containers: filtered.filter(o => o.cargoType === CargoType.CONTAINER).length,
      bigbags: filtered.filter(o => o.cargoType === CargoType.BIG_BAG).length,
      active: filtered.filter(o => o.status === ServiceStatus.IN_TRANSIT || o.status === ServiceStatus.PENDING_RETURN).length,
      delivered: filtered.filter(o => o.status === ServiceStatus.DELIVERED).length
    };
  }, [filtered]);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      {/* Header & Sumário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none mb-3">Arquivo Logístico Central</h2>
          <p className="text-sm font-bold text-slate-400">Monitorização em tempo real de fluxos e ativos</p>
        </div>
        <button onClick={() => handleOpenForm()} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all border border-blue-400/20">
          <Plus size={20} /> Novo Carregamento
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Contentores', value: stats.containers, icon: Container, color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'border-blue-500/20' },
          { label: 'Em Trânsito', value: stats.active, icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Finalizados', value: stats.delivered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Total Volume', value: filtered.length, icon: ClipboardList, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' },
        ].map((s, i) => (
          <div key={i} className={`bg-white/[0.02] backdrop-blur-[30px] p-7 rounded-[2rem] border ${s.border} shadow-xl flex items-center gap-6 group hover:bg-white/[0.05] transition-all duration-500`}>
            <div className={`w-14 h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0 border ${s.border} group-hover:scale-110 transition-transform duration-500`}>
              <s.icon size={26} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-3xl font-black text-white leading-none tracking-tighter">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Busca e Filtro de Datas */}
      <div className="bg-white/[0.02] backdrop-blur-[30px] p-6 rounded-[2rem] border border-white/10 shadow-xl flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por Contentor, Cliente ou Destino..."
            className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/5 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500/30 transition-all font-bold text-white placeholder:text-slate-800"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
          <Calendar size={18} className="text-slate-600" />
          <input type="date" className="bg-transparent p-2 text-[10px] font-black uppercase text-white outline-none focus:text-blue-400 transition-colors" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
          <ArrowRight size={16} className="text-slate-800" />
          <input type="date" className="bg-transparent p-2 text-[10px] font-black uppercase text-white outline-none focus:text-blue-400 transition-colors" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
        </div>
      </div>

      {/* Listagem de Arquivo */}
      <div className="space-y-6">
        {filtered.slice().reverse().map((op, idx) => (
          <div 
            key={op.id} 
            className="bg-white/[0.02] backdrop-blur-[30px] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-10 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${op.status === ServiceStatus.DELIVERED ? 'bg-emerald-500/40 shadow-[4px_0_20px_rgba(16,185,129,0.2)]' : 'bg-amber-500/40 shadow-[4px_0_20px_rgba(245,158,11,0.2)]'}`} />

            <div className="flex items-center gap-8 flex-1 min-w-0 relative z-10 w-full">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 duration-500 ${op.cargoType === CargoType.CONTAINER ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                {op.cargoType === CargoType.CONTAINER ? <Container size={40} strokeWidth={1.5} /> : <Package size={40} strokeWidth={1.5} />}
              </div>
              <div className="min-w-0 flex-1">
                {op.containerNumber ? (
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
                      <Hash size={12} /> ID Contentor
                    </p>
                    <h4 className="text-2xl font-black text-white tracking-tighter leading-none">{op.containerNumber}</h4>
                  </div>
                ) : (
                  <h4 className="text-xl font-black text-white uppercase leading-tight mb-3 tracking-tight">{op.client}</h4>
                )}
                <div className="flex flex-wrap items-center gap-5 text-slate-500">
                  <span className="text-xs font-bold uppercase flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5"><Calendar size={14} className="text-blue-500/50" /> {op.startDate}</span>
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                    <MapPin size={14} className="text-rose-500/50" /> 
                    <span className="text-slate-400">{op.origin}</span>
                    <ArrowRight size={14} className="text-slate-800" />
                    <span className="text-white">{op.destination}</span>
                  </div>
                </div>
                {op.containerNumber && <p className="text-[10px] font-black text-slate-600 uppercase mt-3 tracking-widest">Requisitante: <span className="text-slate-400">{op.client}</span></p>}
                {op.containerReturnDate && <p className="text-[10px] font-black text-emerald-400/80 uppercase mt-3 tracking-[0.2em] flex items-center gap-2 italic"><CheckCircle2 size={14} /> Ciclo finalizado em {op.containerReturnDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 px-10 lg:border-x border-white/5 w-full lg:w-auto relative z-10 shrink-0">
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Alocação Ativa</p>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black text-white uppercase tracking-tight leading-none">
                    {drivers.find(d => d.id === op.driverId)?.name || 'N/A'}
                  </p>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{vehicles.find(v => v.id === op.truckId)?.plate || '---'}</p>
                </div>
              </div>
              <div className="text-right lg:text-left space-y-3">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Fluxo</p>
                <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] inline-block border
                    ${op.status === ServiceStatus.DELIVERED ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'}
                  `}>
                  {op.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0 w-full lg:w-auto justify-end relative z-10">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintOperation(op)}
                  className="p-4 bg-white/5 text-slate-500 hover:bg-blue-600/20 hover:text-blue-400 rounded-2xl transition-all border border-white/5 shadow-xl"
                  title="Exportar Guia"
                >
                  <Printer size={22} strokeWidth={1.5} />
                </button>

                <button
                  onClick={() => handleOpenForm(op)}
                  className="p-4 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white rounded-2xl transition-all border border-white/5 shadow-xl"
                  title="Editar Lote"
                >
                  <Edit3 size={22} strokeWidth={1.5} />
                </button>

                {onDelete && (
                  <button
                    onClick={() => setItemToDelete(op)}
                    className="p-4 bg-rose-500/5 text-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400 rounded-2xl transition-all border border-rose-500/10 shadow-xl"
                    title="Eliminar Registo"
                  >
                    <Trash2 size={22} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {op.status !== ServiceStatus.DELIVERED ? (
                <button
                  onClick={() => updateStatus(op, ServiceStatus.DELIVERED)}
                  className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 border border-emerald-400/20"
                >
                  <CheckCircle2 size={18} /> Entregue
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(op, ServiceStatus.IN_TRANSIT)}
                  className="bg-white/5 border border-white/10 text-slate-500 px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw size={18} /> Reativar
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-24 text-center glass-panel rounded-xl border-2 border-dashed border-white/10">
            <ClipboardList size={56} className="mx-auto text-slate-800 mb-6 opacity-20" />
            <p className="text-slate-600 font-black uppercase text-xs tracking-[0.2em] opacity-40">Nenhum registro encontrado no arquivo central</p>
          </div>
        )}
      </div>

      {/* Modal de Registro/Edição */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-3xl z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-950/[0.85] backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_32px_128px_rgba(0,0,0,0.8)] relative border border-white/10">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5"><Container size={32} strokeWidth={1.5} /></div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-none">{editingOpId ? 'Editar Registo' : 'Novo Carregamento'}</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 leading-none">Terminal Logístico CAEL</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-slate-500 hover:text-white"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cliente / Entidade</label>
                  <input required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-800" placeholder="Nome do Cliente..." value={formOp.client} onChange={e => setFormOp({ ...formOp, client: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Categoria de Carga</label>
                  <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none" value={formOp.cargoType} onChange={e => setFormOp({ ...formOp, cargoType: e.target.value as CargoType })}>
                    {Object.values(CargoType).map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Detalhamento Condicional */}
              {(formOp.cargoType === CargoType.BIG_BAG || formOp.cargoType === CargoType.OTHER) && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-500">
                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-2">Especificação Técnica da Mercadoria *</label>
                  <input
                    required
                    placeholder="Ex: Minério de Cobre, Cimento granulado..."
                    className="w-full p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl font-black text-white focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-amber-900/40"
                    value={formOp.cargoOtherSpecification}
                    onChange={e => setFormOp({ ...formOp, cargoOtherSpecification: e.target.value })}
                  />
                </div>
              )}

              {formOp.cargoType === CargoType.CONTAINER && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-500">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] ml-2">Nº de Identificação do Contentor</label>
                  <input required className="w-full p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl font-black uppercase text-2xl text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-blue-900/30 tracking-widest" placeholder="MSCU0000000" value={formOp.containerNumber} onChange={e => setFormOp({ ...formOp, containerNumber: e.target.value.toUpperCase() })} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Motorista Alocado</label>
                  <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none" value={formOp.driverId} onChange={e => setFormOp({ ...formOp, driverId: e.target.value })}>
                    <option value="" className="bg-slate-900 text-slate-500">Seleccionar Motorista...</option>
                    {drivers.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Viatura de Transporte</label>
                  <select required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none" value={formOp.truckId} onChange={e => setFormOp({ ...formOp, truckId: e.target.value })}>
                    <option value="" className="bg-slate-900 text-slate-500">Seleccionar Ativo...</option>
                    {vehicles.filter(v => v.type !== AssetType.TRAILER).map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate} • {v.brand}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Origem</label>
                  <input required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-800" placeholder="Porto de Luanda, Terminal..." value={formOp.origin} onChange={e => setFormOp({ ...formOp, origin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Destino Final</label>
                  <input required className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-800" placeholder="Fábrica, Armazém..." value={formOp.destination} onChange={e => setFormOp({ ...formOp, destination: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Data de Início</label>
                  <input required type="date" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" value={formOp.startDate} onChange={e => setFormOp({ ...formOp, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2">Data de Conclusão (Arquivo)</label>
                  <input type="date" className="w-full p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl font-bold text-emerald-400 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" value={formOp.containerReturnDate || ''} onChange={e => setFormOp({ ...formOp, containerReturnDate: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-6 text-slate-500 font-black uppercase tracking-[0.3em] text-[11px] hover:text-white transition-colors">Abortar</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all border border-blue-400/20">
                  {editingOpId ? 'Actualizar Arquivo' : 'Efectivar Carregamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Eliminação Segura */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className={`bg-slate-900/90 backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-md shadow-[0_32px_128px_rgba(225,29,72,0.3)] animate-in zoom-in-95 duration-300 border border-rose-500/10 ${deleteError ? 'animate-shake' : ''}`}>
             <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2rem] border border-rose-500/20 flex items-center justify-center shadow-xl shadow-rose-500/5">
                <AlertCircle size={48} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Eliminar Operação?</h3>
                <p className="text-[10px] font-black text-rose-500/50 uppercase tracking-[0.2em] mt-3 italic">Remoção Definitiva do Arquivo</p>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
                Confirme a **Chave Mestra** para apagar este registo. Esta acção não pode ser revertida.
              </p>
              <form onSubmit={handleSecureDelete} className="w-full space-y-6 pt-4">
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" size={20} />
                  <input required autoFocus type="password" placeholder="Chave Mestra de Segurança" className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/30 transition-all placeholder:text-slate-800" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setItemToDelete(null)} className="flex-1 py-5 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors">Cancelar</button>
                  <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-rose-600/30 flex items-center justify-center gap-3 border border-rose-400/20 active:scale-95 transition-all">
                    {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operations;

