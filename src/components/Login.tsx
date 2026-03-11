import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Fingerprint, Mail, Lock, LogIn, UserPlus, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
    onAuthSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetSent, setResetSent] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        company: ''
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;
            if (data.user) onAuthSuccess(data.user);
        } catch (err: any) {
            setError(err.message || "Erro ao entrar no terminal.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setError("As senhas não coincidem.");
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        company_name: formData.company
                    }
                }
            });

            if (error) throw error;
            if (data.user) {
                setError("Conta criada! Por favor, verifique o seu e-mail para confirmar o registo.");
                setIsRegistering(false);
            }
        } catch (err: any) {
            setError(err.message || "Erro ao criar conta cloud.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
            if (error) throw error;
            setResetSent(true);
            setTimeout(() => {
                setResetSent(false);
                setShowForgotPassword(false);
            }, 5000);
        } catch (err: any) {
            setError(err.message || "Erro ao enviar e-mail de recuperação.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen min-h-[100dvh] w-full bg-slate-950 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-inter selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-20 -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[120px] opacity-10 -ml-40 -mb-40"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none"></div>

            <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="glass-panel rounded-[2.5rem] p-8 sm:p-12 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-3xl relative overflow-hidden">
                    {/* Subtle Glow inside the panel */}
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                    <div className="flex flex-col items-center mb-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-400 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] mb-8 ring-1 ring-white/20 group relative overflow-hidden transition-transform hover:scale-105 duration-500">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Fingerprint className="text-white relative z-10" size={48} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                            cael<span className="text-blue-400 ml-1">logistics</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 bg-white/5 py-1.5 px-6 rounded-full border border-white/5">
                            Terminal Operacional Cloud
                        </p>
                    </div>

                    {error && (
                        <div className="mb-8 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400 text-xs font-bold animate-in slide-in-from-top-4 duration-500">
                            <div className="p-2 bg-rose-500/20 rounded-lg shrink-0">
                                <ShieldAlert size={20} />
                            </div>
                            <p className="leading-tight">{error}</p>
                        </div>
                    )}

                    {resetSent && (
                        <div className="mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-400 text-xs font-bold animate-in slide-in-from-top-4 duration-500">
                            <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0">
                                <CheckCircle2 size={20} />
                            </div>
                            <p className="leading-tight">Instruções enviadas! Verifique o seu e-mail para redefinir a senha.</p>
                        </div>
                    )}

                    <form onSubmit={showForgotPassword ? handleResetPassword : (isRegistering ? handleRegister : handleLogin)} className="space-y-6">
                        {isRegistering && !showForgotPassword && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome do Gestor</label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="Nome Completo"
                                            className="w-full pl-6 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Empresa / Unidade</label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="CAEL Logística"
                                            className="w-full pl-6 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                            value={formData.company}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">E-mail Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input
                                    required
                                    type="email"
                                    placeholder="gestao@empresa.ao"
                                    className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {!showForgotPassword && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Senha de Segurança</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all tracking-widest placeholder:text-slate-600"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {isRegistering && !showForgotPassword && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Confirmar Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all tracking-widest placeholder:text-slate-600"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] border border-blue-400/30 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={22} />
                            ) : showForgotPassword ? (
                                <>ENVIAR INSTRUÇÕES <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                            ) : isRegistering ? (
                                <><UserPlus size={22} /> INICIALIZAR CONTA CLOUD</>
                            ) : (
                                <><LogIn size={22} /> ACEDER AO TERMINAL</>
                            )}
                        </button>

                        <div className="flex flex-col gap-4 pt-4">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setShowForgotPassword(false);
                                    setError(null);
                                }}
                                className="w-full text-[10px] font-black text-blue-400/80 uppercase tracking-[0.2em] hover:text-blue-300 transition-colors py-2 flex items-center justify-center gap-2"
                            >
                                {isRegistering ? 'Já possui acesso ao terminal?' : 'Novo operador? Solicitar acesso cloud'}
                            </button>

                            {!isRegistering && (
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => {
                                        setShowForgotPassword(!showForgotPassword);
                                        setError(null);
                                    }}
                                    className="w-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors py-2"
                                >
                                    {showForgotPassword ? 'Voltar para o login principal' : 'Sistemas de recuperação de acesso'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4">Tecnologia Avançada CAEL Angola</p>
                    <div className="flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        <div className="h-6 w-px bg-slate-800"></div>
                        <div className="h-6 w-px bg-slate-800"></div>
                        <div className="h-6 w-px bg-slate-800"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
