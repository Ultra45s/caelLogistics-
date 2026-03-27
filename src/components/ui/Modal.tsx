import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, button, select, textarea');
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        ref={modalRef}
        className={`
          relative w-full ${sizeStyles[size]} 
          bg-slate-900 border border-white/10 
          rounded-2xl shadow-2xl 
          animate-in fade-in zoom-in-95 duration-200
          max-h-[90vh] overflow-hidden flex flex-col
        `}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            {title && (
              <h2 className="text-lg font-black uppercase tracking-widest text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-slate-500 hover:text-white"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false
}) => {
  const variantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-500 border-rose-400/20',
    warning: 'bg-amber-600 hover:bg-amber-500 border-amber-400/20',
    info: 'bg-blue-600 hover:bg-blue-500 border-blue-400/20'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-slate-400 mb-6">{message}</p>
      <div className="flex gap-4">
        <button 
          onClick={onClose}
          className="flex-1 py-4 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
        >
          {cancelText}
        </button>
        <button 
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-xs
            shadow-2xl border active:scale-95 transition-all
            ${variantStyles[variant]}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isLoading ? 'A processar...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};
