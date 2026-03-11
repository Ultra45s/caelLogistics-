
import React, { useState, useMemo } from 'react';
import { Operation, Driver, Vehicle, CargoType, ServiceStatus, AssetType } from '../types';
import {
  Container, Plus, MapPin, Truck, X, ClipboardList, Info,
  Package, RefreshCw, Zap, ShieldCheck, Search, Filter,
  Calendar, FileDown, ArrowRight, BarChart3, CheckCircle2,
  Printer, History, AlertCircle, Hash, Edit3, Eye
} from 'lucide-react';
import { exportToCSV } from '../db';

interface OperationsProps {
  operations: Operation[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onAdd: (op: Operation) => void;
  onUpdate: (op: Operation) => void;
}

const Operations: React.FC<OperationsProps> = ({ operations, drivers, vehicles, onAdd, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

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
                <p>Gestão de Ativos & Logística • CAEL Logists</p>
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
              <span>Gerado via CAEL Logists v2.5</span>
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
    <div className="space-y-6 pb-24 scroll-container">
      {/* Header & Sumário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Arquivo Logístico</h2>
          <p className="text-xs font-bold text-slate-400">Gestão integral de fretes e documentação</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleOpenForm()} className="bg-blue-600 text-white px-8 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20">
            <Plus size={16} /> Novo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Contentores', value: stats.containers, icon: Container, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Em Andamento', value: stats.active, icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Entregues', value: stats.delivered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Total Filtro', value: filtered.length, icon: ClipboardList, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' },
        ].map((s, i) => (
          <div key={i} className={`glass-card p-6 rounded-md border ${s.border} shadow-sm flex items-center gap-5`}>
            <div className={`w-12 h-12 rounded-md ${s.bg} ${s.color} flex items-center justify-center shrink-0 border ${s.border}`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{s.label}</p>
              <p className="text-2xl font-black text-text-main leading-none mt-1">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Busca e Filtro de Datas */}
      <div className="glass-panel p-5 rounded-lg border border-white/10 shadow-sm flex flex-col md:flex-row gap-5 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por Contentor, Cliente ou Destino..."
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-lg outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all font-medium text-text-main placeholder:text-slate-600"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto px-2">
          <Calendar size={16} className="text-slate-500" />
          <input type="date" className="flex-1 md:w-36 p-3 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase text-text-main outline-none focus:ring-1 focus:ring-blue-500/50" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} />
          <ArrowRight size={14} className="text-slate-700" />
          <input type="date" className="flex-1 md:w-36 p-3 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase text-text-main outline-none focus:ring-1 focus:ring-blue-500/50" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} />
        </div>
      </div>

