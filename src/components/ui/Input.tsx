import React, { InputHTMLAttributes, forwardRef } from 'react';

type InputVariant = 'default' | 'filled' | 'date' | 'number';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-white/5 border-white/10 focus:ring-blue-500/10 focus:border-blue-500/30',
  filled: 'bg-blue-500/5 border-blue-500/20 focus:ring-blue-500/10',
  date: 'bg-slate-950/50 border-white/10 focus:border-blue-500/50',
  number: 'bg-white/5 border-white/10 text-center'
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-4 text-base',
  lg: 'px-6 py-5 text-lg'
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  label,
  error,
  leftIcon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-2xl font-bold text-white outline-none transition-all
            border placeholder:text-slate-800
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${leftIcon ? 'pl-12' : ''}
            ${error ? 'border-rose-500 focus:ring-rose-500/10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
