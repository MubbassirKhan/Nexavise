import React from 'react';
import { clsx } from 'clsx';

interface RiskScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animate?: boolean;
}

const getScoreConfig = (score: number) => {
  if (score >= 90) return { color: 'text-red-400', ring: 'stroke-red-500', bg: 'bg-red-500', label: 'Critical Risk', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' };
  if (score >= 70) return { color: 'text-orange-400', ring: 'stroke-orange-500', bg: 'bg-orange-500', label: 'High Risk', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]' };
  if (score >= 50) return { color: 'text-yellow-400', ring: 'stroke-yellow-500', bg: 'bg-yellow-500', label: 'Medium Risk', glow: '' };
  if (score >= 25) return { color: 'text-green-400', ring: 'stroke-green-500', bg: 'bg-green-500', label: 'Low Risk', glow: '' };
  return { color: 'text-slate-400', ring: 'stroke-slate-500', bg: 'bg-slate-500', label: 'Minimal Risk', glow: '' };
};

const sizeConfig = {
  sm:  { size: 56,  stroke: 5,  r: 22,  fontSize: 'text-base', labelSize: 'text-xs' },
  md:  { size: 80,  stroke: 6,  r: 32,  fontSize: 'text-xl', labelSize: 'text-xs' },
  lg:  { size: 120, stroke: 8,  r: 48,  fontSize: 'text-3xl', labelSize: 'text-sm' },
  xl:  { size: 160, stroke: 10, r: 64,  fontSize: 'text-5xl', labelSize: 'text-base' },
};

export const RiskScore: React.FC<RiskScoreProps> = ({ score, size = 'md', showLabel = true, animate = false }) => {
  const cfg = getScoreConfig(score);
  const s = sizeConfig[size];
  const circumference = 2 * Math.PI * s.r;
  const offset = circumference - (score / 100) * circumference;
  const cx = s.size / 2;
  const cy = s.size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={clsx('relative rounded-full', animate && cfg.glow)}>
        <svg width={s.size} height={s.size} className="-rotate-90">
          {/* Track */}
          <circle cx={cx} cy={cy} r={s.r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={s.stroke} />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={s.r}
            fill="none"
            className={clsx(cfg.ring, 'transition-all duration-1000 ease-out')}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={clsx('font-bold tabular-nums leading-none', cfg.color, s.fontSize)}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={clsx('font-medium', cfg.color, s.labelSize)}>{cfg.label}</span>
      )}
    </div>
  );
};

// ── RiskScoreBar ──────────────────────────────────────────────────────────────
export const RiskScoreBar: React.FC<{ score: number; label?: string; className?: string }> = ({ score, label, className }) => {
  const cfg = getScoreConfig(score);
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', cfg.bg)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx('text-sm font-semibold tabular-nums min-w-8 text-right', cfg.color)}>{score}</span>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  );
};

export { getScoreConfig };
