import React, { useState } from 'react';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import SyncStatusIndicator from './SyncStatusIndicator';
import { AppNotification, AdminProfile } from '../types';
import { navItems } from './Sidebar';

interface HeaderProps {
    setIsSidebarOpen: (isOpen: boolean) => void;
    activeTab: string;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onClearNotifications: () => void;
    setActiveTab: (tab: string) => void;
    admin: AdminProfile;
}

const Header: React.FC<HeaderProps> = ({
    setIsSidebarOpen,
    activeTab,
    theme,
    toggleTheme,
    notifications,
    onMarkAsRead,
    onClearNotifications,
    setActiveTab,
    admin
}) => {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="h-20 lg:h-24 glass-panel border-b border-white/10 flex items-center justify-between px-4 sm:px-8 lg:px-12 z-30 shrink-0">
            <div className="flex items-center gap-6">
                <button className="lg:hidden p-3 text-text-main bg-white/10 rounded-lg active:scale-90 transition-all border border-white/10" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] leading-none mb-2">Painel Operacional</span>
                    <h2 className="text-xl font-black text-text-main uppercase tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h2>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-lg transition-all active:scale-90 relative border border-white/10 ${theme === 'light' ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-white/10 hover:text-text-main'}`}
                    title={theme === 'light' ? 'Modo Noturno' : 'Modo Diurno'}
                >
                    {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className={`p-3 rounded-lg transition-all active:scale-90 relative border border-white/10 ${isNotificationOpen ? 'bg-brand/20 text-brand-text' : 'text-muted hover:bg-white/10 hover:text-text-main'}`}
                    >
                        <Bell size={22} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-4 ring-bg-main">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <NotificationCenter
                            notifications={notifications}
                            onMarkAsRead={onMarkAsRead}
                            onClearAll={onClearNotifications}
                            onClose={() => setIsNotificationOpen(false)}
                            onNavigate={(link) => {
                                setActiveTab(link);
                                setIsNotificationOpen(false);
                            }}
                        />
                    )}
                </div>

                <div className="hidden xl:flex items-center">
                    <SyncStatusIndicator />
                </div>
            </div>
        </header>
    );
};

export default Header;

