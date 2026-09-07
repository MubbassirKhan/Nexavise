import React, { useState } from 'react';
import {
  Users, Shield, Plug, FileText, Settings, Plus,
  Trash2, Edit,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../components/ui/index';
import { Modal } from '../components/ui/Modal';
import { mockUsers, mockAuditLogs } from '../data/mockData';

type AdminTab = 'users' | 'integrations' | 'audit' | 'settings';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'audit', label: 'Audit Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const integrations = [
  {
    id: 'nmap', name: 'Nmap', desc: 'Network mapper for port discovery and service enumeration',
    version: '7.94', status: 'active', icon: '🔍',
  },
  {
    id: 'nuclei', name: 'Nuclei', desc: 'Fast vulnerability scanner with 7000+ templates',
    version: '3.1.4', status: 'active', icon: '⚡',
  },
  {
    id: 'jira', name: 'Jira', desc: 'Sync findings as tickets to your Jira project',
    version: undefined, status: 'inactive', icon: '📋',
  },
  {
    id: 'slack', name: 'Slack', desc: 'Real-time alerts for critical findings to Slack channels',
    version: undefined, status: 'inactive', icon: '💬',
  },
];

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Administration</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage users, integrations, and platform settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 border border-white/8 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">{mockUsers.length} members in your organization</p>
            <button onClick={() => setShowInviteModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          </div>
          <Card noPadding>
            <table className="w-full">
              <thead className="border-b border-white/6">
                <tr>
                  <th className="table-header px-4 py-3 text-left">User</th>
                  <th className="table-header px-4 py-3 text-left">Role</th>
                  <th className="table-header px-4 py-3 text-left hidden md:table-cell">Joined</th>
                  <th className="table-header px-4 py-3 text-left">Status</th>
                  <th className="table-header px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map(user => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-600/20 border border-cyan-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-cyan-400">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={clsx(
                        'text-xs px-2 py-1 rounded-full font-medium capitalize',
                        user.role === 'admin'
                          ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20'
                          : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        <span className="text-xs text-green-400">Active</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button className="btn-icon"><Edit className="w-3.5 h-3.5" /></button>
                        {user.id !== 'u1' && (
                          <button className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Role descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { role: 'Admin', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', desc: 'Full platform access. Can manage users, projects, settings, and all security data.' },
              { role: 'Analyst', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', desc: 'Can view all findings, run scans, and update finding statuses. Cannot manage users.' },
            ].map(r => (
              <div key={r.role} className="p-4 bg-navy-800 border border-white/8 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', r.color)}>{r.role}</span>
                </div>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations tab */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map(integ => (
            <div key={integ.id} className="bg-navy-800 border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integ.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{integ.name}</p>
                    {integ.version && <p className="text-xs text-slate-500">v{integ.version}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {integ.status === 'active' ? (
                    <><div className="w-2 h-2 bg-green-400 rounded-full" /><span className="text-xs text-green-400">Active</span></>
                  ) : (
                    <><div className="w-2 h-2 bg-slate-500 rounded-full" /><span className="text-xs text-slate-500">Not configured</span></>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">{integ.desc}</p>
              <div className="flex items-center gap-2">
                {integ.status === 'active' ? (
                  <>
                    <button className="btn-secondary text-xs py-1.5">Configure</button>
                    <button className="btn-ghost text-xs py-1.5 text-red-400 hover:text-red-300">Disable</button>
                  </>
                ) : (
                  <button className="btn-primary text-xs py-1.5">
                    <Plus className="w-3.5 h-3.5" /> Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs tab */}
      {activeTab === 'audit' && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/6">
                <tr>
                  <th className="table-header px-4 py-3 text-left">User</th>
                  <th className="table-header px-4 py-3 text-left">Action</th>
                  <th className="table-header px-4 py-3 text-left hidden md:table-cell">Target</th>
                  <th className="table-header px-4 py-3 text-left hidden lg:table-cell">IP</th>
                  <th className="table-header px-4 py-3 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {mockAuditLogs.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-cyan-600/20 border border-cyan-500/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-cyan-400">{log.user.charAt(0)}</span>
                        </div>
                        <span className="text-sm text-white">{log.user}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-slate-300">{log.action}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="text-xs font-mono text-slate-400">{log.target}</span>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      <span className="text-xs font-mono text-slate-500">{log.ip}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="space-y-5 max-w-2xl">
          <Card title="Organization Settings">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Organization Name</label>
                <input defaultValue="Acme Corporation" className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Default Project</label>
                <select className="input">
                  <option>Acme Corp – External Perimeter</option>
                  <option>Acme Corp – Internal Network</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Timezone</label>
                <select className="input">
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>Europe/London</option>
                  <option>Asia/Kolkata</option>
                </select>
              </div>
              <button className="btn-primary">Save Settings</button>
            </div>
          </Card>

          <Card title="Notification Settings">
            <div className="space-y-3">
              {[
                { label: 'Critical findings detected', enabled: true },
                { label: 'New attack paths discovered', enabled: true },
                { label: 'Scan completed', enabled: true },
                { label: 'Finding status changes', enabled: false },
                { label: 'Weekly digest', enabled: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-300">{n.label}</span>
                  <button
                    className={clsx(
                      'relative inline-flex h-5 w-9 rounded-full transition-colors',
                      n.enabled ? 'bg-cyan-600' : 'bg-white/15',
                    )}
                  >
                    <span className={clsx(
                      'inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5',
                      n.enabled ? 'translate-x-4' : 'translate-x-0.5',
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Danger Zone">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-red-300">Delete All Findings</p>
                  <p className="text-xs text-slate-500">Permanently delete all vulnerability findings</p>
                </div>
                <button className="btn-danger text-xs py-1.5">Delete</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-red-300">Reset Project</p>
                  <p className="text-xs text-slate-500">Remove all assets, scans, and findings</p>
                </div>
                <button className="btn-danger text-xs py-1.5">Reset</button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        subtitle="Send an invitation to join your organization"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => setShowInviteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => setShowInviteModal(false)} className="btn-primary">
              Send Invitation
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Email Address</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com" className="input" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="input">
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="p-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
            <p className="text-xs text-cyan-300">
              The invited user will receive an email with a secure link to set up their account.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
