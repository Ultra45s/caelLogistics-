import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'brand' | 'white';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 48
};

const colorMap = {
  default: 'border-white/10 border-t-blue-500',
  brand: 'border-transparent border-t-brand',
  white: 'border-white/20 border-t-white'
};

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  variant = 'default',
  className = ''
}) => {
  return (
    <div 
      className={`
        rounded-full animate-spin
        ${colorMap[variant]}
        ${className}
      `}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderWidth: sizeMap[size] / 4
      }}
    />
  );
};

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" variant="white" />
      {message && (
        <p className="text-white/60 font-black uppercase tracking-widest text-xs animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
