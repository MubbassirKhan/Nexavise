import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, User, LogOut, Settings, HelpCircle, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import type { Project } from '../../types';
import { mockNotifications } from '../../data/mockData';
import { logout } from '../../lib/api';

interface NavbarProps {
  projects: Project[];
  selectedProject: Project;
  onProjectChange: (p: Project) => void;
  user: { name: string; email: string; role: string };
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects, selectedProject, onProjectChange, user, onMenuToggle,
}) => {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const navigate = useNavigate();

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <header className="h-14 bg-navy-900/90 border-b border-white/8 flex items-center px-4 gap-4 sticky top-0 z-20 backdrop-blur-sm">
      {/* Mobile menu */}
      <button onClick={onMenuToggle} className="lg:hidden btn-icon">
        <Menu className="w-4 h-4" />
      </button>

      {/* Project selector */}
      <div className="relative">
        <button
          onClick={() => { setShowProjectMenu(!showProjectMenu); setShowUserMenu(false); setShowNotifs(false); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg transition-colors"
        >
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          <span className="text-sm font-medium text-slate-300 max-w-48 truncate">{selectedProject.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>
        {showProjectMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
            <div className="absolute top-full left-0 mt-2 w-72 bg-navy-800 border border-white/12 rounded-xl shadow-2xl z-20 py-1 animate-scale-in">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-2">Projects</p>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onProjectChange(p); setShowProjectMenu(false); }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/6 transition-colors',
                    p.id === selectedProject.id && 'bg-cyan-500/10',
                  )}
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', p.riskScore >= 70 ? 'bg-red-400' : p.riskScore >= 50 ? 'bg-orange-400' : 'bg-green-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.assetCount} assets · Risk {p.riskScore}</p>
                  </div>
                  {p.id === selectedProject.id && <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); setShowProjectMenu(false); }}
          className="btn-icon relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifs && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
            <div className="absolute right-0 top-full mt-2 w-80 bg-navy-800 border border-white/12 rounded-xl shadow-2xl z-20 animate-scale-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <span className="text-xs text-slate-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {mockNotifications.map(n => (
                  <div key={n.id} className={clsx('px-4 py-3 border-b border-white/5 hover:bg-white/4 transition-colors', !n.read && 'bg-blue-500/5')}>
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        n.type === 'error' ? 'bg-red-400' : n.type === 'warning' ? 'bg-yellow-400' : n.type === 'success' ? 'bg-green-400' : 'bg-blue-400',
                      )} />
                      <div>
                        <p className="text-xs font-medium text-white">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-600 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); setShowProjectMenu(false); }}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/6 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 bg-cyan-600/20 border border-cyan-500/30 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-cyan-400">{user.name.charAt(0)}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-slate-300">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
        </button>
        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-navy-800 border border-white/12 rounded-xl shadow-2xl z-20 py-1 animate-scale-in">
              <div className="px-4 py-3 border-b border-white/6">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
                <span className="inline-flex mt-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-full capitalize">{user.role}</span>
              </div>
              <button onClick={() => { navigate('/admin'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition-colors">
                <User className="w-4 h-4" /> Profile
              </button>
              <button onClick={() => { navigate('/admin'); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition-colors">
                <Settings className="w-4 h-4" /> Settings
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/6 transition-colors">
                <HelpCircle className="w-4 h-4" /> Help
              </button>
              <div className="h-px bg-white/6 my-1" />
              <button
                onClick={async () => {
                  try { await logout(); } catch { /* Clear the local session even if the API is unavailable. */ }
                  localStorage.removeItem('nexavise_access_token');
                  localStorage.removeItem('nexavise_user');
                  navigate('/login');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
