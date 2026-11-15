import { Download, FileText, Printer, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Invoice, InvoiceStatus, UserPublic } from '../types';
import { formatCurrencyINR, formatDateShort, getExpiryMeta } from '../utils/format';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { InvoiceStatusLabel } from './StatusText';

interface InvoicesViewProps {
  user: UserPublic;
  invoices: Invoice[];
  loading: boolean;
}

export function InvoicesView({
  user,
  invoices,
  loading,
}: InvoicesViewProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.serviceName.toLowerCase().includes(q) ||
          inv.plan.toLowerCase().includes(q) ||
          inv.serviceType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-16">
      {/* Breadcrumb Kicker & Page Heading — Matching Screenshot Aesthetic */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          CONSOLE / <span className="text-[#38bdf8]">BILLING</span>
        </p>
        <h1 className="mt-2.5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Invoices &amp; Receipts
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          View billing history, itemized breakdowns and receipt downloads.
        </p>
      </div>

      {/* Subtle Divider */}
      <div className="border-t border-[#161c32] mb-8" />

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-xl bg-[#0b1021] border border-[#19213c] p-6 space-y-4">
          <div className="h-5 w-48 bg-[#141c38] rounded animate-pulse" />
          <div className="h-10 w-full bg-[#111830] rounded animate-pulse" />
          <div className="h-10 w-full bg-[#111830] rounded animate-pulse" />
        </div>
      ) : invoices.length === 0 ? (
        /* Exact Empty State Card from Screenshot 1 */
        <div className="rounded-2xl bg-[#0b1021] border border-[#19213c] px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-white">No invoices on record</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Your charges and receipts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Suspended Alert Banner if user has suspended invoices */}
          {invoices.some((i) => i.status === 'Suspended') && (
            <div className="rounded-xl bg-rose-950/25 border border-rose-500/30 px-4 py-3.5">
              <p className="text-sm font-semibold text-rose-300">
                Action required: Suspended invoice on account
              </p>
              <p className="text-xs text-rose-200/80 mt-0.5">
                One or more VPS/Minecraft services are suspended due to an unpaid invoice. Once
                payment is verified by an admin, your invoice status will be updated to Paid.
              </p>
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0b1021] border border-[#19213c] w-fit">
              {(['All', 'Paid', 'Unpaid', 'Suspended'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#192242] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice or service..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b1021] border border-[#19213c] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Invoices Grid of Rounded Boxes */}
          {filteredInvoices.length === 0 ? (
            <div className="rounded-2xl bg-[#0b1021] border border-[#19213c] px-6 py-12 text-center text-sm text-slate-400">
              No invoices match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map((inv) => {
                const expiry = getExpiryMeta(inv.expiryDate);
                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl bg-[#0b1021] border border-[#19213c] hover:border-[#2a3663] transition-colors p-5 sm:p-6 flex flex-col justify-between gap-5"
                  >
                    {/* Top: Invoice # & Status */}
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold tracking-tight text-[#38bdf8]">
                          {inv.invoiceNumber}
                        </span>
                        <InvoiceStatusLabel status={inv.status} />
                      </div>

                      {/* Main Amount & Service */}
                      <div className="mt-4">
                        <p className="text-3xl font-extrabold tracking-tight text-white tabular-nums">
                          {formatCurrencyINR(inv.amount)}
                        </p>
                        <p className="mt-1.5 text-lg font-bold tracking-tight text-white truncate">
                          {inv.serviceName}
                        </p>
                        <p className="text-xs font-semibold text-slate-400 truncate">
                          {inv.serviceType} · {inv.plan}
                        </p>
                      </div>

                      {/* Metadata Rows separated by hairline divider */}
                      <div className="mt-5 pt-4 border-t border-[#151c33] space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-400">VPS / MC Expiry</span>
                          <span
                            className={`font-bold tabular-nums text-right ${
                              expiry.isExpired
                                ? 'text-rose-400'
                                : expiry.isSoon
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {formatDateShort(inv.expiryDate)} · {expiry.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-400">Issued Date</span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {formatDateShort(inv.issuedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-400">
                            {inv.paidAt ? 'Paid Date' : 'Due Date'}
                          </span>
                          <span className="font-bold text-slate-200 tabular-nums">
                            {inv.paidAt
                              ? formatDateShort(inv.paidAt)
                              : formatDateShort(inv.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-4 border-t border-[#151c33] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-[#1e2747] bg-[#0e1429] hover:border-indigo-500/60 text-xs font-bold text-slate-100 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(inv, user)}
                        title="Download PDF Invoice"
                        aria-label={`Download PDF for ${inv.invoiceNumber}`}
                        className="py-2.5 px-3.5 rounded-xl bg-[#6366f1]/15 hover:bg-[#6366f1]/25 border border-[#6366f1]/35 text-xs font-bold text-indigo-300 hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Itemized Invoice & Printable Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#0b1021] border border-[#1f294a] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#161c32] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-tight text-[#38bdf8]">
                  {selectedInvoice.invoiceNumber}
                </p>
                <h3 className="text-lg font-extrabold tracking-tight text-white mt-0.5">
                  Itemized Invoice &amp; Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141c38] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Billed To</p>
                  <p className="text-white font-semibold mt-0.5">{user.name}</p>
                  <p className="text-slate-400">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Invoice Status</p>
                  <div className="mt-1 flex justify-end">
                    <InvoiceStatusLabel status={selectedInvoice.status} />
                  </div>
                  <p className="text-slate-400 mt-1 tabular-nums">
                    {selectedInvoice.paidAt
                      ? `Paid on ${formatDateShort(selectedInvoice.paidAt)}`
                      : `Due ${formatDateShort(selectedInvoice.dueDate)}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-lg bg-[#070a15] border border-[#161c32] p-3.5 text-xs">
                <div>
                  <p className="text-slate-400">Service</p>
                  <p className="text-white font-semibold mt-0.5">
                    {selectedInvoice.serviceName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Category / Plan</p>
                  <p className="text-white font-medium mt-0.5">
                    {selectedInvoice.serviceType} · {selectedInvoice.plan}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Service Expiry Date</p>
                  <p className="text-[#38bdf8] font-semibold mt-0.5 tabular-nums">
                    {formatDateShort(selectedInvoice.expiryDate)}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="border border-[#161c32] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#080c19] text-slate-400 border-b border-[#161c32]">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-medium">Description</th>
                      <th className="py-2.5 px-3 text-right font-medium">Qty</th>
                      <th className="py-2.5 px-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141a30]">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-slate-200">{item.description}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-400 tabular-nums">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                          {formatCurrencyINR(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-3 bg-[#080c19] border-t border-[#161c32] flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Total Amount</span>
                  <span className="text-lg font-extrabold tracking-tight text-white tabular-nums">
                    {formatCurrencyINR(selectedInvoice.amount)}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300">Note: </span>
                  {selectedInvoice.notes}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#161c32] bg-[#080c19] flex flex-wrap items-center justify-between gap-2 no-print">
              {selectedInvoice.status === 'Paid' ? (
                <span className="text-xs text-emerald-400 font-semibold">
                  Payment confirmed &amp; receipt ready
                </span>
              ) : selectedInvoice.status === 'Suspended' ? (
                <span className="text-xs text-rose-400 font-semibold">
                  Invoice unpaid — service suspended
                </span>
              ) : (
                <span className="text-xs text-amber-400 font-semibold">
                  Awaiting payment confirmation
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-lg border border-[#1f294a] bg-[#0d1326] hover:border-slate-500 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadInvoicePdf(selectedInvoice, user)}
                  className="px-3.5 py-2 rounded-lg bg-[#6366f1] hover:bg-[#5558e6] text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
