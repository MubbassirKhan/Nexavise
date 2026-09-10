import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldAlert, Server, Activity, Plus, ScanLine, Eye,
  TrendingUp, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { RiskScore } from '../components/ui/RiskScore';
import { SeverityBadge, ScanStatusBadge } from '../components/ui/Badges';
import { Card } from '../components/ui/index';
import {
  mockAssets, mockFindings,
  mockRiskTrend, mockFindingsBySeverity,
} from '../data/mockData';
import { getAttackPaths, getScans } from '../lib/api';
import type { AttackPath, Project, Scan } from '../types';

interface DashboardContext {
  selectedProject: Project;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-sm font-semibold" style={{ color: p.color || '#22d3ee' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useOutletContext<DashboardContext>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [attackPaths, setAttackPaths] = useState<AttackPath[]>([]);
  const [scanError, setScanError] = useState(false);

  useEffect(() => {
    setScanError(false);
    Promise.all([getScans(selectedProject.id), getAttackPaths(selectedProject.id)])
      .then(([scanItems, pathItems]) => {
        setScans(scanItems);
        setAttackPaths(pathItems);
      })
      .catch(() => {
        setScans([]);
        setAttackPaths([]);
        setScanError(true);
      });
  }, [selectedProject.id]);

  const criticalFindings = mockFindings.filter(f => f.severity === 'critical' && f.status !== 'resolved');
  const highFindings = mockFindings.filter(f => f.severity === 'high' && f.status !== 'resolved');
  const activeAssets = mockAssets.filter(a => a.status === 'active');
  const recentScans = scans.slice(0, 4);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Acme Corp – External Perimeter · Last updated 2 min ago</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/attack-surface')} className="btn-secondary">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
          <button onClick={() => navigate('/scan-center')} className="btn-primary">
            <ScanLine className="w-4 h-4" /> Start Scan
          </button>
        </div>
      </div>

      {/* Risk Score + Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Risk Score Card */}
        <div className="sm:col-span-2 xl:col-span-1 bg-navy-800 border border-white/8 rounded-xl p-5 flex flex-col items-center justify-center gap-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Score</p>
          <RiskScore score={78} size="lg" animate />
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400 font-medium">+3 pts this week</span>
          </div>
        </div>

        <StatCard title="Total Assets" value={mockAssets.length} subtitle={`${activeAssets.length} active`}
          icon={Server} accent="cyan" trend={{ value: 2, label: 'this week' }}
          onClick={() => navigate('/attack-surface')} />
        <StatCard title="Critical Findings" value={criticalFindings.length} subtitle="Require immediate attention"
          icon={ShieldAlert} accent="red" trend={{ value: 15, label: 'vs last scan' }}
          onClick={() => navigate('/vulnerabilities')} />
        <StatCard title="High Findings" value={highFindings.length} subtitle="High severity open"
          icon={AlertTriangle} accent="orange"
          onClick={() => navigate('/vulnerabilities')} />
        <StatCard title="Active Scans" value={scans.filter(s => s.status === 'running' || s.status === 'pending').length}
          subtitle="From Scan Center" icon={Activity} accent="blue" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Risk Trend */}
        <div className="xl:col-span-2">
          <Card title="Risk Score Trend" subtitle="30-day rolling window">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mockRiskTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} fill="url(#riskGrad)" dot={false} name="Risk Score" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Findings by severity */}
        <Card title="Findings by Severity">
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={mockFindingsBySeverity}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mockFindingsBySeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold" style={{ color: payload[0].payload.fill }}>
                        {payload[0].name}: {payload[0].value}
                      </p>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {mockFindingsBySeverity.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                <span className="text-xs text-slate-400 flex-1">{s.name}</span>
                <span className="text-xs font-semibold text-white">{s.value}</span>
                <div className="w-16 h-1 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.value / 127) * 100}%`, backgroundColor: s.fill }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top risky assets */}
        <div className="xl:col-span-2">
          <Card
            title="Top Risky Assets"
            subtitle="Ranked by risk score"
            noPadding
            action={
              <button onClick={() => navigate('/attack-surface')} className="btn-ghost text-xs">
                <Eye className="w-3.5 h-3.5" /> View all
              </button>
            }
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="table-header px-4 py-3 text-left">Asset</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Type</th>
                  <th className="table-header px-4 py-3 text-center">Risk</th>
                  <th className="table-header px-4 py-3 text-center hidden md:table-cell">Critical</th>
                  <th className="table-header px-4 py-3 text-center hidden md:table-cell">High</th>
                  <th className="table-header px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...mockAssets].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5).map(asset => (
                  <tr
                    key={asset.id}
                    className="table-row cursor-pointer"
                    onClick={() => navigate('/attack-surface')}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-white text-xs">{asset.hostname}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{asset.ip}</p>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className="text-xs text-slate-400 capitalize">{asset.type}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`text-sm font-bold ${asset.riskScore >= 90 ? 'text-red-400' : asset.riskScore >= 70 ? 'text-orange-400' : 'text-yellow-400'}`}>
                        {asset.riskScore}
                      </span>
                    </td>
                    <td className="table-cell text-center hidden md:table-cell">
                      <span className="text-red-400 font-semibold text-sm">{asset.criticalCount}</span>
                    </td>
                    <td className="table-cell text-center hidden md:table-cell">
                      <span className="text-orange-400 font-semibold text-sm">{asset.highCount}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        asset.status === 'active' ? 'text-green-400 bg-green-500/10' :
                        asset.status === 'inactive' ? 'text-slate-400 bg-white/5' : 'text-yellow-400 bg-yellow-500/10'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Recent scans + Attack paths */}
        <div className="space-y-4">
          {/* Recent scans */}
          <Card title="Recent Scans" action={
            <button onClick={() => navigate('/scan-center')} className="btn-ghost text-xs">
              <Eye className="w-3.5 h-3.5" /> All
            </button>
          }>
            <div className="space-y-3">
              {scanError && <p className="text-xs text-red-400">Unable to load scan data. Please check the backend connection.</p>}
              {!scanError && recentScans.length === 0 && <p className="text-xs text-slate-500">No scans available.</p>}
              {!scanError && recentScans.map(scan => (
                <div key={scan.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/4 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    scan.scanner === 'nuclei' ? 'bg-purple-500/15 border border-purple-500/20' : 'bg-cyan-500/15 border border-cyan-500/20'
                  }`}>
                    <ScanLine className={`w-3.5 h-3.5 ${scan.scanner === 'nuclei' ? 'text-purple-400' : 'text-cyan-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{scan.assetHostname}</p>
                    <p className="text-xs text-slate-500 capitalize">{scan.scanner}</p>
                  </div>
                  <ScanStatusBadge status={scan.status} />
                </div>
              ))}
            </div>
          </Card>

          {/* Top attack paths */}
          <Card title="Attack Paths" action={
            <button onClick={() => navigate('/attack-paths')} className="btn-ghost text-xs">
              <Eye className="w-3.5 h-3.5" /> View
            </button>
          }>
            <div className="space-y-2">
              {attackPaths.map(ap => (
                <div
                  key={ap.id}
                  className="p-2.5 rounded-lg bg-white/4 border border-white/6 hover:border-white/12 cursor-pointer transition-all"
                  onClick={() => navigate('/attack-paths')}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <SeverityBadge severity={ap.severity} size="sm" />
                    <span className="text-xs font-bold text-red-400 ml-auto">{ap.riskScore}</span>
                  </div>
                  <p className="text-xs text-white font-medium leading-tight">{ap.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{ap.hops} hops · {ap.entryPoint}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
