import React from 'react';
import { Search, Filter } from 'lucide-react';
import { clsx } from 'clsx';

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-500" />
    </div>
    <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs">{description}</p>
    {action && (
      <button onClick={action.onClick} className="btn-primary mt-4">
        {action.label}
      </button>
    )}
  </div>
);

// ── LoadingState ──────────────────────────────────────────────────────────────
export const LoadingState: React.FC<{ rows?: number; className?: string }> = ({ rows = 5, className }) => (
  <div className={clsx('space-y-3', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 bg-white/4 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
    ))}
  </div>
);

// ── SearchInput ───────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search…', className }) => (
  <div className={clsx('relative', className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input pl-9"
    />
  </div>
);

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, className, placeholder }) => (
  <div className={clsx('relative', className)}>
    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="input pl-9 pr-8 appearance-none cursor-pointer"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, pageSize, onPageChange }) => {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
      <span className="text-xs text-slate-500">Showing {start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost py-1 px-2 text-xs disabled:opacity-40"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-7 h-7 rounded text-xs font-medium transition-colors',
                p === page ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-white/8',
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost py-1 px-2 text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, children, className, noPadding = false }) => (
  <div className={clsx('bg-navy-800 border border-white/8 rounded-xl', className)}>
    {(title || action) && (
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <div>
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )}
    <div className={clsx(!noPadding && 'p-5')}>{children}</div>
  </div>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ value: number; color?: string; className?: string }> = ({
  value, color = 'bg-cyan-500', className,
}) => (
  <div className={clsx('h-1.5 bg-white/8 rounded-full overflow-hidden', className)}>
    <div
      className={clsx('h-full rounded-full transition-all duration-700', color)}
      style={{ width: `${Math.min(100, value)}%` }}
    />
  </div>
);

// ── Tooltip ───────────────────────────────────────────────────────────────────
export const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy-600 border border-white/10 rounded text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {content}
    </div>
  </div>
);
