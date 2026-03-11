
import React, { useState, useMemo } from 'react';
import { AppState, DeliveryStatus, EPI, Delivery } from '../types';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { exportToCSV } from '../db';
import {
  FileDown, Printer, TrendingUp, History, Activity, BookOpen, AlertTriangle, ShieldAlert, User, Package, Calendar
} from 'lucide-react';

interface StatsProps {
  data: AppState;
}

type Period = 'month' | '6months' | 'year' | 'all';

const Stats: React.FC<StatsProps> = ({ data }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('year');

  const getEpiInfo = (delivery: Delivery) => {
    try {
      const epi = data.epis.find(e => e.id === delivery.epiId);
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

      return { epiName: epi.name, expirationDate, diffDays, isExpired: diffDays < 0, isWarning: diffDays >= 0 && diffDays <= 7 };
    } catch (e) {
      return null;
    }
  };

  const activeDeliveries = useMemo(() => {
    const latestMap = new Map<string, Delivery>();
    const sorted = [...data.deliveries].sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
    sorted.forEach(d => {
      const key = `${d.employeeId}-${d.epiId}`;
      if (!latestMap.has(key)) latestMap.set(key, d);
    });
    return Array.from(latestMap.values());
  }, [data.deliveries]);

  const nearingExpirationReport = useMemo(() => {
    return activeDeliveries
      .map(d => {
        const info = getEpiInfo(d);
        const emp = data.employees.find(e => e.id === d.employeeId);
        return { ...d, info, employee: emp };
      })
      .filter(item => item.info && (item.info.isExpired || item.info.isWarning))
      .sort((a, b) => (a.info?.diffDays || 0) - (b.info?.diffDays || 0));
  }, [activeDeliveries, data.employees, data.epis]);

  const getEpiStatus = (delivery: Delivery) => {
    const info = getEpiInfo(delivery);
    if (!info) return delivery.status;
    return info.isExpired ? DeliveryStatus.EXPIRED : delivery.status;
  };

  const filterByPeriod = (d: Delivery) => {
    const date = new Date(d.deliveryDate);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    if (period === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    if (period === '6months') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return date >= sixMonthsAgo;
    }
    return period === 'year' ? date.getFullYear() === now.getFullYear() : true;
  };

  const filteredDeliveries = useMemo(() => {
    let base = data.deliveries.filter(filterByPeriod);
    if (selectedEmployeeId !== 'all') base = base.filter(d => d.employeeId === selectedEmployeeId);
    return base;
  }, [data.deliveries, selectedEmployeeId, period]);

  const consumptionSummary = useMemo(() => {
    const summary: Record<string, { name: string, total: number, expired: number }> = {};
    filteredDeliveries.forEach(d => {
      const epi = data.epis.find(e => e.id === d.epiId);
      if (!epi) return;
      if (!summary[d.epiId]) summary[d.epiId] = { name: epi.name, total: 0, expired: 0 };
      summary[d.epiId].total += d.quantity;
      if (getEpiStatus(d) === DeliveryStatus.EXPIRED) summary[d.epiId].expired++;
    });
    return Object.values(summary);
  }, [filteredDeliveries, data.epis]);

  const handleExportCSV = () => {
    const exportData = filteredDeliveries.map(d => {
      const emp = data.employees.find(e => e.id === d.employeeId);
      const epi = data.epis.find(e => e.id === d.epiId);
      return { 'DATA': d.deliveryDate, 'BI_COLABORADOR': emp?.biNumber || 'N/A', 'COLABORADOR': emp?.name || 'N/A', 'SETOR': emp?.area || 'N/A', 'EQUIPAMENTO': epi?.name || 'N/A', 'QUANTIDADE': d.quantity, 'STATUS': getEpiStatus(d) };
    });
    exportToCSV(exportData, `RELATORIO_EPI_${new Date().getTime()}`);
  };

  const printFullReport = () => {
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    doc.write(`
      <html>
        <head>
          <title>Relatório de Gestão EPI</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: sans-serif; font-size: 10px; color: #333; }
            h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 5px; }
            h2 { font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase; }
            .header-info { text-align: center; font-weight: bold; margin-bottom: 30px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; text-transform: uppercase; font-size: 8px; }
            .badge { padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 8px; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-amber { background: #fef3c7; color: #92400e; }
          </style>
        </head>
        <body>
          ${data.admin?.logoUrl ? `<img src="${data.admin.logoUrl}" style="position: absolute; top: 15mm; left: 15mm; height: 35px; object-fit: contain;" />` : ''}
          <h1>Relatório Geral de Gestão de EPI</h1>
          <div class="header-info">${data.admin?.companyName || 'EMPRESA'} - Emitido em: ${new Date().toLocaleString()}</div>
          
          <h2>Alertas de Vencimento Imediato</h2>
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Equipamento</th>
                <th>Vencimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${nearingExpirationReport.map(item => `
                <tr>
                  <td>${item.employee?.name} (${item.employee?.area})</td>
                  <td>${item.info?.epiName}</td>
                  <td>${item.info?.expirationDate.toLocaleDateString()}</td>
                  <td><span class="badge ${item.info?.isExpired ? 'badge-red' : 'badge-amber'}">${item.info?.isExpired ? 'VENCIDO' : 'TROCAR EM ' + item.info?.diffDays + ' DIAS'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Consumo por Tipo de Equipamento</h2>
          <table>
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Saídas Totais</th>
                <th>Alertas/Expirados</th>
              </tr>
            </thead>
            <tbody>
              ${consumptionSummary.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.total}</td>
                  <td>${item.expired}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);

    doc.close();
    printWindow.onload = () => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printWindow)) document.body.removeChild(printWindow);
      }, 1000);
    };
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-700 scroll-container">
      <div className="glass-panel p-8 rounded-lg border border-white/10 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-8 no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10"><Activity size={28} /></div>
          <div>
            <h3 className="font-black text-text-main uppercase text-lg leading-none tracking-tight">Central de Relatórios</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">{data.admin?.companyName}</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 relative z-10">
          <select
            className="bg-white/5 border border-white/10 px-6 py-4 rounded-lg font-bold text-xs text-text-main outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none min-w-[240px]"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="all" className="bg-slate-950">TODOS COLABORADORES</option>
            {data.employees.map(emp => <option key={emp.id} value={emp.id} className="bg-slate-950">{emp.name}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={handleExportCSV} className="flex-1 bg-white/5 text-text-main border border-white/10 px-8 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white/10 shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"><FileDown size={20} className="text-blue-400" /> CSV</button>
            <button onClick={printFullReport} className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all active:scale-95 border border-blue-400/20"><Printer size={20} /> Imprimir</button>
          </div>
        </div>
      </div>

      <div className="glass-panel p-10 rounded-lg border border-white/10 report-card shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-rose-600/20 text-rose-400 rounded-lg border border-rose-500/30 shadow-2xl shadow-rose-600/10"><AlertTriangle size={28} /></div>
            <div>
              <h3 className="font-black text-text-main uppercase text-lg leading-none tracking-tight">Alerta de Vencimento Imediato</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Conformidade Lei 12/23 (Angola)</p>
            </div>
          </div>
          <div className="bg-rose-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 border border-rose-400/20">
            {nearingExpirationReport.length} Alertas Críticos
          </div>
        </div>
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] font-black uppercase text-slate-500 border-b border-white/10">
                <th className="px-8 py-5 tracking-widest">Colaborador</th>
                <th className="px-8 py-5 tracking-widest">Equipamento</th>
                <th className="px-8 py-5 text-center tracking-widest">Vencimento</th>
                <th className="px-8 py-5 text-right tracking-widest">Status Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {nearingExpirationReport.length > 0 ? nearingExpirationReport.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-all group/row">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white/10 group-hover/row:border-blue-500/30 transition-colors">
                        {item.employee?.name.charAt(0)}
                      </div>
                      <span className="text-sm font-black text-text-main uppercase tracking-tight">{item.employee?.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-400">{item.info?.epiName}</td>
                  <td className="px-8 py-6 text-center text-sm font-black text-text-main tracking-tighter">{item.info?.expirationDate.toLocaleDateString()}</td>
                  <td className="px-8 py-6 text-right">
                    <span className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-lg ${item.info?.isExpired ? 'bg-rose-600/20 text-rose-400 border-rose-500/30 shadow-rose-600/10' : 'bg-amber-600/20 text-amber-400 border-amber-500/30 shadow-amber-600/10'}`}>
                      {item.info?.isExpired ? 'EXPIRADO' : `TROCAR EM ${item.info?.diffDays} DIAS`}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <ShieldAlert size={48} className="text-slate-700 mb-4" />
                      <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.4em]">Tudo em conformidade técnica</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-panel p-10 rounded-lg border border-white/10 report-card shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full -ml-32 -mt-32"></div>
          <h3 className="font-black text-text-main uppercase text-sm mb-8 flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30"><BookOpen size={20} /></div>
            Consumo por Equipamento
          </h3>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase text-slate-500 border-b border-white/10">
                  <th className="px-6 py-5 tracking-widest">Equipamento</th>
                  <th className="px-6 py-5 text-center tracking-widest">Saídas</th>
                  <th className="px-6 py-5 text-center tracking-widest">Expirados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {consumptionSummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-6 font-black text-text-main text-sm uppercase tracking-tight">{item.name}</td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-lg font-black text-blue-400 tracking-tighter">{item.total}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${item.expired > 0 ? 'bg-rose-600/20 text-rose-400 border-rose-500/30' : 'bg-white/5 text-slate-600 border-white/10'}`}>
                        {item.expired}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-10 rounded-lg border border-white/10 chart-area no-print shadow-2xl min-h-[450px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
          <h3 className="font-black text-text-main uppercase text-sm mb-10 flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30"><TrendingUp size={20} /></div>
            Atividade Recente (Telemetria)
          </h3>
          <div className="flex-1 min-h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredDeliveries.slice(-12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="deliveryDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#475569' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#475569' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    padding: '16px'
                  }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 900, fontSize: '10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="quantity"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorQty)"
                  strokeWidth={4}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;

