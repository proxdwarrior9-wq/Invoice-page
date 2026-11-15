import { useCallback, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from './api';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { Footer } from './components/Footer';
import { InvoicesView } from './components/InvoicesView';
import { Navbar, type ConsoleTab } from './components/Navbar';
import type {
  Invoice,
  NotificationItem,
  UserPublic,
} from './types';

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('invoices');

  const [dataLoading, setDataLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadBillingOverview = useCallback(async () => {
    setDataLoading(true);
    try {
      const overview = await api.getBillingOverview();
      setInvoices(overview.invoices);
      setNotifications(overview.notifications);
    } catch (err) {
      console.error('Failed to load billing overview:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      const token = getStoredToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
        setActiveTab(res.user.role === 'admin' ? 'admin' : 'invoices');
      } catch {
        setStoredToken(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadBillingOverview();
    }
  }, [user, loadBillingOverview]);

  async function handleAuthenticated(authenticatedUser: UserPublic) {
    setUser(authenticatedUser);
    setActiveTab(authenticatedUser.role === 'admin' ? 'admin' : 'invoices');
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore logout error
    }
    setStoredToken(null);
    setUser(null);
    setInvoices([]);
    setNotifications([]);
  }

  async function handleMarkNotificationRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch {
      // revert only on failure by refreshing
      loadBillingOverview();
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      loadBillingOverview();
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#060812] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white text-xs font-extrabold">
            SC
          </span>
          <span>Loading SkyraCloud Console...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-[#060812] text-slate-100 flex flex-col">
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllRead}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {activeTab === 'invoices' && (
          <InvoicesView
            user={user}
            invoices={invoices}
            loading={dataLoading}
          />
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPanel currentUser={user} onSyncNeeded={loadBillingOverview} />
        )}
      </main>

      <Footer />
    </div>
  );
}
