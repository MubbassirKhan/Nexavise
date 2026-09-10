import React, { useEffect, useRef, useState } from 'react';
import { Plus, ScanLine, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { ScanStatusBadge } from '../components/ui/Badges';
import { Card, ProgressBar } from '../components/ui/index';
import { Modal } from '../components/ui/Modal';
import { cancelScan, createScan, getAssets, getScans } from '../lib/api';
import type { Asset, Project, Scan } from '../types';
import { useOutletContext } from 'react-router-dom';

interface ScanCenterContext {
  selectedProject: Project;
}

export const ScanCenterPage: React.FC = () => {
  const { selectedProject } = useOutletContext<ScanCenterContext>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const previousStatuses = useRef<Record<string, Scan['status']>>({});
  const [form, setForm] = useState({
    assetId: '',
    scanner: 'nuclei',
    portRange: '1-10000',
    timing: 'T3',
    scanType: 'SYN',
    templates: ['cves', 'misconfigs'],
    severity: ['critical', 'high', 'medium'],
    authorized: false,
  });

  const selectedAsset = assets.find(a => a.id === form.assetId);

  const applyScans = (items: Scan[]) => {
    const completedScan = items.some(scan =>
      previousStatuses.current[scan.id] &&
      ['completed', 'failed', 'cancelled'].includes(scan.status) &&
      ['running', 'pending'].includes(previousStatuses.current[scan.id]),
    );
    previousStatuses.current = Object.fromEntries(items.map(scan => [scan.id, scan.status]));
    setScans(items);
    if (completedScan) window.dispatchEvent(new Event('scan-completed'));
  };

  const loadScanData = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const [scanItems, assetItems] = await Promise.all([
        getScans(selectedProject.id),
        getAssets(selectedProject.id),
      ]);
      applyScans(scanItems);
      setAssets(assetItems);
    } catch {
      setScans([]);
      setAssets([]);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshScans = async () => {
    try {
      applyScans(await getScans(selectedProject.id));
    } catch { }
  };

  useEffect(() => {
    previousStatuses.current = {};
    setForm(previous => ({ ...previous, assetId: '', authorized: false }));
    void loadScanData();
  }, [selectedProject.id]);

  useEffect(() => {
    if (!scans.some(scan => scan.status === 'running' || scan.status === 'pending')) return;
    const interval = window.setInterval(() => void refreshScans(), 3000);
    return () => window.clearInterval(interval);
  }, [scans, selectedProject.id]);

  const handleCreate = async () => {
    if (step === 'form') { setStep('confirm'); return; }
    if (!selectedAsset || !form.authorized) return;
    try {
      await createScan({
        projectId: selectedAsset.projectId, assetId: selectedAsset.id, scanner: form.scanner,
        options: { portRange: form.portRange, timing: form.timing, scanType: form.scanType, templates: form.templates, severity: form.severity },
      });
      await loadScanData();
      setShowCreateModal(false);
      setStep('form');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to start scan');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const runningScans = scans.filter(s => s.status === 'running' || s.status === 'pending');
  const historyScans = scans.filter(s => s.status !== 'running' && s.status !== 'pending');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Scan Center</h1>
          <p className="text-sm text-slate-400 mt-0.5">{scans.length} total scans · {runningScans.length} running</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Scan
        </button>
      </div>

      {isLoading && (
        <Card>
          <p className="text-sm text-slate-400">Loading scan data...</p>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">Unable to load scan data. Please check the backend connection.</p>
        </div>
      )}

      {/* Running scans */}
      {!isLoading && !error && runningScans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Active Scans</h2>
          <div className="space-y-3">
            {runningScans.map(scan => (
              <div key={scan.id} className="bg-navy-800 border border-blue-500/20 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/15 border border-blue-500/20 rounded-lg flex items-center justify-center">
                      <ScanLine className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{scan.assetHostname}</p>
                      <p className="text-xs text-slate-500 capitalize">{scan.scanner} scanner · started {new Date(scan.startedAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScanStatusBadge status={scan.status} />
                    <button className="btn-icon" onClick={async () => {
                      try {
                        await cancelScan(scan.id);
                        await refreshScans();
                      } catch {
                        setError(true);
                      }
                    }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs font-semibold text-white">{scan.progress}%</span>
                  </div>
                  <ProgressBar value={scan.progress} color="bg-blue-500" />
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    {scan.options.templates && <span>Templates: {scan.options.templates.join(', ')}</span>}
                    {scan.options.severity && <span>Severity: {scan.options.severity.join(', ')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan History */}
      {!isLoading && !error && <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Scan History</h2>
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/6">
                <tr>
                  <th className="table-header px-4 py-3 text-left">Target Asset</th>
                  <th className="table-header px-4 py-3 text-left hidden sm:table-cell">Scanner</th>
                  <th className="table-header px-4 py-3 text-left">Status</th>
                  <th className="table-header px-4 py-3 text-center hidden md:table-cell">Findings</th>
                  <th className="table-header px-4 py-3 text-center hidden md:table-cell">New</th>
                  <th className="table-header px-4 py-3 text-left hidden lg:table-cell">Duration</th>
                  <th className="table-header px-4 py-3 text-left hidden lg:table-cell">Started</th>
                  <th className="table-header px-4 py-3 text-left hidden xl:table-cell">By</th>
                </tr>
              </thead>
              <tbody>
                {historyScans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">No scan history available.</td>
                  </tr>
                ) : historyScans.map(scan => (
                  <tr key={scan.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          scan.scanner === 'nuclei'
                            ? 'bg-purple-500/10 border border-purple-500/20'
                            : 'bg-cyan-500/10 border border-cyan-500/20',
                        )}>
                          <ScanLine className={`w-3.5 h-3.5 ${scan.scanner === 'nuclei' ? 'text-purple-400' : 'text-cyan-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{scan.assetHostname}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell">
                      <span className={clsx(
                        'text-xs px-2 py-1 rounded font-medium capitalize',
                        scan.scanner === 'nuclei'
                          ? 'text-purple-400 bg-purple-500/10'
                          : 'text-cyan-400 bg-cyan-500/10',
                      )}>
                        {scan.scanner}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <ScanStatusBadge status={scan.status} />
                        {scan.status === 'failed' && (
                          <p className="text-xs text-red-400 mt-1">Connection timeout</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center hidden md:table-cell">
                      <span className="text-sm font-semibold text-white">{scan.findingsCount ?? '—'}</span>
                    </td>
                    <td className="table-cell text-center hidden md:table-cell">
                      {scan.newFindings != null ? (
                        <span className="text-sm font-semibold text-orange-400">+{scan.newFindings}</span>
                      ) : '—'}
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{formatDuration(scan.duration)}</span>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{new Date(scan.startedAt).toLocaleString()}</span>
                    </td>
                    <td className="table-cell hidden xl:table-cell">
                      <span className="text-xs text-slate-400">{scan.createdBy}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>}

      {/* Create Scan Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setStep('form'); }}
        title={step === 'form' ? 'Create New Scan' : 'Confirm Authorization'}
        subtitle={step === 'form' ? 'Configure your scan options' : 'Verify you are authorized to scan this target'}
        size="md"
        footer={
          <div className="flex items-center justify-between">
            <button onClick={() => { if (step === 'confirm') setStep('form'); else setShowCreateModal(false); }} className="btn-ghost">
              {step === 'confirm' ? '← Back' : 'Cancel'}
            </button>
            <button
              onClick={handleCreate}
              disabled={step === 'confirm' && !form.authorized}
              className={step === 'confirm' ? 'btn-primary' : 'btn-primary'}
            >
              {step === 'form' ? 'Continue →' : <><CheckCircle className="w-4 h-4" /> Start Scan</>}
            </button>
          </div>
        }
      >
        {step === 'form' ? (
          <div className="space-y-4">
            {/* Target */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Target Asset *</label>
              <select value={form.assetId} onChange={e => setForm(p => ({ ...p, assetId: e.target.value }))} className="input">
                <option value="">Select authorized asset…</option>
                {assets.filter(a => a.authorized).map(a => (
                  <option key={a.id} value={a.id}>{a.hostname} ({a.ip})</option>
                ))}
              </select>
            </div>

            {/* Scanner */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Scanner</label>
              <div className="grid grid-cols-2 gap-3">
                {(['nmap', 'nuclei'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, scanner: s }))}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                      form.scanner === s
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                        : 'bg-white/4 border-white/10 text-slate-400 hover:border-white/20',
                    )}
                  >
                    <ScanLine className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold capitalize">{s}</p>
                      <p className="text-xs opacity-60">{s === 'nmap' ? 'Port/service scan' : 'Vuln templates'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scanner-specific options */}
            {form.scanner === 'nmap' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Port Range</label>
                  <input value={form.portRange} onChange={e => setForm(p => ({ ...p, portRange: e.target.value }))}
                    placeholder="1-65535" className="input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Timing</label>
                  <select value={form.timing} onChange={e => setForm(p => ({ ...p, timing: e.target.value }))} className="input">
                    <option value="T1">T1 (Sneaky)</option>
                    <option value="T2">T2 (Polite)</option>
                    <option value="T3">T3 (Normal)</option>
                    <option value="T4">T4 (Aggressive)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Template Categories</label>
                <div className="grid grid-cols-2 gap-2">
                  {['cves', 'misconfigs', 'exposed-panels', 'exposures', 'takeovers', 'technologies'].map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.templates.includes(t)}
                        onChange={e => setForm(p => ({
                          ...p,
                          templates: e.target.checked ? [...p.templates, t] : p.templates.filter(x => x !== t),
                        }))}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-xs text-slate-300 capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Severity filter */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Severity Filter</label>
              <div className="flex flex-wrap gap-2">
                {['critical', 'high', 'medium', 'low', 'info'].map(s => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.severity.includes(s)}
                      onChange={e => setForm(p => ({
                        ...p,
                        severity: e.target.checked ? [...p.severity, s] : p.severity.filter(x => x !== s),
                      }))}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-xs text-slate-300 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-300">Authorization Required</p>
                  <p className="text-sm text-slate-400 mt-1">
                    You are about to initiate a <strong className="text-white capitalize">{form.scanner}</strong> scan against:
                  </p>
                  <div className="mt-2 p-2 bg-black/30 rounded-lg">
                    <p className="text-sm font-mono text-white">{selectedAsset?.hostname ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{selectedAsset?.ip}</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">Ensure you have explicit written authorization to scan this target. Unauthorized scanning may violate laws and regulations.</p>
                </div>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/4 transition-colors">
              <input
                type="checkbox"
                checked={form.authorized}
                onChange={e => setForm(p => ({ ...p, authorized: e.target.checked }))}
                className="mt-0.5 w-4 h-4"
              />
              <span className="text-sm text-slate-300">
                I confirm I am authorized to scan <strong className="text-white">{selectedAsset?.hostname}</strong> and I accept responsibility for this scanning activity.
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
};
