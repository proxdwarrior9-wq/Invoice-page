import { Bell, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NotificationItem, UserPublic } from '../types';
import { formatRelativeTime } from '../utils/format';

export type ConsoleTab = 'invoices' | 'admin';

interface NavbarProps {
  user: UserPublic;
  activeTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  activeTab,
  onSelectTab,
  notifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onLogout,
}: NavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const initial = (user.name?.trim()[0] || user.email[0] || 'U').toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: ConsoleTab; label: string }[] = [
    { id: 'invoices', label: 'Invoices' },
    ...(user.role === 'admin' ? [{ id: 'admin' as ConsoleTab, label: 'Admin Panel' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070913]/95 backdrop-blur-md border-b border-[#161c32] no-print">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('invoices')}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
        >
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white text-sm font-extrabold tracking-tight shadow-sm">
            SC
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Skyra<span className="text-[#818cf8]">Cloud</span>
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:text-white ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[#6366f1]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Notification Bell, Avatar & Mobile Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setAccountOpen(false);
              }}
              aria-label="Open notifications"
              className="relative w-10 h-10 rounded-lg flex items-center justify-center text-slate-200 hover:bg-[#11172d] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Bell className="w-5 h-5 fill-current" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#6366f1] text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[320px] sm:w-[360px] max-h-[440px] overflow-y-auto rounded-xl bg-[#161821] border border-[#262b3d] shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-[#24293b] flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-xs font-medium text-[#818cf8] hover:text-indigo-300 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    You have no notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#24293b]">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3.5 transition-colors ${
                          notif.read ? 'bg-[#161821] opacity-75' : 'bg-[#1a1d28]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white leading-snug">
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="text-[11px] font-medium text-[#38bdf8] shrink-0">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                          <span>{formatRelativeTime(notif.createdAt)}</span>
                          {!notif.read ? (
                            <button
                              type="button"
                              onClick={() => onMarkNotificationRead(notif.id)}
                              className="text-slate-300 hover:text-white font-medium cursor-pointer"
                            >
                              Mark as read
                            </button>
                          ) : (
                            <span className="text-slate-500">Read</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Avatar Pill */}
          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => {
                setAccountOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-full border border-[#263052] bg-[#0c1122] p-1 pr-1.5 hover:border-indigo-500/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span className="w-7 h-7 rounded-full bg-[#6366f1] text-white text-xs font-bold flex items-center justify-center">
                {initial}
              </span>
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0e1428] border border-[#1f2847] shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3.5 border-b border-[#1c2440]">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#38bdf8]">
                    {user.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{user.role === 'admin' ? 'Administrator Account' : 'Client Account'}</span>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden w-10 h-10 rounded-lg border border-[#1f2744] bg-[#0c1122] flex items-center justify-center text-slate-200 hover:border-slate-600 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#161c32] bg-[#080c1a] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#121936] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-[#0e1428]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
