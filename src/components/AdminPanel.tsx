import {
  Check,
  Edit3,
  PauseCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import type {
  Invoice,
  InvoiceStatus,
  ServiceType,
  UserPublic,
} from '../types';
import {
  formatCurrencyINR,
  formatDateShort,
  getExpiryMeta,
  toDateInputValue,
} from '../utils/format';
import { InvoiceStatusLabel } from './StatusText';

interface AdminPanelProps {
  currentUser: UserPublic;
  onSyncNeeded: () => Promise<void>;
}

type AdminSubTab = 'invoices' | 'users';

export function AdminPanel({ currentUser, onSyncNeeded }: AdminPanelProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('invoices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create Invoice Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [cUserEmail, setCUserEmail] = useState('');
  const [cServiceType, setCServiceType] = useState<ServiceType>('Minecraft');
  const [cServiceName, setCServiceName] = useState('');
  const [cPlan, setCPlan] = useState('MC Diamond 8GB');
  const [cAmount, setCAmount] = useState('599');
  const [cStatus, setCStatus] = useState<InvoiceStatus>('Unpaid');
  const [cDueDate, setCDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [cExpiryDate, setCExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [cNotes, setCNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [eAmount, setEAmount] = useState('');
  const [eStatus, setEStatus] = useState<InvoiceStatus>('Unpaid');
  const [eDueDate, setEDueDate] = useState('');
  const [eExpiryDate, setEExpiryDate] = useState('');
  const [eServiceName, setEServiceName] = useState('');
  const [ePlan, setEPlan] = useState('');
  const [eNotes, setENotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadAdminData() {
    setError(null);
    try {
      const data = await api.getAdminOverview();
      setUsers(data.users);
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.userName || '').toLowerCase().includes(q) ||
          (inv.userEmail || '').toLowerCase().includes(q) ||
          inv.serviceName.toLowerCase().includes(q) ||
          inv.plan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, search]);

  const summaryStats = useMemo(() => {
    const unpaidCount = invoices.filter((i) => i.status === 'Unpaid').length;
    const suspendedCount = invoices.filter((i) => i.status === 'Suspended').length;
    return { unpaidCount, suspendedCount };
  }, [invoices]);

  function openCreateModalForUser(userEmail?: string) {
    setCUserEmail(userEmail || '');
    setCServiceType('Minecraft');
    setCServiceName('');
    setCPlan('MC Diamond 8GB');
    setCAmount('599');
    setCStatus('Unpaid');
    setCNotes('');
    setCreateOpen(true);
  }

  async function handleCreateInvoice(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createAdminInvoice({
        userEmail: cUserEmail.trim(),
        serviceName: cServiceName.trim() || `${cServiceType}-Node`,
        serviceType: cServiceType,
        plan: cPlan.trim(),
        amount: Number(cAmount),
        status: cStatus,
        dueDate: cDueDate,
        expiryDate: cExpiryDate,
        notes: cNotes,
      });
      await Promise.all([loadAdminData(), onSyncNeeded()]);
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setCreating(false);
    }
  }

  async function handleQuickStatus(inv: Invoice, status: InvoiceStatus) {
    setBusyId(inv.id);
    setError(null);
    try {
      await api.updateAdminInvoice(inv.id, { status });
      await Promise.all([loadAdminData(), onSyncNeeded()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice status.');
    } finally {
      setBusyId(null);
    }
  }

  function openEditInvoice(inv: Invoice) {
    setEditingInvoice(inv);
    setEAmount(String(inv.amount));
    setEStatus(inv.status);
    setEDueDate(toDateInputValue(inv.dueDate));
    setEExpiryDate(toDateInputValue(inv.expiryDate));
    setEServiceName(inv.serviceName);
    setEPlan(inv.plan);
    setENotes(inv.notes);
  }

  async function handleSaveEditInvoice(e: FormEvent) {
    e.preventDefault();
    if (!editingInvoice) return;
    setSavingEdit(true);
    setError(null);
    try {
      await api.updateAdminInvoice(editingInvoice.id, {
        amount: Number(eAmount),
        status: eStatus,
        dueDate: eDueDate,
        expiryDate: eExpiryDate,
        serviceName: eServiceName,
        plan: ePlan,
        notes: eNotes,
      });
      await Promise.all([loadAdminData(), onSyncNeeded()]);
      setEditingInvoice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteInvoice(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.deleteAdminInvoice(id);
      setConfirmDeleteId(null);
      await Promise.all([loadAdminData(), onSyncNeeded()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            CONSOLE / <span className="text-[#38bdf8]">ADMIN BILLING</span>
          </p>
          <h1 className="mt-2.5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Admin Invoice Manager
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Create or delete invoices, mark payments as Paid or Suspended, and manage customer VPS
            and Minecraft expiry dates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModalForUser()}
          className="px-4 py-2.5 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      <div className="border-t border-[#161c32] mb-6" />

      {error && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] p-4">
          <p className="text-xs text-slate-400">Unpaid Invoices</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-400 tabular-nums">
            {summaryStats.unpaidCount}
          </p>
        </div>
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] p-4">
          <p className="text-xs text-slate-400">Suspended Invoices</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-400 tabular-nums">
            {summaryStats.suspendedCount}
          </p>
        </div>
      </div>

      {/* Sub-navigation & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0b1021] border border-[#19213c] w-fit overflow-x-auto">
          {(
            [
              { id: 'invoices', label: `Invoices (${invoices.length})` },
              { id: 'users', label: `Customers (${users.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                subTab === t.id ? 'bg-[#192242] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'invoices' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0b1021] border border-[#19213c]">
              {(['All', 'Paid', 'Unpaid', 'Suspended'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#192242] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, invoice, server..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b1021] border border-[#19213c] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] p-6 space-y-3">
          <div className="h-6 w-48 bg-[#141c38] rounded animate-pulse" />
          <div className="h-12 w-full bg-[#111830] rounded animate-pulse" />
        </div>
      ) : subTab === 'invoices' ? (
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#161c32] text-xs font-semibold text-slate-400">
                  <th className="py-3.5 px-4">Invoice</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Service / Plan</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141a30] text-sm">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const expiry = getExpiryMeta(inv.expiryDate);
                    const isBusy = busyId === inv.id;
                    return (
                      <tr key={inv.id} className="hover:bg-[#0f162e]/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-white whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-white">{inv.userName}</p>
                          <p className="text-[11px] text-slate-400">{inv.userEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-semibold text-white">{inv.serviceName}</p>
                          <p className="text-[11px] text-slate-400">
                            {inv.serviceType} · {inv.plan}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-xs text-slate-200 tabular-nums">
                            {formatDateShort(inv.expiryDate)}
                          </p>
                          <p
                            className={`text-[11px] tabular-nums ${
                              expiry.isExpired
                                ? 'text-rose-400'
                                : expiry.isSoon
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {expiry.label}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-white tabular-nums whitespace-nowrap">
                          {formatCurrencyINR(inv.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <InvoiceStatusLabel status={inv.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.status !== 'Paid' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickStatus(inv, 'Paid')}
                                title="Mark as Paid & Activate Service"
                                className="px-2.5 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Paid</span>
                              </button>
                            )}
                            {inv.status !== 'Suspended' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickStatus(inv, 'Suspended')}
                                title="Mark Suspended & Suspend Service"
                                className="px-2.5 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditInvoice(inv)}
                              title="Edit Invoice"
                              className="p-1.5 rounded-md border border-[#1f294a] bg-[#0e1429] hover:border-indigo-500/60 text-slate-300 hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteId === inv.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-semibold text-white cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded bg-[#161e38] text-[11px] text-slate-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(inv.id)}
                                title="Delete Invoice"
                                className="p-1.5 rounded-md border border-[#1f294a] bg-[#0e1429] hover:border-rose-500/50 text-slate-400 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#161c32] text-xs font-semibold text-slate-400">
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141a30] text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#0f162e]/70 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-semibold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">{u.email}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span
                        className={
                          u.role === 'admin'
                            ? 'font-semibold text-[#818cf8]'
                            : 'text-slate-400'
                        }
                      >
                        {u.role === 'admin' ? 'Admin' : 'Customer'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 tabular-nums">
                      {formatDateShort(u.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCreateModalForUser(u.email)}
                          className="px-2.5 py-1.5 rounded-md bg-[#6366f1]/15 hover:bg-[#6366f1]/25 border border-[#6366f1]/30 text-xs font-semibold text-indigo-300 cursor-pointer"
                        >
                          Bill User
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.updateUserRole(
                                u.id,
                                u.role === 'admin' ? 'customer' : 'admin'
                              );
                              await loadAdminData();
                            }}
                            className="px-2.5 py-1.5 rounded-md border border-[#1f294a] bg-[#0e1429] text-xs text-slate-300 hover:text-white cursor-pointer"
                          >
                            {u.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#0b1021] border border-[#1f294a] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#161c32] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Customer Invoice</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Customer Gmail / Email
                </label>
                <input
                  type="email"
                  required
                  list="skyra-customer-emails"
                  value={cUserEmail}
                  onChange={(e) => setCUserEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <datalist id="skyra-customer-emails">
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Service Type</label>
                  <select
                    value={cServiceType}
                    onChange={(e) => setCServiceType(e.target.value as ServiceType)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Minecraft">Minecraft</option>
                    <option value="VPS">VPS</option>
                    <option value="Bot">Bot</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Service Name</label>
                  <input
                    type="text"
                    required
                    value={cServiceName}
                    onChange={(e) => setCServiceName(e.target.value)}
                    placeholder="e.g. MC-SMP-01 or VPS-IN-04"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Plan</label>
                  <input
                    type="text"
                    required
                    value={cPlan}
                    onChange={(e) => setCPlan(e.target.value)}
                    placeholder="MC Diamond 8GB"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Amount (₹ INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={cAmount}
                    onChange={(e) => setCAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={cStatus}
                    onChange={(e) => setCStatus(e.target.value as InvoiceStatus)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={cDueDate}
                    onChange={(e) => setCDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    VPS/MC Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={cExpiryDate}
                    onChange={(e) => setCExpiryDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="Optional billing instructions or UPI note"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#1f294a] text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {creating ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#0b1021] border border-[#1f294a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#161c32] flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[#38bdf8]">
                  {editingInvoice.invoiceNumber}
                </p>
                <h3 className="text-lg font-bold text-white">Edit Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Service Name</label>
                  <input
                    type="text"
                    required
                    value={eServiceName}
                    onChange={(e) => setEServiceName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Plan</label>
                  <input
                    type="text"
                    required
                    value={ePlan}
                    onChange={(e) => setEPlan(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Amount (₹ INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={eAmount}
                    onChange={(e) => setEAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={eStatus}
                    onChange={(e) => setEStatus(e.target.value as InvoiceStatus)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Paid">Paid (Activates Service)</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Suspended">Suspended (Suspends Service)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={eDueDate}
                    onChange={(e) => setEDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    VPS/MC Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eExpiryDate}
                    onChange={(e) => setEExpiryDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={eNotes}
                  onChange={(e) => setENotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#070a15] border border-[#1d2645] text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 rounded-lg border border-[#1f294a] text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
