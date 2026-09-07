import React, { useState } from 'react';
import { Plus, Server, Globe, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { ExposureBadge } from '../components/ui/Badges';
import { Modal, SlideOver } from '../components/ui/Modal';
import { SearchInput, Select, Card, EmptyState } from '../components/ui/index';
import { mockAssets } from '../data/mockData';
import type { Asset, AssetType } from '../types';
import { createAsset } from '../lib/api';

const TypeIcon: React.FC<{ type: AssetType; className?: string }> = ({ type, className }) => {
  const icons: Record<AssetType, React.ElementType> = {
    host: Server, domain: Globe, ip: Globe, webapp: Globe, api: Server, cloud: Server,
  };
  const Icon = icons[type];
  return <Icon className={clsx('w-4 h-4', className)} />;
};

export const AttackSurfacePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [exposureFilter, setExposureFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmAuth, setConfirmAuth] = useState(false);

  // Add asset form state
  const [newAsset, setNewAsset] = useState({ hostname: '', ip: '', type: 'host', authorized: false });

  const filtered = mockAssets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.hostname.toLowerCase().includes(q) || a.ip.includes(q) || a.technologies.some(t => t.toLowerCase().includes(q));
    const matchType = !typeFilter || a.type === typeFilter;
    const matchExposure = !exposureFilter || a.exposure === exposureFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchType && matchExposure && matchStatus;
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Attack Surface</h1>
          <p className="text-sm text-slate-400 mt-0.5">{mockAssets.length} assets tracked · {mockAssets.filter(a => a.authorized).length} authorized</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Unauthorized warning */}
      {mockAssets.some(a => !a.authorized) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <strong>{mockAssets.filter(a => !a.authorized).length} unauthorized asset(s)</strong> detected on your network. Review and authorize or remove them.
          </p>
          <button className="ml-auto btn-danger text-xs py-1">Review</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search hostname, IP, tech…" className="flex-1 min-w-48" />
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="All Types"
          options={[
            { value: 'host', label: 'Host' }, { value: 'domain', label: 'Domain' },
            { value: 'ip', label: 'IP' }, { value: 'webapp', label: 'Web App' },
            { value: 'api', label: 'API' }, { value: 'cloud', label: 'Cloud' },
          ]}
          className="w-36"
        />
        <Select
          value={exposureFilter}
          onChange={setExposureFilter}
          placeholder="All Exposure"
          options={[
            { value: 'internet', label: 'Internet' }, { value: 'dmz', label: 'DMZ' }, { value: 'internal', label: 'Internal' },
          ]}
          className="w-36"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={[
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'unknown', label: 'Unknown' },
          ]}
          className="w-32"
        />
        {(typeFilter || exposureFilter || statusFilter) && (
          <button
            onClick={() => { setTypeFilter(''); setExposureFilter(''); setStatusFilter(''); }}
            className="btn-ghost text-xs"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Asset count */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">{filtered.length} assets</span>
        {filtered.length !== mockAssets.length && (
          <span className="text-xs text-slate-600">(filtered from {mockAssets.length})</span>
        )}
      </div>

      {/* Table */}
      <Card noPadding>
        {filtered.length === 0 ? (
          <EmptyState icon={Server} title="No assets found" description="No assets match your current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/6">
                <tr>
                  <th className="table-header px-4 py-3 text-left">Asset</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Type</th>
                  <th className="table-header px-4 py-3 text-left hidden md:table-cell">Technologies</th>
                  <th className="table-header px-4 py-3 text-left hidden lg:table-cell">Ports</th>
                  <th className="table-header px-4 py-3 text-left">Exposure</th>
                  <th className="table-header px-4 py-3 text-center">Risk</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Status</th>
                  <th className="table-header px-4 py-3 text-left hidden xl:table-cell">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr
                    key={asset.id}
                    className="table-row cursor-pointer"
                    onClick={() => { setSelectedAsset(asset); setShowDrawer(true); }}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          asset.authorized ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-red-500/10 border border-red-500/20',
                        )}>
                          <TypeIcon type={asset.type} className={asset.authorized ? 'text-cyan-400' : 'text-red-400'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-white">{asset.hostname}</p>
                            {!asset.authorized && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-500/15 text-red-400 border border-red-500/20 rounded font-medium">
                                Unauthorized
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{asset.ip}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className="text-xs text-slate-400 capitalize bg-white/5 px-2 py-1 rounded">{asset.type}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {asset.technologies.slice(0, 2).map(t => (
                          <span key={t} className="text-xs text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                        {asset.technologies.length > 2 && (
                          <span className="text-xs text-slate-500">+{asset.technologies.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {asset.ports.filter(p => p.state === 'open').slice(0, 3).map(p => (
                          <span key={p.number} className="text-xs font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {p.number}/{p.protocol}
                          </span>
                        ))}
                        {asset.ports.filter(p => p.state === 'open').length > 3 && (
                          <span className="text-xs text-slate-500">+{asset.ports.filter(p => p.state === 'open').length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <ExposureBadge exposure={asset.exposure} />
                    </td>
                    <td className="table-cell text-center">
                      <span className={`text-sm font-bold ${
                        asset.riskScore >= 90 ? 'text-red-400' :
                        asset.riskScore >= 70 ? 'text-orange-400' :
                        asset.riskScore >= 50 ? 'text-yellow-400' : 'text-green-400'
                      }`}>{asset.riskScore}</span>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        asset.status === 'active' ? 'text-green-400 bg-green-500/10' :
                        asset.status === 'inactive' ? 'text-slate-400 bg-white/5' : 'text-yellow-400 bg-yellow-500/10',
                      )}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="table-cell hidden xl:table-cell">
                      <span className="text-xs text-slate-500">
                        {new Date(asset.lastSeen).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Asset Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setConfirmAuth(false); }}
        title="Add Asset"
        subtitle="Add a new asset to your attack surface inventory"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={async () => {
                if (!confirmAuth) { setConfirmAuth(true); return; }
                if (!newAsset.hostname.trim() || !newAsset.authorized) return;
                try {
                  const created = await createAsset({
                    projectId: 'proj-1', hostname: newAsset.hostname, ip: newAsset.ip || null,
                    type: newAsset.type, authorized: true, status: 'active', exposure: 'internet',
                    technologies: [], ports: [], criticality: 3, tags: [],
                  });
                  mockAssets.push(created);
                  setSelectedAsset(created);
                  setShowAddModal(false);
                  setConfirmAuth(false);
                  setNewAsset({ hostname: '', ip: '', type: 'host', authorized: false });
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : 'Unable to add asset');
                }
              }}
              className={confirmAuth ? 'btn-primary' : 'btn-secondary'}
            >
              {confirmAuth ? <><CheckCircle className="w-4 h-4" /> Confirm & Add Asset</> : 'Continue →'}
            </button>
          </div>
        }
      >
        {!confirmAuth ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Hostname / Domain</label>
              <input type="text" value={newAsset.hostname} onChange={e => setNewAsset(p => ({ ...p, hostname: e.target.value }))}
                placeholder="e.g. api.example.com" className="input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">IP Address (optional)</label>
              <input type="text" value={newAsset.ip} onChange={e => setNewAsset(p => ({ ...p, ip: e.target.value }))}
                placeholder="e.g. 10.0.0.1" className="input" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Asset Type</label>
              <select value={newAsset.type} onChange={e => setNewAsset(p => ({ ...p, type: e.target.value }))} className="input">
                <option value="host">Host / Server</option>
                <option value="domain">Domain</option>
                <option value="ip">IP Address</option>
                <option value="webapp">Web Application</option>
                <option value="api">API Endpoint</option>
                <option value="cloud">Cloud Resource</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-300">Authorization Required</p>
                <p className="text-sm text-slate-400 mt-1">
                  You are about to add <strong className="text-white">{newAsset.hostname || 'this asset'}</strong> to the authorized inventory.
                  Ensure you have written permission to scan this target.
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={newAsset.authorized} onChange={e => setNewAsset(p => ({ ...p, authorized: e.target.checked }))}
                className="mt-0.5 w-4 h-4" />
              <span className="text-sm text-slate-300">
                I confirm I am authorized to scan this asset and I accept responsibility for any scanning activity.
              </span>
            </label>
          </div>
        )}
      </Modal>

      {/* Asset Details Drawer */}
      <SlideOver
        isOpen={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedAsset(null); }}
        title={selectedAsset?.hostname ?? ''}
        subtitle={selectedAsset?.ip}
        width="lg"
      >
        {selectedAsset && (
          <div className="p-6 space-y-6">
            {/* Risk & exposure */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy-900 border border-white/8 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">Risk Score</p>
                <span className={`text-3xl font-bold ${
                  selectedAsset.riskScore >= 90 ? 'text-red-400' :
                  selectedAsset.riskScore >= 70 ? 'text-orange-400' : 'text-yellow-400'
                }`}>{selectedAsset.riskScore}</span>
              </div>
              <div className="bg-navy-900 border border-white/8 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">Exposure</p>
                <ExposureBadge exposure={selectedAsset.exposure} />
              </div>
            </div>

            {/* Authorization */}
            <div className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border',
              selectedAsset.authorized
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20',
            )}>
              {selectedAsset.authorized
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span className={`text-sm font-medium ${selectedAsset.authorized ? 'text-green-300' : 'text-red-300'}`}>
                {selectedAsset.authorized ? 'Authorized asset' : 'UNAUTHORIZED — Review immediately'}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {[
                { label: 'Type', value: selectedAsset.type },
                { label: 'OS', value: selectedAsset.os ?? 'Unknown' },
                { label: 'Status', value: selectedAsset.status },
                { label: 'Last Seen', value: new Date(selectedAsset.lastSeen).toLocaleString() },
              ].map(d => (
                <div key={d.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500">{d.label}</span>
                  <span className="text-xs text-white capitalize">{d.value}</span>
                </div>
              ))}
            </div>

            {/* Technologies */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Technologies</p>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.technologies.map(t => (
                  <span key={t} className="text-xs bg-white/8 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300">{t}</span>
                ))}
              </div>
            </div>

            {/* Open ports */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Open Ports & Services</p>
              <div className="space-y-2">
                {selectedAsset.ports.filter(p => p.state === 'open').map(port => (
                  <div key={port.number} className="flex items-center gap-3 px-3 py-2 bg-white/4 border border-white/6 rounded-lg">
                    <span className="font-mono text-sm text-cyan-400 font-medium w-16">{port.number}/{port.protocol}</span>
                    <span className="text-sm text-slate-300 flex-1">{port.service}</span>
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">open</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Finding summary */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Findings</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Critical', count: selectedAsset.criticalCount, color: 'text-red-400' },
                  { label: 'High', count: selectedAsset.highCount, color: 'text-orange-400' },
                  { label: 'Medium', count: selectedAsset.mediumCount, color: 'text-yellow-400' },
                  { label: 'Low', count: selectedAsset.lowCount, color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="text-center py-3 bg-white/4 border border-white/6 rounded-lg">
                    <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {selectedAsset.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAsset.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
};
