import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

export const UpdateManager: React.FC = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (window.api?.onUpdateAvailable) {
            window.api.onUpdateAvailable(() => {
                setUpdateAvailable(true);
                setIsVisible(true);
            });
        }

        if (window.api?.onUpdateDownloaded) {
            window.api.onUpdateDownloaded(() => {
                setUpdateDownloaded(true);
                setUpdateAvailable(false);
                setIsVisible(true);
            });
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 max-w-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            {updateDownloaded ? <RefreshCw className="w-4 h-4 text-green-400" /> : <Download className="w-4 h-4 text-blue-400" />}
                            {updateDownloaded ? 'Atualização Pronta' : 'Nova Versão Disponível'}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {updateDownloaded 
                                ? 'A nova versão foi descarregada. Reinicia para aplicar as mudanças.'
                                : 'Uma nova versão do CAEL Logistics está disponível e a ser descarregada.'}
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {updateDownloaded && (
                    <button
                        onClick={() => window.api?.restartApp?.()}
                        className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Reiniciar Agora
                    </button>
                )}
            </div>
        </div>
    );
};
