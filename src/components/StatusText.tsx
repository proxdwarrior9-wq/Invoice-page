import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { InvoiceStatus, ServiceStatus } from '../types';

export function InvoiceStatusLabel({ status }: { status: InvoiceStatus }) {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Paid</span>
      </span>
    );
  }
  if (status === 'Suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Suspended</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Unpaid</span>
    </span>
  );
}

export function ServiceStatusLabel({ status }: { status: ServiceStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Active</span>
      </span>
    );
  }
  if (status === 'Suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Suspended</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Pending Activation</span>
    </span>
  );
}
