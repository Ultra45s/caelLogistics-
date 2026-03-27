
import React, { useState, useRef, useMemo } from 'react';
import { Employee, Gender, Delivery, EPI, DeliveryStatus, AdminProfile, AuthData } from '../types';
import { hashCredential } from '../lib/db';
import {
  Search, UserPlus, Trash2, Camera, ImageIcon, X,
  Edit3, Printer, ShieldAlert, FilterX,
  Boxes, Package, UserCircle, Lock, Loader2, FileText, CheckCircle, Clock,
  ArrowRight, Mail, Briefcase, MapPin, Calendar, Smartphone, ChevronRight,
  UserCheck, AlertCircle, Info, Download, Trash
} from 'lucide-react';

interface EmployeesProps {
  employees: Employee[];
  deliveries: Delivery[];
  epis: EPI[];
  admin?: AdminProfile;
  auth?: AuthData;
  onAdd: (emp: Employee) => void;
  onUpdate: (emp: Employee) => void;
  onDelete: (id: string) => void;
  filterMode?: 'all' | 'critical';
  setFilterMode?: (mode: 'all' | 'critical') => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, deliveries, epis, admin, auth, onAdd, onUpdate, onDelete, filterMode = 'all', setFilterMode }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItemsFor, setViewingItemsFor] = useState<Employee | null>(null);
  const [viewingSheetFor, setViewingSheetFor] = useState<Employee | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemToDelete, setItemToDelete] = useState<Employee | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '', biNumber: '', role: '', area: '', gender: 'Masculino', admissionDate: new Date().toISOString().split('T')[0], photoUrl: ''
  });

  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getEpiInfo = (delivery: Delivery) => {
    try {
      const epi = epis.find(e => e.id === delivery.epiId);
      if (!epi) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const delDateStr = delivery.deliveryDate || new Date().toISOString().split('T')[0];
      const delDate = new Date(delDateStr);
      if (isNaN(delDate.getTime())) return null;
      delDate.setHours(0, 0, 0, 0);

      let lifespanDays = epi.lifespanValue || 0;
      if (epi.lifespanUnit === 'weeks') lifespanDays *= 7;
      if (epi.lifespanUnit === 'months') lifespanDays *= 30;

      const expirationDate = new Date(delDate.getTime() + lifespanDays * 24 * 60 * 60 * 1000);
      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        epiName: epi.name,
        category: epi.category,
        expirationDate,
        diffDays,
        isExpired: diffDays < 0,
        isWarning: diffDays >= 0 && diffDays <= 7
      };
    } catch (e) {
      console.error("Erro ao processar validade do EPI", e);
      return null;
    }
  };

  const getEmployeeAssets = (employeeId: string) => {
    const latestMap = new Map<string, Delivery>();
    const sortedDeliveries = [...deliveries]
      .filter(d => d.employeeId === employeeId)
      .sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());

    sortedDeliveries.forEach(d => {
      if (!latestMap.has(d.epiId)) {
        latestMap.set(d.epiId, d);
      }
    });

    return Array.from(latestMap.values())
      .map(d => ({ ...d, info: getEpiInfo(d) }))
      .filter(d => d.info !== null);
  };

  const criticalEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    deliveries.forEach(d => {
      const info = getEpiInfo(d);
      if (info?.isExpired) ids.add(d.employeeId);
    });
    return ids;
  }, [deliveries, epis]);

  const handleEdit = (emp: Employee) => {
    setNewEmp(emp);
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewEmp(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmp.name && newEmp.biNumber) {
      if (editingId) onUpdate(newEmp as Employee);
      else onAdd({ ...newEmp as Employee, id: crypto.randomUUID(), photoUrl: newEmp.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newEmp.name}` });
      resetForm();
    }
  };

  const handleSecureDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;

    try {
      setIsVerifying(true);
      const isValid = await (window as any).electron.ipcRenderer.invoke('verify-password', confirmPassword, auth?.masterKeyHash);
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
    setNewEmp({ name: '', biNumber: '', role: '', area: '', gender: 'Masculino', admissionDate: new Date().toISOString().split('T')[0], photoUrl: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handlePrint = (employee: Employee) => {
    const empDeliveries = deliveries.filter(d => d.employeeId === employee.id);
    const printContent = `
      <html>
        <head>
          <title>Ficha Técnica - ${employee.name}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            .a4-page { width: 210mm; height: 297mm; padding: 15mm; box-sizing: border-box; background: white; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 24px; margin: 0; font-weight: 900; text-transform: uppercase; }
            .header p { font-size: 10px; font-weight: bold; margin: 5px 0; color: #555; }
            .company-name { font-size: 14px; font-weight: 900; margin-top: 10px; }
            .data-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .data-box { border: 1.5px solid #000; padding: 10px; background: #fcfcfc; }
            .data-box b { display: block; font-size: 8px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
            .data-box span { font-size: 12px; font-weight: 800; }
            .decl { font-size: 11px; line-height: 1.6; text-align: justify; margin-bottom: 30px; border-left: 4px solid #000; padding-left: 15px; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { border: 1px solid #000; padding: 10px; text-align: left; font-size: 10px; }
            th { background: #f0f0f0; font-weight: 900; text-transform: uppercase; }
            .footer { margin-top: 60px; display: grid; grid-template-cols: 1fr 1fr; gap: 60px; }
            .signature { border-top: 1.5px solid #000; text-align: center; padding-top: 10px; }
            .signature b { font-size: 10px; display: block; text-transform: uppercase; }
            .signature span { font-size: 8px; color: #777; }
          </style>
        </head>
        <body>
          <div class="a4-page">
            <div class="header" style="position: relative;">
              ${admin?.logoUrl ? `<img src="${admin.logoUrl}" style="position: absolute; top: 0; left: 0; height: 35px; object-fit: contain;" />` : ''}
              <h1>Ficha Técnica de Entrega de EPI</h1>
              <p>Segurança e Saúde no Trabalho • Lei n.º 12/23 (Angola)</p>
              <div class="company-name" style="margin-top: 10px;">${admin?.companyName || 'Empresa Empregadora'}</div>
              <p>NIF: ${admin?.taxId || 'N/A'}</p>
            </div>
            <div class="data-grid">
              <div class="data-box"><b>Colaborador</b><span>${employee.name}</span></div>
              <div class="data-box"><b>NIF / BI</b><span>${employee.biNumber}</span></div>
              <div class="data-box"><b>Cargo / Função</b><span>${employee.role}</span></div>
              <div class="data-box"><b>Setor / Área</b><span>${employee.area}</span></div>
            </div>
            <div class="decl">
              Declaro que recebi os Equipamentos de Proteção Individual (EPIs) relacionados abaixo, os quais encontram-se em perfeitas condições de uso. Comprometo-me a utilizá-los conforme orientação, zelando por sua guarda e conservação, ciente das responsabilidades inerentes ao seu uso nos termos da legislação vigente.
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">Data</th>
                  <th>Equipamento (Especificação Técnica)</th>
                  <th style="width: 50px;">Qtd</th>
                  <th style="width: 150px;">Assinatura do Recebimento</th>
                </tr>
              </thead>
              <tbody>
                ${empDeliveries.map(d => {
      const epi = epis.find(e => e.id === d.epiId);
      return `<tr><td style="font-weight: bold;">${new Date(d.deliveryDate).toLocaleDateString()}</td><td style="font-weight: 800;">${epi?.name || 'Item'}</td><td style="text-align: center; font-weight: bold;">${d.quantity}</td><td></td></tr>`;
    }).join('')}
                ${Array(Math.max(0, 10 - empDeliveries.length)).fill(0).map(() => `<tr><td height="30"></td><td></td><td></td><td></td></tr>`).join('')}
              </tbody>
            </table>
            <div class="footer">
              <div class="signature"><b>${employee.name}</b><span>Assinatura do Colaborador</span></div>
              <div class="signature"><b>${admin?.name || 'Responsável Técnico'}</b><span>Pela Empresa Empregadora</span></div>
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
    } else {
      alert("Por favor, ative os pop-ups para gerar a ficha.");
    }
  };

  const filtered = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.biNumber.includes(search) || e.area.toLowerCase().includes(search.toLowerCase());
    return filterMode === 'critical' ? matchesSearch && criticalEmployeeIds.has(e.id) : matchesSearch;
  });

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700">
      {/* Header & Stats Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Gestão de <span className="text-slate-500">Capital Humano</span></h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Monitorização de Quadro e Conformidade de EPI</p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-3xl text-center shadow-xl">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Equipa Total</p>
                <p className="text-xl font-black text-white">{employees.length}</p>
            </div>
            <div className={`px-6 py-4 rounded-2xl backdrop-blur-3xl text-center border shadow-xl ${criticalEmployeeIds.size > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <p className={`text-[8px] font-black uppercase mb-1 tracking-widest ${criticalEmployeeIds.size > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Críticos (EPI)</p>
                <p className={`text-xl font-black ${criticalEmployeeIds.size > 0 ? 'text-rose-200' : 'text-emerald-200'}`}>{criticalEmployeeIds.size}</p>
            </div>
        </div>
      </div>

      {/* Warning Filter Bar */}
      {filterMode === 'critical' && (
        <div className="bg-rose-600/10 border border-rose-500/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-rose-600 text-white rounded-2xl shadow-xl flex items-center justify-center animate-pulse"><ShieldAlert size={32} strokeWidth={1.5} /></div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Protocolo de Emergência SST</h3>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1">Filtrando colaboradores com itens de protecção fora da validade</p>
            </div>
          </div>
          <button onClick={() => setFilterMode?.('all')} className="bg-white/5 text-rose-400 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-400/20 hover:bg-rose-600 hover:text-white transition-all">Desativar Filtro</button>
        </div>
      )}

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/[0.02] p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Mapear colaborador por nome, BI ou sector..."
            className="w-full pl-16 pr-6 py-5 bg-white/[0.03] border border-white/10 rounded-[1.5rem] outline-none text-white font-bold placeholder:text-slate-800 focus:bg-white/[0.08] focus:border-blue-500/30 transition-all font-inter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-600/20 hover:scale-105 transition-all flex items-center gap-3 border border-white/10"
        >
          <UserPlus size={20} /> Incrementar Quadro
        </button>
      </div>

      {/* Form Modal Overhaul */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-slate-900/90 backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-2xl shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-2xl">
                    <UserPlus size={32} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{editingId ? 'Editar Perfil' : 'Integrar Colaborador'}</h2>
                  <p className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.4em] mt-1 italic">Protocolo de Identificação Humana</p>
                </div>
              </div>
              <button onClick={resetForm} className="text-slate-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={32} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex flex-col items-center gap-6 mb-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 bg-white/[0.03] rounded-[2.5rem] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50 shadow-inner">
                        {newEmp.photoUrl ? <img src={newEmp.photoUrl} className="w-full h-full object-cover" /> : <Camera size={40} className="text-slate-800" />}
                        <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Trocar Foto</span>
                        </div>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Identificação Nominal</label>
                    <input required type="text" placeholder="Nome Completo" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-900" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nº BI / Documento</label>
                    <input required type="text" placeholder="Número ID" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-900" value={newEmp.biNumber} onChange={e => setNewEmp({ ...newEmp, biNumber: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Cargo Principal</label>
                    <input required type="text" placeholder="Ex: Motorista Pesados" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-900" value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Setor de Atuação</label>
                    <input required type="text" placeholder="Ex: Operações Frota" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-900" value={newEmp.area} onChange={e => setNewEmp({ ...newEmp, area: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Gênero</label>
                    <select className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all appearance-none cursor-pointer" value={newEmp.gender} onChange={e => setNewEmp({ ...newEmp, gender: e.target.value as Gender })}>
                        <option value="Masculino" className="bg-slate-900">Masculino</option>
                        <option value="Feminino" className="bg-slate-900">Feminino</option>
                        <option value="Outro" className="bg-slate-900">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Admissão</label>
                    <input type="date" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all" value={newEmp.admissionDate} onChange={e => setNewEmp({ ...newEmp, admissionDate: e.target.value })} />
                  </div>
              </div>

              <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] uppercase tracking-[0.3em] text-[10px] active:scale-95 transition-all mt-6 border border-white/10">
                  {editingId ? 'Actualizar Registo' : 'Confirmar Admissão'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* A4 Preview Modal Premium Overhaul */}
      {viewingSheetFor && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[300] flex flex-col p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-12 max-w-[210mm] mx-auto w-full text-white">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 flex items-center justify-center shadow-2xl"><FileText size={32} strokeWidth={1.5} /></div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Technical Sheet Preview</h2>
                <div className="flex gap-4 mt-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 border border-white/10 rounded">Norma ISO/SST</span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-2 py-0.5 border border-blue-500/20 rounded">Lei v12.23-AO</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <button onClick={() => setViewingSheetFor(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-slate-500 hover:text-white group">
                <X size={28} />
              </button>
              <button
                onClick={() => { handlePrint(viewingSheetFor); setViewingSheetFor(null); }}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-4 shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95 transition-all border border-white/10"
              >
                <Printer size={20} /> Autorizar Impressão
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scroll-container pb-32">
            <div className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-16 shadow-2xl relative">
              <div className="absolute top-10 right-10 text-[7px] font-black text-slate-300 uppercase tracking-[0.5em] select-none">Cael Logistics Systems - Document Output</div>
              
              <div className="border-b-[3px] border-black pb-8 mb-12 flex items-start justify-between">
                <div>
                    <h1 className="text-[26px] font-black uppercase m-0 leading-none tracking-tighter">Ficha de Entrega de EPI</h1>
                    <p className="text-[10px] font-bold text-slate-600 mt-4 tracking-widest">Controle de Higiene e Segurança no Trabalho</p>
                    <div className="text-[18px] font-black mt-10 uppercase tracking-tight leading-none">{admin?.companyName || 'CAEL LOGISTICS SOLUTIONS'}</div>
                    <p className="text-[10px] font-bold mt-2">Registo NIF: {admin?.taxId || '--- --- ---'}</p>
                </div>
                <div className="w-24 h-24 border border-black p-1">
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[7px] font-black uppercase opacity-20 text-center">QR Code Autenticação</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-12">
                {[
                    { label: 'Colaborador', val: viewingSheetFor.name },
                    { label: 'Número BI', val: viewingSheetFor.biNumber },
                    { label: 'Cargo / Função', val: viewingSheetFor.role },
                    { label: 'Sector Operacional', val: viewingSheetFor.area }
                ].map((d, i) => (
                    <div key={i} className="border border-black p-4 bg-slate-50/50">
                        <b className="block text-[7px] uppercase text-slate-500 mb-2 tracking-[0.2em]">{d.label}</b>
                        <span className="text-[12px] font-black uppercase tracking-tight">{d.val}</span>
                    </div>
                ))}
              </div>

              <div className="text-[10px] leading-relaxed text-justify mb-12 border-l-[5px] border-black pl-8 italic bg-slate-50 p-6 font-medium">
                Declaro para os devidos efeitos legais que recebi os Equipamentos de Proteção Individual (EPIs) abaixo discriminados, em perfeitas condições de uso e funcionamento. Comprometo-me a utilizá-los de forma correcta e permanente durante a execução das minhas tarefas laborais, zelando pela sua guarda e conservação nos termos da lei 12/23 da República de Angola.
              </div>

              <table className="w-full border-collapse mb-16">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-4 text-[9px] font-black uppercase text-left tracking-widest w-32">Data Registo</th>
                    <th className="border border-black p-4 text-[9px] font-black uppercase text-left tracking-widest">Material Entregue</th>
                    <th className="border border-black p-4 text-[9px] font-black uppercase text-center w-16 tracking-widest">Qtd</th>
                    <th className="border border-black p-4 text-[9px] font-black uppercase text-left w-64 tracking-widest">Assinatura Receptor</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.filter(d => d.employeeId === viewingSheetFor.id).map((d, i) => {
                    const epi = epis.find(e => e.id === d.epiId);
                    return (
                      <tr key={i} className="h-12">
                        <td className="border border-black p-4 text-[10px] font-black">{new Date(d.deliveryDate).toLocaleDateString()}</td>
                        <td className="border border-black p-4 text-[10px] font-black uppercase tracking-tight">{epi?.name || 'Recipiente Genérico'}</td>
                        <td className="border border-black p-4 text-[10px] font-black text-center">{d.quantity}</td>
                        <td className="border border-black p-4"></td>
                      </tr>
                    );
                  })}
                  {Array(Math.max(0, 10 - deliveries.filter(d => d.employeeId === viewingSheetFor.id).length)).fill(0).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-12"><td className="border border-black p-4" colSpan={4}></td></tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-24 mt-32">
                <div className="border-t border-black pt-4 text-center">
                  <b className="block text-[11px] font-black uppercase tracking-tight">{viewingSheetFor.name}</b>
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-2">{viewingSheetFor.biNumber}</span>
                </div>
                <div className="border-t border-black pt-4 text-center">
                  <b className="block text-[11px] font-black uppercase tracking-tight">{admin?.name || 'Responsável Segurança'}</b>
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-2">Assinatura Certificada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingItemsFor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[250] flex items-center justify-center p-6">
          <div className="bg-slate-900/90 backdrop-blur-[40px] rounded-[3rem] p-12 w-full max-w-3xl shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-[2.5rem] bg-blue-600/10 border-2 border-white/10 shadow-2xl overflow-hidden p-1">
                  {viewingItemsFor.photoUrl ? <img src={viewingItemsFor.photoUrl} className="w-full h-full object-cover rounded-[2.2rem]" /> : <UserCircle size={64} className="text-slate-800" />}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-none">{viewingItemsFor.name}</h3>
                  <div className="flex gap-3 mt-4">
                     <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest px-3 py-1 bg-blue-600/10 rounded-lg border border-blue-500/20">{viewingItemsFor.role}</span>
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/10">{viewingItemsFor.area}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingItemsFor(null)} className="text-slate-600 hover:text-white transition-colors p-4 hover:bg-white/5 rounded-2xl"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-container pr-6 space-y-6">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
                  <Package size={16} /> Inventário de Retenção Activa
              </h4>
              
              {getEmployeeAssets(viewingItemsFor.id).length > 0 ? getEmployeeAssets(viewingItemsFor.id).map((asset, idx) => {
                let status = 'healthy';
                let cdString = '';
                if (asset.info) {
                  const ms = asset.info.expirationDate.getTime() - now;
                  if (ms <= 0) status = 'expired';
                  else {
                    const diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) status = 'warning';
                    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((ms % (1000 * 60)) / 1000);
                    cdString = diffDays > 0 ? `${diffDays}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;
                  }
                }

                return (
                  <div key={idx} className={`p-8 rounded-[2rem] border transition-all flex flex-col md:flex-row items-center justify-between gap-6 group animate-in slide-in-from-bottom-4`} style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center gap-8">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-all duration-500 ${status === 'expired' ? 'bg-rose-600/20 border-rose-500/30 text-rose-400' : status === 'warning' ? 'bg-amber-600/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500 group-hover:bg-blue-600/20 group-hover:text-blue-400 group-hover:border-blue-500/30'}`}>
                        <Package size={32} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white uppercase tracking-tight mb-2 leading-none">{asset.info?.epiName}</p>
                        <div className="flex items-center gap-4">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{asset.info?.category}</p>
                            <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Vencimento: {asset.info?.expirationDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                        {status === 'expired' ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-rose-600 text-white rounded-xl border border-rose-400/30 animate-pulse shadow-xl shadow-rose-600/20">
                                <ShieldAlert size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Expirado</span>
                            </div>
                        ) : (
                            <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 shadow-xl ${status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-white/5 text-emerald-400 border-white/10'}`}>
                                <Clock size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">{cdString}</span>
                            </div>
                        )}
                    </div>
                  </div>
                );
              }) : (
                <div className="py-32 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-900"><Package size={40} /></div>
                  <p className="text-slate-800 font-black uppercase text-[11px] tracking-[0.3em] opacity-30">Nenhum equipamento vinculado</p>
                </div>
              )}
            </div>

            <div className="mt-12 pt-10 border-t border-white/5 flex gap-6">
              <button
                onClick={() => { setViewingSheetFor(viewingItemsFor); setViewingItemsFor(null); }}
                className="flex-1 bg-white/5 text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 hover:bg-white/10 transition-all border border-white/10 group"
              >
                <Printer size={20} className="group-hover:scale-110 transition-transform" /> Gerar Mapa de Retenção
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[400] flex items-center justify-center p-6">
          <div className={`bg-slate-900/90 rounded-[3rem] p-12 w-full max-w-md shadow-2xl border border-rose-500/20 animate-in zoom-in-95 duration-500 ${deleteError ? 'animate-shake' : ''}`}>
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-rose-600/10 text-rose-500 rounded-[2rem] flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-600/10">
                <Trash size={48} strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">Desligamento de Cadastro</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-6">
                  Confirme a **Chave Mestra** para remover <strong className="text-white">{itemToDelete.name}</strong>. Esta acção purge os dados permanentemente.
                </p>
              </div>
              
              <form onSubmit={handleSecureDelete} className="w-full space-y-8">
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-rose-500 transition-colors" size={20} />
                  <input required autoFocus type="password" placeholder="Chave de Segurança" className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:border-rose-500/30 transition-all placeholder:text-slate-900" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setItemToDelete(null); setConfirmPassword(''); }} className="flex-1 py-5 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abortar</button>
                  <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-rose-600/30 flex items-center justify-center gap-4 border border-rose-400/20 active:scale-95 transition-all">
                    {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} Validar Expulsão
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

export default Employees;

