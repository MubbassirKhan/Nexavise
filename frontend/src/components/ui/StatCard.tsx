import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: { value: number; label: string };
  accent?: 'cyan' | 'red' | 'orange' | 'yellow' | 'green' | 'purple' | 'blue';
  onClick?: () => void;
  className?: string;
}

const accentConfig = {
  cyan:   { icon: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]' },
  red:    { icon: 'text-red-400',  bg: 'bg-red-400/10',  border: 'border-red-400/20',  glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
  orange: { icon: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]' },
  yellow: { icon: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', glow: 'hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]' },
  green:  { icon: 'text-green-400', bg: 'bg-green-400/10',  border: 'border-green-400/20',  glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]' },
  purple: { icon: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]' },
  blue:   { icon: 'text-blue-400', bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon, trend, accent = 'cyan', onClick, className,
}) => {
  const a = accentConfig[accent];
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative bg-navy-800 border border-white/8 rounded-xl p-5 transition-all duration-200',
        'hover:border-white/15 hover:bg-navy-700/50',
        a.glow,
        onClick && 'cursor-pointer',
        'animate-fade-in',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={clsx('text-xs font-medium', trend.value > 0 ? 'text-red-400' : trend.value < 0 ? 'text-green-400' : 'text-slate-400')}>
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', a.bg, 'border', a.border)}>
          <Icon className={clsx('w-5 h-5', a.icon)} />
        </div>
      </div>
      {/* Subtle accent line at top */}
      <div className={clsx('absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-60', a.bg.replace('/10', '').replace('bg-', 'bg-'))} />
    </div>
  );
};
