export function formatCurrencyINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInputValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function getExpiryMeta(isoString: string): { label: string; isExpired: boolean; isSoon: boolean } {
  const target = new Date(isoString).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      label: `Expired ${Math.abs(diffDays)}d ago`,
      isExpired: true,
      isSoon: false,
    };
  }
  if (diffDays === 0) {
    return { label: 'Expires today', isExpired: false, isSoon: true };
  }
  return {
    label: `${diffDays}d remaining`,
    isExpired: false,
    isSoon: diffDays <= 5,
  };
}
