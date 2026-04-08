import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Fingerprint, Mail, Lock, LogIn, UserPlus, ShieldAlert, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const { login } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetSent, setResetSent] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [isErrorShaking, setIsErrorShaking] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        company: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsErrorShaking(false);

        try {
            if (isOfflineMode) {
                if (!window.api) throw new Error("Terminal Desktop não detectado para modo offline.");
                const res = await window.api.sqliteLogin(formData.email, formData.password);
                if (res.success) {
                    localStorage.setItem('offline_user', JSON.stringify(res.user));
                    login({ uid: res.user.id, email: res.user.email || '' });
                } else {
                    triggerShake();
                    throw new Error(res.error);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) {
                    triggerShake();
                    throw error;
                }
                if (data.user) login({ uid: data.user.id, email: data.user.email || '' });
            }
        } catch (err: any) {
            setError(err.message || "Erro ao entrar no terminal.");
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    const triggerShake = () => {
        setIsErrorShaking(true);
        setTimeout(() => setIsErrorShaking(false), 500);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setError("As senhas não coincidem.");
        }

        setIsLoading(true);
        setError(null);

        try {
            if (isOfflineMode) {
                if (!window.api) throw new Error("Terminal Desktop não detectado.");
                const res = await window.api.sqliteRegisterUser(formData.email, formData.password, formData.name);
                if (res.success) {
                    setError("Conta local criada! Você pode fazer login agora.");
                    setIsRegistering(false);
                } else {
                    throw new Error(res.error);
                }
            } else {
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
            }
        } catch (err: any) {
            setError(err.message || "Erro ao criar conta.");
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
        <div className="min-h-screen min-h-[100dvh] w-full bg-[#020617] flex flex-col justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Premium Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
            </div>

            <div className={`w-full max-w-[520px] mx-auto relative z-10 my-8 flex-shrink-0 transition-all duration-500 ${isErrorShaking ? 'animate-shake' : ''}`}>
                <div className="bg-white/[0.03] backdrop-blur-[40px] border border-white/10 rounded-[3rem] p-10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden">
                    {isRegistering && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(false);
                                setIsOfflineMode(false);
                                setError(null);
                                setShowForgotPassword(false);
                            }}
                            className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full border border-white/10 z-20 hover:bg-white/10"
                            title="Voltar ao Início"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    {/* Subtle Glow inside the panel */}
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                    <div className="flex flex-col items-center mb-10 text-center text-white">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-[0_25px_60px_rgba(37,99,235,0.4)] mb-8 ring-1 ring-white/20 group relative overflow-hidden transition-transform hover:scale-110 duration-500">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Fingerprint className="text-white relative z-10" size={48} strokeWidth={2} />
                        </div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-3">
                            cael<span className={isOfflineMode ? "text-emerald-400 ml-1" : "text-blue-400 ml-1"}>logistics</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 bg-white/5 py-2 px-8 rounded-full border border-white/5">
                            {isOfflineMode ? "Terminal Operacional Local" : "Terminal Operacional Cloud"}
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

                    <form onSubmit={showForgotPassword ? handleResetPassword : (isRegistering ? handleRegister : handleLogin)} className="space-y-6 text-white">
                        {/* Offline Mode Toggle Layer */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl mb-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso Restrito / Offline</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={isOfflineMode} onChange={() => setIsOfflineMode(!isOfflineMode)} />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                        
                        {isRegistering && !showForgotPassword && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nome do Gestor</label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="Nome Completo"
                                            className="w-full pl-6 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Empresa / Unidade</label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="CAEL Logística"
                                            className="w-full pl-6 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                            value={formData.company}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">E-mail Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={22} />
                                <input
                                    required
                                    type="email"
                                    placeholder="gestao@empresa.ao"
                                    className="w-full pl-16 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all placeholder:text-slate-600"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {!showForgotPassword && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Senha de Segurança</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={22} />
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full pl-16 pr-14 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all tracking-widest placeholder:text-slate-600"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRegistering && !showForgotPassword && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Confirmar Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={22} />
                                    <input
                                        required
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full pl-16 pr-14 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white text-base outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all tracking-widest placeholder:text-slate-600"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full text-white font-black py-6 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] border uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-10 ${
                                isOfflineMode 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400/30 hover:shadow-emerald-500/30'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400/30 hover:shadow-blue-500/30'
                            }`}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : showForgotPassword ? (
                                <>RESTAURAR ACESSO <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" /></>
                            ) : isRegistering ? (
                                <><UserPlus size={22} /> {isOfflineMode ? 'CRIAR PERFIL EXECUTIVO' : 'ATIVAR CONTA CLOUD'}</>
                            ) : (
                                <><LogIn size={22} /> {isOfflineMode ? 'CONEXÃO LOCAL' : 'CONEXÃO CLOUD'}</>
                            )}
                        </button>

                        <div className="flex flex-col gap-4 pt-4">
                            {!isRegistering && !showForgotPassword && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRegistering(true);
                                        setIsOfflineMode(true);
                                        setError(null);
                                        setShowForgotPassword(false);
                                    }}
                                    className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-black py-4 rounded-xl uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                    <UserPlus size={18} /> CRIAR NOVA CONTA (USO LOCAL OFFLINE)
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    // Se estiver cancelando o registro, volta pro modo inicial de onde estava
                                    if (isRegistering) {
                                        setIsOfflineMode(false); 
                                    } else {
                                        setIsOfflineMode(false); // Assume cloud by default pra nova request
                                    }
                                    setShowForgotPassword(false);
                                    setError(null);
                                }}
                                className={`w-full text-[10px] font-black uppercase tracking-[0.2em] transition-colors py-3 px-6 rounded-xl border border-transparent hover:border-white/10 flex items-center justify-center gap-2 text-blue-400/80 hover:text-blue-300 bg-blue-500/5`}
                            >
                                {isRegistering 
                                    ? 'Já possui conta? Fazer Login' 
                                    : 'Não tem conta? Criar conta Cloud'}
                            </button>

                            {!isRegistering && !isOfflineMode && (
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

                <div className="mt-8 text-center pb-6">
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
