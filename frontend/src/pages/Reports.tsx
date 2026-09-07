import React, { useState } from 'react';
import { Download, FileText, TrendingUp, Server, Bug, GitBranch } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SeverityBadge } from '../components/ui/Badges';
import { RiskScore } from '../components/ui/RiskScore';
import { Card } from '../components/ui/index';
import { mockFindings, mockAssets, mockAttackPaths, mockRiskTrend, mockFindingsBySeverity } from '../data/mockData';
import { createReport } from '../lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-red-400">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const ReportsPage: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await createReport('proj-1');
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  const criticalFindings = mockFindings.filter(f => f.severity === 'critical');
  const resolvedCount = mockFindings.filter(f => f.status === 'resolved').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">Executive and technical security summaries</p>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <button className="btn-secondary">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <><FileText className="w-4 h-4" /> Generate Report</>
            )}
          </button>
        </div>
      </div>

      {/* Report header */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 border border-white/8 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Executive Security Summary</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Acme Corp – External Perimeter</h2>
            <p className="text-sm text-slate-400">Report period: Aug 8 – Sep 7, 2026 · Generated {new Date().toLocaleDateString()}</p>
          </div>
          <RiskScore score={78} size="lg" animate />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/8">
          {[
            { label: 'Total Assets', value: mockAssets.length, icon: Server, color: 'text-cyan-400' },
            { label: 'Total Findings', value: mockFindings.length, icon: Bug, color: 'text-orange-400' },
            { label: 'Attack Paths', value: mockAttackPaths.length, icon: GitBranch, color: 'text-red-400' },
            { label: 'Resolved', value: resolvedCount, icon: TrendingUp, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Risk Trend */}
        <Card title="Risk Score Trend" subtitle="30-day rolling average">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockRiskTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Findings by severity */}
        <Card title="Findings Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockFindingsBySeverity} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }: any) => active && payload?.length ? (
                <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold" style={{ color: payload[0].fill }}>{payload[0].value}</p>
                </div>
              ) : null} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {mockFindingsBySeverity.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Critical findings */}
      <Card
        title="Critical Findings"
        subtitle={`${criticalFindings.length} findings requiring immediate attention`}
        noPadding
      >
        <div className="divide-y divide-white/5">
          {criticalFindings.map(f => (
            <div key={f.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
              <SeverityBadge severity={f.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{f.assetHostname} · {f.scanner}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-red-400">{f.riskScore}</p>
                <p className="text-xs text-slate-500">risk score</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top attack paths */}
      <Card title="Top Attack Paths" subtitle="Prioritized by risk score">
        <div className="space-y-3">
          {mockAttackPaths.map((ap, i) => (
            <div key={ap.id} className="flex items-start gap-4 p-4 bg-white/4 border border-white/6 rounded-xl">
              <div className="w-8 h-8 bg-red-500/15 border border-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-red-400">#{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={ap.severity} size="sm" />
                  <span className="text-xs text-slate-500">{ap.hops} hops</span>
                </div>
                <p className="text-sm font-medium text-white">{ap.name}</p>
                <p className="text-xs text-slate-400 mt-1">{ap.entryPoint} → {ap.target}</p>
              </div>
              <span className="text-lg font-bold text-red-400 flex-shrink-0">{ap.riskScore}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Technical summary */}
      <Card title="Technical Vulnerability Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Most Affected Asset', value: '52.18.43.240', sub: '22 findings · Unauthorized', color: 'text-red-400' },
            { label: 'Most Common Category', value: 'Database Exposure', sub: 'MySQL, PostgreSQL exposed', color: 'text-orange-400' },
            { label: 'Highest Risk Finding', value: 'MySQL Internet Exposure', sub: 'Risk score: 98', color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="p-4 bg-white/4 border border-white/8 rounded-xl">
              <p className="text-xs text-slate-500 mb-2">{s.label}</p>
              <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-white/6 space-y-2">
          <p className="text-xs font-medium text-slate-400 mb-3">Assets by Exposure</p>
          {[
            { label: 'Internet-facing', count: mockAssets.filter(a => a.exposure === 'internet').length, total: mockAssets.length, color: 'bg-red-500' },
            { label: 'DMZ', count: mockAssets.filter(a => a.exposure === 'dmz').length, total: mockAssets.length, color: 'bg-orange-500' },
            { label: 'Internal', count: mockAssets.filter(a => a.exposure === 'internal').length, total: mockAssets.length, color: 'bg-green-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-28">{s.label}</span>
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.count / s.total) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-white w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Export options */}
      <Card title="Export Options">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { format: 'PDF Report', desc: 'Executive + Technical', icon: '📄' },
            { format: 'CSV Findings', desc: 'All findings data', icon: '📊' },
            { format: 'JSON Export', desc: 'Machine-readable data', icon: '{ }' },
          ].map(e => (
            <button
              key={e.format}
              onClick={handleGenerate}
              className="flex items-center gap-3 p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/8 hover:border-white/15 transition-all text-left"
            >
              <span className="text-2xl">{e.icon}</span>
              <div>
                <p className="text-sm font-medium text-white">{e.format}</p>
                <p className="text-xs text-slate-500">{e.desc}</p>
              </div>
              <Download className="w-4 h-4 text-slate-500 ml-auto" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
