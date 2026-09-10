import React from 'react';
import { Shield, Activity, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Severity, FindingStatus } from '../../types';

// ── SeverityBadge ─────────────────────────────────────────────────────────────
interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md', dot = true }) => {
  const config = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical' },
    high:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High' },
    medium:   { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Medium' },
    low:      { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', label: 'Low' },
    info:     { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Info' },
  }[severity];

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-medium border rounded-full',
      config.bg, config.text, config.border,
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    )}>
      {dot && <span className={clsx('rounded-full', config.text.replace('text-', 'bg-'), size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />}
      {config.label}
    </span>
  );
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: FindingStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config: Record<FindingStatus, { bg: string; text: string; border: string; label: string; icon: React.ElementType }> = {
    open:           { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25', label: 'Open', icon: XCircle },
    confirmed:      { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', label: 'Confirmed', icon: AlertTriangle },
    in_progress:    { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/25', label: 'In Progress', icon: Activity },
    false_positive: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/25', label: 'False Positive', icon: Info },
    accepted_risk:  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/25', label: 'Accepted Risk', icon: Shield },
    resolved:       { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/25', label: 'Resolved', icon: CheckCircle },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 font-medium border rounded-full',
      c.bg, c.text, c.border,
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    )}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {c.label}
    </span>
  );
};

// ── ScanStatusBadge ───────────────────────────────────────────────────────────
import type { ScanStatus } from '../../types';

interface ScanStatusBadgeProps {
  status: ScanStatus;
}

export const ScanStatusBadge: React.FC<ScanStatusBadgeProps> = ({ status }) => {
  const config: Record<ScanStatus, { bg: string; text: string; border: string; label: string }> = {
    queued:    { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', label: 'Queued' },
    pending:   { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', label: 'Pending' },
    running:   { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Running' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Completed' },
    failed:    { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Failed' },
    cancelled: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'Cancelled' },
  };
  const c = config[status];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full', c.bg, c.text, c.border)}>
      {status === 'running' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
      {c.label}
    </span>
  );
};

// ── ExposureBadge ─────────────────────────────────────────────────────────────
import type { ExposureLevel } from '../../types';

export const ExposureBadge: React.FC<{ exposure: ExposureLevel }> = ({ exposure }) => {
  const config: Record<ExposureLevel, { bg: string; text: string; label: string }> = {
    internet: { bg: 'bg-red-500/10 border border-red-500/20', text: 'text-red-400', label: '🌐 Internet' },
    dmz:      { bg: 'bg-orange-500/10 border border-orange-500/20', text: 'text-orange-400', label: 'DMZ' },
    internal: { bg: 'bg-green-500/10 border border-green-500/20', text: 'text-green-400', label: '🔒 Internal' },
  };
  const c = config[exposure];
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', c.bg, c.text)}>
      {c.label}
    </span>
  );
};
