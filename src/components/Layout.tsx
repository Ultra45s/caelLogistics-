import React, { useState, useRef, useEffect } from 'react';
import { AdminProfile, AppNotification } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import { ArrowUp } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  admin: AdminProfile;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearNotifications: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onLogout,
  admin,
  notifications,
  onMarkAsRead,
  onClearNotifications,
  theme,
  toggleTheme
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowBackToTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [activeTab]);

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-transparent overflow-hidden relative">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Desktop/Mobile */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        admin={admin}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-transparent">
        <Header
          setIsSidebarOpen={setIsSidebarOpen}
          activeTab={activeTab}
          theme={theme}
          toggleTheme={toggleTheme}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          onClearNotifications={onClearNotifications}
          setActiveTab={setActiveTab}
          admin={admin}
        />

        <section ref={scrollContainerRef} onScroll={handleScroll} className="scroll-container flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 relative overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-full">
            {children}
          </div>
        </section>

        {showBackToTop && (
          <button onClick={scrollToTop} className="fixed bottom-10 right-10 p-5 bg-slate-900 text-text-main rounded-lg shadow-2xl z-50 active:scale-90 transition-all animate-in slide-in-from-bottom-10 border border-white/10">
            <ArrowUp size={24} strokeWidth={3} />
          </button>
        )}
      </main>
    </div>
  );
};

export default Layout;

