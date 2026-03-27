import React, { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-slate-400 border-white/10',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-3 py-1 text-[10px]',
  lg: 'px-4 py-1.5 text-xs'
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-blue-400'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false
}) => {
  return (
    <span className={`
      inline-flex items-center gap-1.5 font-black uppercase tracking-wider
      border rounded-lg
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
  size?: BadgeSize;
}

const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'success', label: 'Ativo' },
  inactive: { variant: 'danger', label: 'Inativo' },
  pending: { variant: 'warning', label: 'Pendente' },
  completed: { variant: 'success', label: 'Concluído' },
  cancelled: { variant: 'danger', label: 'Cancelado' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { variant, label } = statusMap[status] || { variant: 'default', label: status };
  return <Badge variant={variant} size={size} dot>{label}</Badge>;
};