      {/* Listagem de Arquivo */}
      <div className="space-y-5">
        {filtered.slice().reverse().map(op => (
          <div key={op.id} className="glass-card p-7 rounded-md border border-white/5 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8 hover:border-blue-500/30 transition-all group relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${op.status === ServiceStatus.DELIVERED ? 'bg-emerald-500/50' : 'bg-amber-500/50'}`} />

            <div className="flex items-center gap-7 flex-1 min-w-0 relative z-10">
              <div className={`w-16 h-16 rounded-md flex items-center justify-center shrink-0 border ${op.cargoType === CargoType.CONTAINER ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                {op.cargoType === CargoType.CONTAINER ? <Container size={32} /> : <Package size={32} />}
              </div>
              <div className="min-w-0">
                {op.containerNumber ? (
                  <div className="mb-2">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Hash size={12} /> Nº Contentor Prioritário
                    </p>
                    <h4 className="text-xl font-black text-text-main tracking-tighter leading-none mt-1">{op.containerNumber}</h4>
                  </div>
                ) : (
                  <h4 className="text-lg font-black text-text-main uppercase leading-tight mb-2">{op.client}</h4>
                )}
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="text-[11px] font-bold uppercase flex items-center gap-2"><Calendar size={12} /> {op.startDate}</span>
                  <span className="text-slate-800">|</span>
                  <span className="text-[11px] font-bold uppercase truncate max-w-[200px]">{op.origin} → {op.destination}</span>
                </div>
                {op.containerNumber && <p className="text-xs font-bold text-slate-500 uppercase mt-2">Cliente: {op.client}</p>}
                {op.containerReturnDate && <p className="text-[10px] font-black text-emerald-400 uppercase mt-2 italic tracking-wider flex items-center gap-2"><CheckCircle2 size={12} /> Finalizado em: {op.containerReturnDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 px-10 lg:border-x border-white/5 w-full lg:w-auto relative z-10">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Recursos Ativos</p>
                <p className="text-xs font-black text-slate-300 uppercase leading-none mb-1.5">
                  {drivers.find(d => d.id === op.driverId)?.name || 'N/A'}
                </p>
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-tighter">{vehicles.find(v => v.id === op.truckId)?.plate || 'N/A'}</p>
              </div>
              <div className="text-right lg:text-left">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Estado Arquivo</p>
                <span className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest inline-block border
                    ${op.status === ServiceStatus.DELIVERED ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                  `}>
                  {op.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto justify-end relative z-10">
              <button
                onClick={() => handlePrintOperation(op)}
                className="p-4 bg-white/5 text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all border border-white/5"
                title="Imprimir Guia"
              >
                <Printer size={22} />
              </button>

              <button
                onClick={() => handleOpenForm(op)}
                className="p-4 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-text-main rounded-lg transition-all border border-white/5"
                title="Editar Registro"
              >
                <Edit3 size={22} />
              </button>

              {op.status !== ServiceStatus.DELIVERED ? (
                <button
                  onClick={() => updateStatus(op, ServiceStatus.DELIVERED)}
                  className="bg-emerald-600 text-white px-8 py-4 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center gap-3 border border-emerald-400/20"
                >
                  <CheckCircle2 size={18} /> Entregue
                </button>
              ) : (
                <button
                  onClick={() => updateStatus(op, ServiceStatus.IN_TRANSIT)}
                  className="bg-white/5 border border-white/10 text-slate-500 px-8 py-4 rounded-lg font-black uppercase text-[10px] tracking-widest hover:border-amber-500/30 hover:text-amber-400 transition-all flex items-center gap-3"
                >
                  <RefreshCw size={18} /> Reabrir
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="glass-panel rounded-lg p-12 w-full max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative border border-white/10">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-xl shadow-blue-500/10"><Container size={28} /></div>
                <div>
                  <h2 className="text-xl font-black text-text-main tracking-tight uppercase leading-none">{editingOpId ? 'Editar Registro' : 'Novo Carregamento'}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Arquivo Logístico CAEL</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-text-main p-3 rounded-lg transition-all"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente / Requisitante</label>
                  <input required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formOp.client} onChange={e => setFormOp({ ...formOp, client: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria de Carga</label>
                  <select className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" value={formOp.cargoType} onChange={e => setFormOp({ ...formOp, cargoType: e.target.value as CargoType })}>
                    {Object.values(CargoType).map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Detalhamento Condicional */}
              {(formOp.cargoType === CargoType.BIG_BAG || formOp.cargoType === CargoType.OTHER) && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[11px] font-black text-amber-400 uppercase tracking-widest ml-1">Especificação Técnica *</label>
                  <input
                    required
                    className="w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                    value={formOp.cargoOtherSpecification}
                    onChange={e => setFormOp({ ...formOp, cargoOtherSpecification: e.target.value })}
                  />
                </div>
              )}

              {formOp.cargoType === CargoType.CONTAINER && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[11px] font-black text-blue-400 uppercase tracking-widest ml-1">Nº Identificação Contentor</label>
                  <input required className="w-full p-5 bg-blue-500/5 border border-blue-500/20 rounded-lg font-black uppercase text-xl text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-700" placeholder="MSCU0000000" value={formOp.containerNumber} onChange={e => setFormOp({ ...formOp, containerNumber: e.target.value.toUpperCase() })} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Motorista Responsável</label>
                  <select required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none" value={formOp.driverId} onChange={e => setFormOp({ ...formOp, driverId: e.target.value })}>
                    <option value="" className="bg-slate-900">Selecionar Motorista...</option>
                    {drivers.map(d => <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Viatura / Matrícula</label>
                  <select required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none" value={formOp.truckId} onChange={e => setFormOp({ ...formOp, truckId: e.target.value })}>
                    <option value="" className="bg-slate-900">Selecionar Ativo...</option>
                    {vehicles.filter(v => v.type !== AssetType.TRAILER).map(v => <option key={v.id} value={v.id} className="bg-slate-900">{v.plate} - {v.brand}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Origem</label>
                  <input required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50" value={formOp.origin} onChange={e => setFormOp({ ...formOp, origin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Destino Final</label>
                  <input required className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50" value={formOp.destination} onChange={e => setFormOp({ ...formOp, destination: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Início</label>
                  <input required type="date" className="w-full p-4 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:ring-2 focus:ring-blue-500/50" value={formOp.startDate} onChange={e => setFormOp({ ...formOp, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest ml-1">Data Conclusão (Opcional)</label>
                  <input type="date" className="w-full p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg font-bold text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50" value={formOp.containerReturnDate || ''} onChange={e => setFormOp({ ...formOp, containerReturnDate: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] hover:text-text-main rounded-lg transition-all">Cancelar</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all border border-blue-400/20">
                  {editingOpId ? 'Guardar Alterações' : 'Confirmar Registro no Arquivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operations;

