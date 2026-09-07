import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    if (email === 'demo@nexavise.io' && password === 'demo1234') {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Use the demo credentials below.');
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setEmail('demo@nexavise.io');
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-stretch">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-12 border-r border-white/6 relative overflow-hidden">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2306b6d4' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-cyan-600/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Nexavise</p>
              <p className="text-sm text-cyan-400 font-medium">Sentinel</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Continuous Attack<br />Surface Intelligence
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Discover, monitor, and prioritize your organization's external attack surface.
            Real-time vulnerability tracking and attack path analysis.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative space-y-3">
          {[
            { icon: '🔍', label: 'Automated Asset Discovery' },
            { icon: '🛡️', label: 'Continuous Vulnerability Scanning' },
            { icon: '🗺️', label: 'Attack Path Visualization' },
            { icon: '📊', label: 'Risk Scoring & Prioritization' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-2.5 bg-white/4 border border-white/8 rounded-xl backdrop-blur-sm">
              <span className="text-base">{f.icon}</span>
              <span className="text-sm text-slate-300">{f.label}</span>
              <div className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            </div>
          ))}
        </div>

        <p className="relative text-xs text-slate-600 mt-8">
          © 2026 Nexavise Security. All rights reserved.
        </p>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-cyan-600/20 border border-cyan-500/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Nexavise Sentinel</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-sm text-slate-400">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-navy-700 text-cyan-500"
                />
                <span className="text-xs text-slate-400">Remember me</span>
              </label>
              <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  Authenticating…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
            <p className="text-xs font-medium text-cyan-400 mb-2">Demo Credentials</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Email</p>
                <code className="text-xs font-mono text-slate-300">demo@nexavise.io</code>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Password</p>
                <code className="text-xs font-mono text-slate-300">demo1234</code>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="mt-3 w-full text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 py-1.5 rounded-lg transition-all"
            >
              Fill demo credentials
            </button>
          </div>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <Lock className="w-3 h-3" />
            <span>256-bit TLS encryption · SOC2 Type II compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
