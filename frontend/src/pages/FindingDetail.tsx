import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Server, Clock, User, ChevronDown,
  AlertTriangle, CheckCircle, Info, Code2, Wrench,
} from 'lucide-react';
import { clsx } from 'clsx';
import { SeverityBadge, StatusBadge } from '../components/ui/Badges';
import { RiskScore } from '../components/ui/RiskScore';
import { Card } from '../components/ui/index';
import { mockFindings, mockUsers } from '../data/mockData';
import type { FindingStatus } from '../types';

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'false_positive', label: 'False Positive' },
  { value: 'accepted_risk', label: 'Accepted Risk' },
  { value: 'resolved', label: 'Resolved' },
];

export const FindingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const finding = mockFindings.find(f => f.id === id);

  const [status, setStatus] = useState<FindingStatus>(finding?.status ?? 'open');
  const [assignedTo, setAssignedTo] = useState(finding?.assignedTo ?? '');
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  if (!finding) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-white font-semibold">Finding not found</p>
          <button onClick={() => navigate('/vulnerabilities')} className="btn-primary mt-4">← Back</button>
        </div>
      </div>
    );
  }

  const riskBreakdownItems = [
    { label: 'Base Severity', value: finding.riskBreakdown.baseSeverity, max: 40, color: 'bg-red-500' },
    { label: 'Internet Exposure', value: finding.riskBreakdown.internetExposure, max: 35, color: 'bg-orange-500' },
    { label: 'Asset Criticality', value: finding.riskBreakdown.assetCriticality, max: 25, color: 'bg-yellow-500' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/vulnerabilities')} className="btn-ghost text-xs">
          <ArrowLeft className="w-4 h-4" /> Vulnerabilities
        </button>
        <span className="text-slate-600">/</span>
        <span className="text-xs text-slate-400 truncate">{finding.title}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity={finding.severity} />
            {finding.cve && (
              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                {finding.cve}
              </span>
            )}
            {finding.cvss && (
              <span className="text-xs text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                CVSS {finding.cvss}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white leading-tight">{finding.title}</h1>
          <p className="text-sm text-slate-400 mt-2">{finding.description}</p>
        </div>
        <div className="flex-shrink-0">
          <RiskScore score={finding.riskScore} size="lg" animate />
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-navy-800 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Asset</span>
          </div>
          <p className="text-sm font-medium text-white truncate">{finding.assetHostname}</p>
          {finding.affectedPort && <p className="text-xs font-mono text-slate-500 mt-0.5">Port {finding.affectedPort}</p>}
        </div>
        <div className="bg-navy-800 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Scanner</span>
          </div>
          <p className="text-sm font-medium text-white capitalize">{finding.scanner}</p>
        </div>
        <div className="bg-navy-800 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Discovered</span>
          </div>
          <p className="text-sm font-medium text-white">{new Date(finding.discoveredAt).toLocaleDateString()}</p>
        </div>
        <div className="bg-navy-800 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Assigned</span>
          </div>
          <p className="text-sm font-medium text-white">
            {mockUsers.find(u => u.id === assignedTo)?.name ?? 'Unassigned'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Why risky */}
          <Card title="Why This Finding Is Risky">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-300 leading-relaxed">{finding.whyRisky}</p>
            </div>
          </Card>

          {/* Evidence */}
          <Card title="Evidence & Technical Details">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Scanner Output</span>
                </div>
                <pre className="text-xs font-mono text-green-400 bg-black/40 border border-white/8 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {finding.evidence}
                </pre>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Technical Details</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{finding.technicalDetails}</p>
              </div>
            </div>
          </Card>

          {/* Risk breakdown */}
          <Card title="Risk Score Breakdown">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <RiskScore score={finding.riskScore} size="md" showLabel={false} />
                <div className="flex-1 space-y-3">
                  {riskBreakdownItems.map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{item.label}</span>
                        <span className="text-xs font-semibold text-white">{item.value} / {item.max}</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-700', item.color)}
                          style={{ width: `${(item.value / item.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 border-t border-white/6 pt-3">
                Total risk score = Base Severity ({finding.riskBreakdown.baseSeverity}) + Internet Exposure ({finding.riskBreakdown.internetExposure}) + Asset Criticality ({finding.riskBreakdown.assetCriticality})
              </p>
            </div>
          </Card>

          {/* Remediation */}
          <Card title="Remediation Guidance">
            <div className="flex items-start gap-3">
              <Wrench className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1.5">
                {finding.remediation.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          {/* Status selector */}
          <Card title="Status">
            <div className="space-y-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatusDrop(!showStatusDrop)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition-colors"
                >
                  <StatusBadge status={status} />
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {showStatusDrop && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusDrop(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-navy-800 border border-white/12 rounded-xl shadow-2xl z-20 py-1">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setStatus(opt.value); setShowStatusDrop(false); }}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition-colors',
                            status === opt.value && 'bg-cyan-500/10',
                          )}
                        >
                          <StatusBadge status={opt.value} size="sm" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Assign */}
          <Card title="Assigned To">
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="input"
            >
              <option value="">Unassigned</option>
              {mockUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </Card>

          {/* Tags */}
          {finding.tags.length > 0 && (
            <Card title="Tags">
              <div className="flex flex-wrap gap-2">
                {finding.tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Status history */}
          <Card title="Audit Timeline">
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-white/8" />
              <div className="space-y-4">
                {finding.statusHistory.map((entry, i) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                      entry.status === 'resolved' ? 'bg-green-500/20 border border-green-500/30' :
                      entry.status === 'confirmed' ? 'bg-orange-500/20 border border-orange-500/30' :
                      'bg-white/8 border border-white/12',
                    )}>
                      {entry.status === 'resolved'
                        ? <CheckCircle className="w-3 h-3 text-green-400" />
                        : <div className="w-2 h-2 bg-slate-400 rounded-full" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <StatusBadge status={entry.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">by {entry.changedBy}</p>
                      {entry.note && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{entry.note}"</p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">{new Date(entry.changedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
