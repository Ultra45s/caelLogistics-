import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30 border-blue-400/20',
  secondary: 'bg-white/5 text-text-main border-white/10 hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/30 border-rose-400/20',
  ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5',
  outline: 'bg-transparent border border-white/10 text-text-main hover:bg-white/5 hover:text-white'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[10px] tracking-widest',
  md: 'px-6 py-3 text-[11px] tracking-[0.1em]',
  lg: 'px-10 py-5 text-[11px] tracking-[0.2em]'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        font-black uppercase rounded-xl flex items-center justify-center gap-3
        border transition-all active:scale-95
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={16} />
      ) : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

Button.displayName = 'Button';
