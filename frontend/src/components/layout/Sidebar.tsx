import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Globe, ScanLine, Bug, GitBranch, FileText,
  Settings, ChevronLeft, ChevronRight, Shield, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attack-surface', icon: Globe, label: 'Attack Surface' },
  { to: '/scan-center', icon: ScanLine, label: 'Scan Center' },
  { to: '/vulnerabilities', icon: Bug, label: 'Vulnerabilities' },
  { to: '/attack-paths', icon: GitBranch, label: 'Attack Paths' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/admin', icon: Settings, label: 'Administration' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose, isAdmin }) => {
  const navigate = useNavigate();
  const visibleNavItems = isAdmin ? navItems : navItems.filter(item => item.to !== '/admin');

  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onMobileClose} />}
      <aside className={clsx(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-navy-900 border-r border-white/8',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 cursor-pointer"
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-8 h-8 bg-cyan-600/20 border border-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-cyan-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight">Nexavise</p>
            <p className="text-xs text-cyan-400 font-medium leading-tight">Sentinel</p>
          </div>
        )}
      </div>

      <div className="h-px bg-white/6 mx-3" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/6 border border-transparent',
              collapsed && 'justify-center',
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="h-px bg-white/6 mx-3" />

      {/* Scanner status */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-300 truncate">Scan Center</p>
              <p className="text-xs text-slate-500 truncate">View current scan activity</p>
            </div>
            <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 border-t border-white/6 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      </aside>
    </>
  );
};
