export type UserRole = 'admin' | 'customer';

export type ServiceType = 'VPS' | 'Minecraft' | 'Bot';

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Suspended';

export type ServiceStatus = 'Active' | 'Suspended' | 'Pending';

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ServiceSubscription {
  id: string;
  userId: string;
  name: string;
  type: ServiceType;
  plan: string;
  specs: string;
  node: string;
  ipAddress: string;
  priceMonthly: number;
  expiryDate: string;
  status: ServiceStatus;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  serviceId: string | null;
  serviceName: string;
  serviceType: ServiceType;
  plan: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  expiryDate: string;
  items: InvoiceLineItem[];
  notes: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
