
import React, { useState } from 'react';
import { AppState } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, ShieldAlert, Zap, Brain, Loader2, Activity } from 'lucide-react';

const Auditor: React.FC<{ data: AppState }> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeLogistics = async () => {
    setLoading(true);
    setError(null);
    try {
      // FIX: Initialize GoogleGenAI within the function as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const fleetContext = data.vehicles.map(v => ({
        nome: v.name,
        tipo: v.type,
        ultimaManutencao: v.lastMaintenanceDate,
        intervalo: v.maintenanceIntervalDays
      }));

      const opsContext = data.operations.slice(-20).map(o => ({
        tipo: o.cargoType,
        cliente: o.client,
        status: o.status
      }));

      const prompt = `Analise estes dados de uma empresa de transportes em Angola:
      Frota: ${JSON.stringify(fleetContext)}
      Operações: ${JSON.stringify(opsContext)}
      
      Forneça um relatório de Auditoria Inteligente considerando:
      1. Risco de quebra mecânica iminente baseado nos intervalos de manutenção.
      2. Eficiência da frota (Camiões vs Atrelados).
      3. Sugestões de optimização para cargas Contentorizadas vs Big Bags.
      4. Conformidade com as normas de transporte pesado em Angola.`;

      // FIX: Use gemini-3-pro-preview for complex reasoning tasks
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fleetHealth: { type: Type.STRING },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING }
                  }
                }
              },
              optimizations: { type: Type.ARRAY, items: { type: Type.STRING } },
              maintenancePlan: { type: Type.STRING }
            },
            required: ["fleetHealth", "risks", "optimizations", "maintenancePlan"]
          }
        }
      });

      // FIX: Safely access response.text and trim it
      const resultText = response.text?.trim();
      if (resultText) {
        setAnalysis(JSON.parse(resultText));
      } else {
        throw new Error("Resposta vazia da IA.");
      }
    } catch (err) { 
      console.error(err);
      setError("Falha na análise inteligente."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 animate-in fade-in duration-700 scroll-container">
      <div className="glass-panel rounded-lg p-12 relative overflow-hidden text-text-main shadow-2xl border border-white/10 group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-32 -mt-32 group-hover:opacity-30 transition-opacity duration-700"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-10 -ml-24 -mb-24 group-hover:opacity-20 transition-opacity duration-700"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="p-4 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 shadow-2xl shadow-blue-500/10">
              <Brain size={40} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Logistics <span className="text-blue-400">IA Auditor</span></h2>
              <p className="text-blue-300 font-black uppercase text-[10px] tracking-[0.4em] mt-2">Preditividade Industrial • Angola Standard</p>
            </div>
          </div>
          
          <p className="max-w-3xl text-slate-400 text-lg font-medium leading-relaxed mb-10">
            Nossa Inteligência Artificial analisa padrões de manutenção, fluxos de transporte e conformidade normativa para otimizar o lucro operacional e mitigar riscos de paragens críticas.
          </p>
          
          <button 
            onClick={analyzeLogistics} 
            disabled={loading} 
            className="bg-blue-600 text-white px-10 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center gap-4 shadow-2xl shadow-blue-600/30 active:scale-95 border border-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-blue-300" />}
            {loading ? 'Processando Telemetria...' : 'Iniciar Auditoria de Frota'}
          </button>
          
          {error && (
            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-400 animate-in slide-in-from-top-2">
              <ShieldAlert size={18} />
              <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
          <div className="md:col-span-3 glass-panel p-10 rounded-lg border border-white/10 shadow-2xl flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-[0.3em]">Diagnóstico de Frota</p>
               <h3 className="text-4xl font-black text-text-main uppercase tracking-tight leading-none">{analysis.fleetHealth}</h3>
            </div>
            <div className="p-5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shadow-xl shadow-emerald-500/5 relative z-10">
              <Activity size={48} className="group-hover:scale-110 transition-transform" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">Riscos e Alertas Identificados</h4>
            {analysis.risks.map((risk: any, i: number) => (
              <div key={i} className="glass-card p-8 rounded-lg border border-white/10 shadow-2xl flex gap-8 border-l-8 border-l-rose-600 group hover:bg-white/5 transition-all">
                <div className="p-4 bg-rose-600/10 text-rose-400 rounded-lg h-fit border border-rose-500/20 shadow-lg shadow-rose-600/5 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h5 className="font-black text-text-main text-lg uppercase tracking-tight mb-2 leading-none">{risk.title}</h5>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{risk.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Severidade: {risk.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-4">Plano de Otimização</h4>
            <div className="glass-panel p-10 rounded-lg border border-blue-500/20 shadow-2xl bg-blue-600/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-16 -mt-16"></div>
              <h4 className="text-sm font-black uppercase text-blue-400 mb-8 tracking-widest flex items-center gap-3">
                <Zap size={20} /> Sugestões de Lucro
              </h4>
              <ul className="space-y-6">
                {analysis.optimizations.map((opt: string, i: number) => (
                  <li key={i} className="text-xs font-bold leading-relaxed flex gap-4 text-slate-300">
                    <div className="w-6 h-6 rounded-md bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <Zap size={12} className="text-blue-400" />
                    </div>
                    {opt}
                  </li>
                ))}
              </ul>
              
              <div className="mt-10 p-6 bg-white/5 rounded-lg border border-white/10">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Plano de Manutenção</p>
                <p className="text-xs font-bold text-text-main leading-relaxed">{analysis.maintenancePlan}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!analysis && !loading && (
        <div className="py-32 text-center glass-panel rounded-lg border-2 border-dashed border-white/10 opacity-50">
           <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
              <Activity size={48} className="text-slate-900 opacity-40" />
           </div>
           <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em] opacity-40">Aguardando telemetria para análise</p>
        </div>
      )}
    </div>
  );
};

export default Auditor;

