import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl 
            font-bold text-white outline-none appearance-none
            focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30
            transition-all
            ${error ? 'border-rose-500 focus:ring-rose-500/10' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown 
          size={20} 
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" 
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-500 ml-2">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
