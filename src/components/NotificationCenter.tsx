
import React from 'react';
import { AppNotification } from '../types';
import { Bell, X, Info, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, BellOff } from 'lucide-react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  onNavigate: (link: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onClearAll, 
  onClose,
  onNavigate
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-600', icon: AlertTriangle };
      case 'error': return { bg: 'bg-rose-50', text: 'text-rose-600', icon: AlertCircle };
      case 'success': return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2 };
      default: return { bg: 'bg-blue-50', text: 'text-blue-600', icon: Info };
    }
  };

  return (
    <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-in slide-in-from-top-4 duration-300">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={20} className="text-slate-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Notificações</h3>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={onClearAll}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              Limpar Tudo
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <BellOff size={32} className="text-slate-200" />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tudo em ordem!</p>
            <p className="text-[10px] font-medium text-slate-400 mt-2">Não existem novos alertas no momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => {
              const styles = getTypeStyles(n.type);
              return (
                <div 
                  key={n.id} 
                  className={`p-5 hover:bg-slate-50 transition-all cursor-pointer relative group ${!n.read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    if (n.link) onNavigate(n.link);
                  }}
                >
                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-2xl ${styles.bg} ${styles.text} flex items-center justify-center shrink-0`}>
                      <styles.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs font-black uppercase tracking-tight ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          {new Date(n.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      {n.link && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Detalhes <ChevronRight size={10} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;

