
import React, { useState, useRef, useMemo } from 'react';
import { Employee, Gender, Delivery, EPI, DeliveryStatus, AdminProfile, AuthData } from '../types';
import { hashCredential } from '../db';
import {
  Search, UserPlus, Trash2, Camera, ImageIcon, X,
  Edit3, Printer, ShieldAlert, FilterX,
  Boxes, Package, UserCircle, Lock, Loader2, FileText, CheckCircle, Clock
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
    } catch (err) { console.error(err); } finally { setIsVerifying(false); }
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
    <div className="space-y-8 pb-24 scroll-container">
      {filterMode === 'critical' && (
        <div className="glass-panel border-2 border-rose-500/30 p-8 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-rose-500/10 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-rose-600 text-white rounded-lg shadow-xl shadow-rose-600/20 border border-rose-400/20 animate-pulse"><ShieldAlert size={32} /></div>
            <div>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-2">Alertas Críticos Ativos</p>
              <h3 className="text-lg font-black text-text-main uppercase tracking-tight leading-tight">Exibindo apenas colaboradores com EPIs vencidos.</h3>
            </div>
          </div>
          <button onClick={() => setFilterMode?.('all')} className="flex items-center gap-3 bg-white/5 text-rose-400 px-8 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest border border-rose-500/20 shadow-sm hover:bg-rose-500/10 transition-all active:scale-95">
            <FilterX size={18} /> Limpar Filtro
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative flex-1 max-md:w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/5 rounded-lg focus:bg-white/10 focus:border-blue-500/50 shadow-sm outline-none text-text-main placeholder:text-slate-800 font-bold transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-lg hover:bg-blue-500 transition-all font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-600/20 active:scale-95 border border-blue-400/20"
        >
          <UserPlus size={20} /> Novo Colaborador
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-lg p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10 my-auto">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><UserPlus size={28} /></div>
                <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">{editingId ? 'Editar' : 'Novo'} Colaborador</h2>
              </div>
              <button onClick={resetForm} className="text-slate-600 hover:text-text-main transition-colors"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 bg-white/5 rounded-md overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center relative group cursor-pointer hover:border-blue-500/50 transition-all shadow-inner" onClick={() => fileInputRef.current?.click()}>
                  {newEmp.photoUrl ? <img src={newEmp.photoUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-900" size={40} />}
                  <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                    <Camera className="text-text-main" size={32} />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Foto de Perfil</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <input required type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-900" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">BI / ID</label>
                  <input required type="text" className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-900" value={newEmp.biNumber} onChange={e => setNewEmp({ ...newEmp, biNumber: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gênero</label>
                  <select className="w-full p-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none" value={newEmp.gender} onChange={e => setNewEmp({ ...newEmp, gender: e.target.value as Gender })}>
                    <option value="Masculino" className="bg-slate-950">Masculino</option>
                    <option value="Feminino" className="bg-slate-950">Feminino</option>
                    <option value="Outro" className="bg-slate-950">Outro</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-lg shadow-2xl shadow-blue-600/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all mt-6 border border-blue-400/20">{editingId ? 'Salvar Alterações' : 'Concluir Cadastro'}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO A4 DA FICHA TÉCNICA */}
      {viewingSheetFor && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[200] flex flex-col p-6 md:p-12 overflow-hidden">
          <div className="flex items-center justify-between mb-10 max-w-[210mm] mx-auto w-full text-text-main">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><FileText size={40} /></div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Pré-visualização da Ficha</h2>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">Padrão A4 • Lei 12/23 Angola</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingSheetFor(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5">
                <X size={28} />
              </button>
              <button
                onClick={() => { handlePrint(viewingSheetFor); setViewingSheetFor(null); }}
                className="bg-blue-600 text-white px-10 py-4 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-3 shadow-2xl shadow-blue-600/20 active:scale-95 transition-all border border-blue-400/20"
              >
                <Printer size={24} /> Confirmar Impressão
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scroll-container pb-24">
            <div className="a4-preview-container shadow-2xl relative rounded-sm mx-auto">
              <div className="absolute top-10 right-10 text-[9px] font-black text-slate-300 uppercase select-none tracking-[0.3em]">Pré-visualização Digital</div>
              <div className="border-b-[4px] border-black pb-6 mb-10 text-center">
                <h1 className="text-[22px] font-black uppercase m-0 leading-none tracking-tighter">Ficha Técnica de Entrega de EPI</h1>
                <p className="text-[10px] font-bold text-slate-500 mt-3 tracking-widest">Segurança e Saúde no Trabalho • Lei n.º 12/23 (Angola)</p>
                <div className="text-[16px] font-black mt-6 uppercase tracking-tight">{admin?.companyName || 'GESTOR CORPORATIVO'}</div>
                <p className="text-[10px] font-bold mt-1">NIF: {admin?.taxId || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="border-2 border-black p-4 bg-slate-50">
                  <b className="block text-[9px] uppercase text-slate-500 mb-2 tracking-widest">Colaborador</b>
                  <span className="text-[14px] font-black uppercase tracking-tight">{viewingSheetFor.name}</span>
                </div>
                <div className="border-2 border-black p-4 bg-slate-50">
                  <b className="block text-[9px] uppercase text-slate-500 mb-2 tracking-widest">NIF / BI</b>
                  <span className="text-[14px] font-black uppercase tracking-tight">{viewingSheetFor.biNumber}</span>
                </div>
                <div className="border-2 border-black p-4 bg-slate-50">
                  <b className="block text-[9px] uppercase text-slate-500 mb-2 tracking-widest">Cargo / Função</b>
                  <span className="text-[14px] font-black uppercase tracking-tight">{viewingSheetFor.role}</span>
                </div>
                <div className="border-2 border-black p-4 bg-slate-50">
                  <b className="block text-[9px] uppercase text-slate-500 mb-2 tracking-widest">Setor / Área</b>
                  <span className="text-[14px] font-black uppercase tracking-tight">{viewingSheetFor.area}</span>
                </div>
              </div>

              <div className="text-[11px] leading-relaxed text-justify mb-10 border-l-[6px] border-black pl-6 italic bg-slate-50 py-5 font-medium">
                Declaro que recebi os Equipamentos de Proteção Individual (EPIs) relacionados abaixo, os quais encontram-se em perfeitas condições de uso. Comprometo-me a utilizá-los conforme orientação, zelando por sua guarda e conservação, ciente das responsabilidades inerentes ao seu uso nos termos da legislação vigente em Angola.
              </div>

              <table className="w-full border-collapse mb-12">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border-2 border-black p-4 text-[10px] font-black uppercase text-left tracking-widest">Data</th>
                    <th className="border-2 border-black p-4 text-[10px] font-black uppercase text-left tracking-widest">Equipamento</th>
                    <th className="border-2 border-black p-4 text-[10px] font-black uppercase text-center w-16 tracking-widest">Qtd</th>
                    <th className="border-2 border-black p-4 text-[10px] font-black uppercase text-left w-48 tracking-widest">Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.filter(d => d.employeeId === viewingSheetFor.id).map((d, i) => {
                    const epi = epis.find(e => e.id === d.epiId);
                    return (
                      <tr key={i} className="h-12">
                        <td className="border-2 border-black p-4 text-[11px] font-black">{new Date(d.deliveryDate).toLocaleDateString()}</td>
                        <td className="border-2 border-black p-4 text-[11px] font-black uppercase tracking-tight">{epi?.name || 'Item'}</td>
                        <td className="border-2 border-black p-4 text-[11px] font-black text-center">{d.quantity}</td>
                        <td className="border-2 border-black p-4"></td>
                      </tr>
                    );
                  })}
                  {Array(Math.max(0, 8 - deliveries.filter(d => d.employeeId === viewingSheetFor.id).length)).fill(0).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-12">
                      <td className="border-2 border-black p-4"></td>
                      <td className="border-2 border-black p-4"></td>
                      <td className="border-2 border-black p-4"></td>
                      <td className="border-2 border-black p-4"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-16 mt-24">
                <div className="border-t-2 border-black pt-4 text-center">
                  <b className="block text-[12px] font-black uppercase tracking-tight">{viewingSheetFor.name}</b>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Assinatura do Colaborador</span>
                </div>
                <div className="border-t-2 border-black pt-4 text-center">
                  <b className="block text-[12px] font-black uppercase tracking-tight">{admin?.name || 'Responsável'}</b>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Pela Empresa Empregadora</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingItemsFor && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-lg p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white/10 my-auto">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white/5 rounded-lg overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center">
                  {viewingItemsFor.photoUrl ? <img src={viewingItemsFor.photoUrl} className="w-full h-full object-cover" /> : <UserCircle className="text-slate-900" size={56} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-text-main uppercase tracking-tight leading-none">{viewingItemsFor.name}</h3>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-3">{viewingItemsFor.role}</p>
                </div>
              </div>
              <button onClick={() => setViewingItemsFor(null)} className="text-slate-600 hover:text-text-main transition-colors"><X size={32} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 scroll-container space-y-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-2 mb-6">Itens em Uso Ativo</h4>
              {getEmployeeAssets(viewingItemsFor.id).length > 0 ? getEmployeeAssets(viewingItemsFor.id).map((asset, idx) => {
                let countdownStatus = 'healthy';
                let cdString = '';
                
                if (asset.info) {
                  const ms = asset.info.expirationDate.getTime() - now;
                  if (ms <= 0) {
                    countdownStatus = 'expired';
                  } else {
                    const diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) countdownStatus = 'warning';
                    
                    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((ms % (1000 * 60)) / 1000);
                    cdString = diffDays > 0 ? `${diffDays}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`;
                  }
                }

                return (
                  <div key={idx} className={`p-8 rounded-lg border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${countdownStatus === 'expired' ? 'bg-rose-600/10 border-rose-500/30 shadow-lg shadow-rose-600/5' : countdownStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-lg bg-slate-950 text-text-main flex items-center justify-center border border-white/5 shadow-inner group-hover:bg-blue-600/20 transition-all"><Package size={28} /></div>
                      <div>
                        <p className="text-lg font-black text-text-main uppercase tracking-tight leading-none">{asset.info?.epiName}</p>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">{asset.info?.expirationDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    {countdownStatus === 'expired' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 text-rose-400 rounded-lg border border-rose-500/30 animate-pulse">
                        <ShieldAlert size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Expirado</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm ${countdownStatus === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        <Clock size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">{cdString}</span>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="py-24 text-center glass-panel rounded-lg border-2 border-dashed border-white/10">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-900 border border-white/5"><Package size={40} /></div>
                  <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em] opacity-40">Nenhum item em uso</p>
                </div>
              )}
            </div>
            <div className="mt-10 pt-8 border-t border-white/5 flex justify-center">
              <button
                onClick={() => { setViewingSheetFor(viewingItemsFor); setViewingItemsFor(null); }}
                className="bg-blue-600 text-white px-12 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-4 shadow-2xl shadow-blue-600/20 active:scale-95 transition-all border border-blue-400/20"
              >
                <Printer size={20} /> Visualizar Ficha Técnica
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">
        {filtered.map(emp => {
          const isCritical = criticalEmployeeIds.has(emp.id);
          return (
            <div key={emp.id} className={`glass-card p-8 rounded-xl border shadow-sm hover:scale-[1.02] transition-all duration-500 group flex flex-col h-full relative overflow-hidden ${isCritical ? 'border-rose-500/40 shadow-2xl shadow-rose-500/10' : 'border-white/5 hover:border-blue-500/30'}`}>
              {isCritical && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 blur-3xl rounded-full -mr-16 -mt-16"></div>}
              <div className="flex items-start gap-6 mb-8 relative z-10">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition-all">
                    {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <UserCircle className="text-slate-900" size={48} />}
                  </div>
                  {isCritical && <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1.5 rounded-full border-2 border-slate-950 shadow-xl animate-pulse"><ShieldAlert size={12} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-text-main leading-tight truncate text-lg uppercase tracking-tight">{emp.name}</h4>
                  <p className="text-[10px] font-black text-blue-400 uppercase mt-2.5 tracking-[0.2em]">{emp.role}</p>
                </div>
              </div>
              <div className="mt-auto space-y-6 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white/5 p-4 rounded-lg border border-white/5 group-hover:bg-white/10 transition-all">
                  <span>ID: {emp.biNumber}</span>
                  <span className="truncate ml-4">{emp.area}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setViewingItemsFor(emp)} className="flex flex-col items-center justify-center gap-2 p-4 text-slate-600 hover:text-blue-400 bg-white/5 hover:bg-blue-500/10 rounded-lg transition-all border border-white/5 hover:border-blue-500/20"><Boxes size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Itens</span></button>
                  <button onClick={() => setViewingSheetFor(emp)} className="flex flex-col items-center justify-center gap-2 p-4 text-slate-600 hover:text-indigo-400 bg-white/5 hover:bg-indigo-500/10 rounded-lg transition-all border border-white/5 hover:border-indigo-500/20"><FileText size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Ficha</span></button>
                  <button onClick={() => handleEdit(emp)} className="flex flex-col items-center justify-center gap-2 p-4 text-slate-600 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/10 rounded-lg transition-all border border-white/5 hover:border-emerald-500/20"><Edit3 size={20} /><span className="text-[8px] font-black uppercase tracking-widest">Edit.</span></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4 overflow-y-auto">
          <div className={`glass-panel rounded-lg p-12 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 transition-transform border border-white/10 my-auto ${deleteError ? 'animate-shake' : ''}`}>
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-24 h-24 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center border border-rose-500/20 shadow-2xl shadow-rose-500/10">
                <ShieldAlert size={48} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-text-main uppercase tracking-tight">Remover Colaborador?</h3>
                <p className="text-sm text-slate-600 font-bold leading-relaxed max-w-xs mx-auto">
                  Confirme a senha para remover <strong>{itemToDelete.name}</strong> definitivamente do sistema.
                </p>
              </div>
              <form onSubmit={handleSecureDelete} className="w-full space-y-8">
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Senha Mestra</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-800" size={20} />
                    <input required autoFocus type="password" placeholder="Confirmar" className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-lg font-bold text-text-main outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-900" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setItemToDelete(null); setConfirmPassword(''); }} className="flex-1 py-5 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-text-main transition-colors">Sair</button>
                  <button disabled={isVerifying} type="submit" className="flex-[2] bg-rose-600 text-white py-5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 flex items-center justify-center gap-3 border border-rose-400/20 active:scale-95 transition-all">{isVerifying ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} Confirmar</button>
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

