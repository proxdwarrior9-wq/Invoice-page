import type {
  Invoice,
  InvoiceStatus,
  NotificationItem,
  ServiceStatus,
  ServiceSubscription,
  ServiceType,
  UserPublic,
  UserRole,
} from './types';

const TOKEN_STORAGE_KEY = 'skyra_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getMe: () => apiRequest<{ user: UserPublic }>('/api/auth/me'),

  login: (email: string, password: string) =>
    apiRequest<{ user: UserPublic; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    apiRequest<{ user: UserPublic; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () =>
    apiRequest<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getBillingOverview: () =>
    apiRequest<{
      invoices: Invoice[];
      services: ServiceSubscription[];
      notifications: NotificationItem[];
    }>('/api/billing/overview'),

  markNotificationRead: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    apiRequest<{ ok: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  // Admin endpoints
  getAdminOverview: () =>
    apiRequest<{
      users: UserPublic[];
      invoices: Invoice[];
      services: (ServiceSubscription & { userName?: string; userEmail?: string })[];
    }>('/api/admin/overview'),

  createAdminInvoice: (payload: {
    userEmail: string;
    serviceName: string;
    serviceType: ServiceType;
    plan: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
    expiryDate: string;
    notes?: string;
  }) =>
    apiRequest<{ invoice: Invoice }>('/api/admin/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminInvoice: (
    id: string,
    payload: {
      status?: InvoiceStatus;
      amount?: number;
      dueDate?: string;
      expiryDate?: string;
      serviceName?: string;
      plan?: string;
      notes?: string;
    }
  ) =>
    apiRequest<{ invoice: Invoice }>(`/api/admin/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAdminInvoice: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/admin/invoices/${id}`, {
      method: 'DELETE',
    }),

  updateAdminService: (
    id: string,
    payload: {
      status?: ServiceStatus;
      expiryDate?: string;
      specs?: string;
      ipAddress?: string;
    }
  ) =>
    apiRequest<{ service: ServiceSubscription }>(`/api/admin/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateUserRole: (id: string, role: UserRole) =>
    apiRequest<{ user: UserPublic }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};
