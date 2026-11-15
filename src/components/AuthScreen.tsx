import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, setStoredToken } from '../api';
import type { UserPublic } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: UserPublic) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password);
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoEmail: string, demoPassword: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(demoEmail, demoPassword);
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060812] text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#161c32] bg-[#070913]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white text-sm font-extrabold tracking-tight">
              SC
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Skyra<span className="text-[#818cf8]">Cloud</span>
            </span>
          </div>
          <span className="text-xs font-medium text-slate-400">Client & Billing Console</span>
        </div>
      </header>

      {/* Main Auth Panel */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              CONSOLE / <span className="text-[#38bdf8]">ACCESS</span>
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Sign in to SkyraCloud' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === 'login'
                ? 'Access your invoices, PDF receipt downloads, and VPS or Minecraft expiry dates.'
                : 'Register a SkyraCloud client account to view invoices and billing receipts.'}
            </p>
          </div>

          <div className="rounded-xl bg-[#0b1021] border border-[#19213c] p-6 sm:p-7">
            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#070a15] border border-[#161c32] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#172042] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#172042] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Vihaan Sharma"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign in to Console'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials for Instant Exploration */}
            <div className="mt-6 pt-5 border-t border-[#161c32]">
              <p className="text-xs font-medium text-slate-400 mb-3">
                Quick demo sign-in
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin('vikas@skyracloud.com', 'Client@123')}
                  className="px-3 py-2 rounded-lg border border-[#1f294a] bg-[#080d1c] hover:border-indigo-500/50 text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-white">Client Account</p>
                  <p className="text-[11px] text-slate-400 truncate">vikas@skyracloud.com</p>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin('admin@skyracloud.com', 'Admin@123')}
                  className="px-3 py-2 rounded-lg border border-[#1f294a] bg-[#080d1c] hover:border-indigo-500/50 text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-[#818cf8]">Admin Console</p>
                  <p className="text-[11px] text-slate-400 truncate">admin@skyracloud.com</p>
                </button>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin('aarav@skyracloud.com', 'Client@123')}
                className="w-full mt-2 px-3 py-1.5 rounded-lg border border-[#19213c] bg-[#070a15] hover:border-slate-600 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                New customer view (no invoices on record): aarav@skyracloud.com
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#161c32] py-6 px-4 text-center text-xs text-slate-500">
        SkyraCloud provides Minecraft, VPS and Bot hosting in India with advanced DDoS protection and 24/7 support.
      </footer>
    </div>
  );
}
