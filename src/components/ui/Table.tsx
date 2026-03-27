import React, { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

export function Table<T>({ 
  data, 
  columns, 
  keyExtractor, 
  onRowClick,
  emptyMessage = 'Nenhum registo encontrado',
  loading = false 
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map(col => (
              <th 
                key={col.key}
                className={`px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest ${alignStyles[col.align || 'left']}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr 
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                border-b border-white/5 hover:bg-white/5 transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
            >
              {columns.map(col => (
                <td 
                  key={col.key}
                  className={`px-4 py-4 text-sm text-white ${alignStyles[col.align || 'left']}`}
                >
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
