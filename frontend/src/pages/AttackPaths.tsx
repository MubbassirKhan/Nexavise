import React, { useState, useRef } from 'react';
import { GitBranch, AlertTriangle, Target, Server, Globe, Zap, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { SeverityBadge } from '../components/ui/Badges';
import { Card } from '../components/ui/index';
import { mockAttackPaths } from '../data/mockData';
import type { AttackPath, AttackNode, AttackEdge } from '../types';

// Node type configs
const NODE_CONFIG = {
  internet: { bg: '#1a2740', border: '#3b82f6', icon: Globe, label: 'Entry Point', color: '#60a5fa' },
  asset:    { bg: '#1a2030', border: '#06b6d4', icon: Server, label: 'Asset', color: '#22d3ee' },
  service:  { bg: '#1a2030', border: '#8b5cf6', icon: Zap, label: 'Service', color: '#a78bfa' },
  vulnerability: { bg: '#2a1a1a', border: '#ef4444', icon: AlertTriangle, label: 'Vulnerability', color: '#f87171' },
  target:   { bg: '#2a1a1a', border: '#f97316', icon: Target, label: 'Target', color: '#fb923c' },
};

const SEVERITY_EDGE_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

interface SVGGraphProps {
  nodes: AttackNode[];
  edges: AttackEdge[];
  selectedNode: string | null;
  onNodeSelect: (id: string | null) => void;
  severity: string;
}

const AttackGraph: React.FC<SVGGraphProps> = ({ nodes, edges, selectedNode, onNodeSelect, severity }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const edgeColor = SEVERITY_EDGE_COLORS[severity] || '#ef4444';

  // Calculate SVG dimensions
  const maxX = Math.max(...nodes.map(n => n.x)) + 120;
  const maxY = Math.max(...nodes.map(n => n.y)) + 80;
  const viewBoxW = Math.max(maxX, 820);
  const viewBoxH = Math.max(maxY, 320);

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 55, y: node.y + 30 };
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        className="w-full"
        style={{ minHeight: 280, maxHeight: 380 }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={edgeColor} opacity="0.7" />
          </marker>
          <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#22d3ee" />
          </marker>
          {/* Glow filters */}
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-cyan">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={edgeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={edgeColor} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map(edge => {
          const src = getNodeCenter(edge.source);
          const tgt = getNodeCenter(edge.target);
          const isSelected = selectedNode === edge.source || selectedNode === edge.target;
          // Curved path
          const mx = (src.x + tgt.x) / 2;
          const my = Math.min(src.y, tgt.y) - 30;
          const pathD = `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`;

          return (
            <g key={edge.id}>
              {/* Shadow line */}
              <path d={pathD} fill="none" stroke={isSelected ? '#22d3ee' : edgeColor} strokeWidth={isSelected ? 3 : 1.5}
                strokeOpacity={isSelected ? 0.9 : 0.35} strokeDasharray="6 4"
                markerEnd={isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
              />
              {/* Animated flow dot */}
              {isSelected && (
                <circle r="4" fill="#22d3ee" opacity="0.9" filter="url(#glow-cyan)">
                  <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} />
                </circle>
              )}
              {/* Edge label */}
              {edge.label && (
                <text
                  x={mx} y={my - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isSelected ? '#22d3ee' : '#64748b'}
                  className="font-mono"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const cfg = NODE_CONFIG[node.type];
          const Icon = cfg.icon;
          const isSelected = selectedNode === node.id;
          const lines = node.label.split('\n');

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => onNodeSelect(isSelected ? null : node.id)}
            >
              {/* Selection ring */}
              {isSelected && (
                <rect x="-5" y="-5" width="120" height="70" rx="12"
                  fill="none" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.8"
                  filter="url(#glow-cyan)"
                >
                  <animate attributeName="strokeOpacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Node box */}
              <rect x="0" y="0" width="110" height="60" rx="10"
                fill={cfg.bg}
                stroke={isSelected ? '#22d3ee' : cfg.border}
                strokeWidth={isSelected ? 2 : 1.5}
                filter={isSelected ? 'url(#glow-cyan)' : undefined}
                opacity={selectedNode && !isSelected ? 0.5 : 1}
              />

              {/* Risk score indicator */}
              {node.riskScore != null && (
                <rect x="0" y="0" width={Math.max(20, (node.riskScore / 100) * 110)} height="3" rx="1.5"
                  fill={node.riskScore >= 90 ? '#ef4444' : node.riskScore >= 70 ? '#f97316' : '#eab308'}
                  opacity="0.8"
                />
              )}

              {/* Icon */}
              <foreignObject x="8" y="10" width="20" height="20">
                <div className="flex items-center justify-center w-5 h-5">
                  <Icon style={{ width: 12, height: 12, color: isSelected ? '#22d3ee' : cfg.color }} />
                </div>
              </foreignObject>

              {/* Label */}
              {lines.map((line, i) => (
                <text key={i} x="32" y={22 + i * 14} fontSize="10" fill={isSelected ? '#e2e8f0' : '#94a3b8'}
                  fontFamily="Inter, system-ui, sans-serif" fontWeight={i === 0 ? '600' : '400'}
                >
                  {line.length > 14 ? line.slice(0, 13) + '…' : line}
                </text>
              ))}

              {/* Risk score badge */}
              {node.riskScore != null && (
                <text x="90" y="50" fontSize="9" fill={node.riskScore >= 90 ? '#f87171' : node.riskScore >= 70 ? '#fb923c' : '#fbbf24'}
                  textAnchor="end" fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                >
                  {node.riskScore}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const AttackPathsPage: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<AttackPath | undefined>(mockAttackPaths[0]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const selectedNodeData = selectedPath?.nodes.find(n => n.id === selectedNode);

  if (!selectedPath) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Attack Paths</h1>
          <p className="text-sm text-slate-400 mt-0.5">No attack paths identified for this project.</p>
        </div>
        <div className="bg-navy-800 border border-white/8 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">Run an authorized scan and analyze attack paths to populate this view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Attack Paths</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {mockAttackPaths.length} attack paths identified · {mockAttackPaths.filter(p => p.severity === 'critical').length} critical
        </p>
      </div>

      {/* Alert */}
      <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-300">
          <strong>{mockAttackPaths.filter(p => p.severity === 'critical').length} critical attack paths</strong> detected.
          Immediate remediation required to prevent full compromise.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Attack path list (left) */}
        <div className="xl:col-span-1 space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Attack Paths</p>
          {mockAttackPaths.map(path => (
            <button
              key={path.id}
              onClick={() => { setSelectedPath(path); setSelectedNode(null); }}
              className={clsx(
                'w-full text-left p-4 rounded-xl border transition-all',
                selectedPath.id === path.id
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-navy-800 border-white/8 hover:border-white/15',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <SeverityBadge severity={path.severity} size="sm" />
                <span className={`text-sm font-bold ${path.riskScore >= 90 ? 'text-red-400' : 'text-orange-400'}`}>
                  {path.riskScore}
                </span>
              </div>
              <p className="text-xs font-medium text-white leading-tight">{path.name}</p>
              <p className="text-xs text-slate-500 mt-1.5">{path.hops} hops · {path.nodes.length} nodes</p>
            </button>
          ))}
        </div>

        {/* Graph + details (right) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Graph canvas */}
          <div className="bg-navy-800 border border-white/8 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={selectedPath.severity} />
                  <span className="text-sm font-bold text-red-400">Risk Score: {selectedPath.riskScore}</span>
                </div>
                <h2 className="text-sm font-semibold text-white">{selectedPath.name}</h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-red-400 opacity-60" style={{ borderTop: '2px dashed' }} />
                  Attack path
                </span>
                <span>{selectedPath.hops} hops</span>
              </div>
            </div>

            <div className="p-4 bg-navy-950/50">
              <AttackGraph
                nodes={selectedPath.nodes}
                edges={selectedPath.edges}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
                severity={selectedPath.severity}
              />
            </div>

            {/* Node legend */}
            <div className="px-5 py-3 border-t border-white/6 flex items-center gap-6 flex-wrap">
              {Object.entries(NODE_CONFIG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }} />
                  <span className="text-xs text-slate-500 capitalize">{type}</span>
                </div>
              ))}
              <span className="text-xs text-slate-600 ml-auto">Click nodes to inspect</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Path details */}
            <Card title="Path Details">
              <div className="space-y-3">
                {[
                  { label: 'Entry Point', value: selectedPath.entryPoint, icon: Globe },
                  { label: 'Target', value: selectedPath.target, icon: Target },
                  { label: 'Total Hops', value: `${selectedPath.hops} steps`, icon: GitBranch },
                  { label: 'Discovered', value: new Date(selectedPath.discoveredAt).toLocaleDateString(), icon: null },
                ].map(d => (
                  <div key={d.label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0 pt-0.5">{d.label}</span>
                    <span className="text-xs font-medium text-white">{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/6">
                <p className="text-xs text-slate-500 font-medium mb-2">Why This Path Is Dangerous</p>
                <p className="text-xs text-slate-400 leading-relaxed">{selectedPath.whyRisky}</p>
              </div>
            </Card>

            {/* Mitigations + node inspector */}
            <div className="space-y-4">
              <Card title="Recommended Mitigations">
                <div className="space-y-2">
                  {selectedPath.mitigations.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-5 h-5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-green-400 font-bold">{i + 1}</span>
                      </div>
                      <p className="text-xs text-slate-300">{m}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Node inspector */}
              {selectedNodeData ? (
                <div className="bg-navy-800 border border-cyan-500/20 rounded-xl p-4 animate-scale-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-cyan-500/15 border border-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-3 h-3 text-cyan-400" />
                    </div>
                    <p className="text-xs font-semibold text-cyan-300">Node Inspector</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Type</span>
                      <span className="text-xs font-medium text-white capitalize">{selectedNodeData.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Label</span>
                      <span className="text-xs font-medium text-white">{selectedNodeData.label.replace('\n', ' ')}</span>
                    </div>
                    {selectedNodeData.riskScore != null && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Risk Score</span>
                        <span className="text-xs font-bold text-red-400">{selectedNodeData.riskScore}</span>
                      </div>
                    )}
                    {selectedNodeData.severity && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Severity</span>
                        <SeverityBadge severity={selectedNodeData.severity} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-navy-800 border border-white/8 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500">Click a node in the graph to inspect it</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
