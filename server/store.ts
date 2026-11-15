import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  NotificationItem,
  ServiceStatus,
  ServiceSubscription,
  ServiceType,
  UserPublic,
  UserRole,
} from '../src/types';

export interface StoredUser extends UserPublic {
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  services: ServiceSubscription[];
  invoices: Invoice[];
  notifications: NotificationItem[];
  invoiceSeq: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'skyracloud-db.json');
const TOKEN_SECRET = process.env.SESSION_SECRET || 'skyracloud-dev-hmac-secret-key-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signAuthToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

function addDaysIso(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function createInitialDb(): DatabaseSchema {
  const now = new Date();
  const fiveDaysAgo = addDaysIso(now, -5);
  const twelveDaysAgo = addDaysIso(now, -12);
  const twoDaysAgo = addDaysIso(now, -2);

  const adminId = 'usr_admin_1';
  const clientId = 'usr_client_1';
  const emptyClientId = 'usr_client_2';

  const users: StoredUser[] = [
    {
      id: adminId,
      name: 'Vikram Mehta',
      email: 'admin@skyracloud.com',
      role: 'admin',
      passwordHash: hashPassword('Admin@123'),
      createdAt: twelveDaysAgo,
    },
    {
      id: clientId,
      name: 'Vihaan Sharma',
      email: 'vikas@skyracloud.com',
      role: 'customer',
      passwordHash: hashPassword('Client@123'),
      createdAt: twelveDaysAgo,
    },
    {
      id: emptyClientId,
      name: 'Aarav Patel',
      email: 'aarav@skyracloud.com',
      role: 'customer',
      passwordHash: hashPassword('Client@123'),
      createdAt: twoDaysAgo,
    },
  ];

  const services: ServiceSubscription[] = [
    {
      id: 'srv_bot_1',
      userId: clientId,
      name: 'Bot-1',
      type: 'Bot',
      plan: 'Bot Node 1GB',
      specs: '1 GB RAM · 1 vCPU · 10 GB NVMe · 24/7 Uptime',
      node: 'Mumbai IN-BOT1',
      ipAddress: '103.189.44.12:8080',
      priceMonthly: 30,
      expiryDate: addDaysIso(now, 25),
      status: 'Active',
      createdAt: fiveDaysAgo,
    },
    {
      id: 'srv_mc_1',
      userId: clientId,
      name: 'MC-SMP-01',
      type: 'Minecraft',
      plan: 'MC Diamond 8GB',
      specs: '8 GB DDR5 · 4 vCPU Ryzen 9 · 60 GB NVMe · DDoS Shield',
      node: 'Mumbai IN-02',
      ipAddress: 'play.skyracloud.in:25565',
      priceMonthly: 599,
      expiryDate: addDaysIso(now, 18),
      status: 'Active',
      createdAt: twelveDaysAgo,
    },
    {
      id: 'srv_vps_1',
      userId: clientId,
      name: 'VPS-IN-04',
      type: 'VPS',
      plan: 'VPS KVM-4',
      specs: '4 GB ECC RAM · 2 vCPU EPYC · 50 GB NVMe · 1 Gbps Unmetered',
      node: 'Mumbai IN-VPS1',
      ipAddress: '103.189.45.88',
      priceMonthly: 649,
      expiryDate: addDaysIso(now, -2),
      status: 'Suspended',
      createdAt: addDaysIso(now, -32),
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_1003',
      invoiceNumber: 'INV-2026-1003',
      userId: clientId,
      serviceId: 'srv_vps_1',
      serviceName: 'VPS-IN-04',
      serviceType: 'VPS',
      plan: 'VPS KVM-4',
      amount: 649,
      currency: 'INR',
      status: 'Suspended',
      issuedAt: addDaysIso(now, -7),
      dueDate: addDaysIso(now, -2),
      paidAt: null,
      expiryDate: addDaysIso(now, -2),
      items: [
        {
          description: 'VPS KVM-4 Monthly Renewal (Mumbai IN-VPS1)',
          qty: 1,
          unitPrice: 649,
          total: 649,
        },
      ],
      notes: 'Invoice overdue — service automatically suspended until payment confirmation.',
    },
    {
      id: 'inv_1002',
      invoiceNumber: 'INV-2026-1002',
      userId: clientId,
      serviceId: 'srv_bot_1',
      serviceName: 'Bot-1',
      serviceType: 'Bot',
      plan: 'Bot Node 1GB',
      amount: 30,
      currency: 'INR',
      status: 'Paid',
      issuedAt: fiveDaysAgo,
      dueDate: addDaysIso(now, -3),
      paidAt: fiveDaysAgo,
      expiryDate: addDaysIso(now, 25),
      items: [
        {
          description: 'Bot Node 1GB Hosting — Bot-1 (30 Days)',
          qty: 1,
          unitPrice: 30,
          total: 30,
        },
      ],
      notes: 'Paid via UPI · Verified by SkyraCloud Billing.',
    },
    {
      id: 'inv_1001',
      invoiceNumber: 'INV-2026-1001',
      userId: clientId,
      serviceId: 'srv_mc_1',
      serviceName: 'MC-SMP-01',
      serviceType: 'Minecraft',
      plan: 'MC Diamond 8GB',
      amount: 599,
      currency: 'INR',
      status: 'Paid',
      issuedAt: twelveDaysAgo,
      dueDate: addDaysIso(now, -10),
      paidAt: twelveDaysAgo,
      expiryDate: addDaysIso(now, 18),
      items: [
        {
          description: 'MC Diamond 8GB — MC-SMP-01 (Mumbai IN-02)',
          qty: 1,
          unitPrice: 599,
          total: 599,
        },
      ],
      notes: 'Paid via Razorpay / UPI.',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'ntf_1',
      userId: clientId,
      title: 'New invoice created',
      message: 'A new invoice was created on your account with total amount: ₹30.00.',
      read: false,
      createdAt: fiveDaysAgo,
    },
    {
      id: 'ntf_2',
      userId: clientId,
      title: 'Invoice marked as Paid',
      message: 'Invoice INV-2026-1002 (₹30.00) has been confirmed as Paid.',
      read: false,
      createdAt: fiveDaysAgo,
    },
    {
      id: 'ntf_3',
      userId: clientId,
      title: 'Service activated',
      message: 'Your service Bot-1 has been activated.',
      read: false,
      createdAt: fiveDaysAgo,
    },
    {
      id: 'ntf_4',
      userId: clientId,
      title: 'Invoice overdue — service suspended',
      message: 'Invoice INV-2026-1003 for VPS-IN-04 (₹649.00) is unpaid and marked Suspended.',
      read: false,
      createdAt: twoDaysAgo,
    },
  ];

  return {
    users,
    services,
    invoices,
    notifications,
    invoiceSeq: 1004,
  };
}

function readDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    writeDb(initial);
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw) as DatabaseSchema;
}

function writeDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function sanitizeUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function findUserById(userId: string): StoredUser | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === userId);
}

export function registerUser(name: string, email: string, password: string): { user: UserPublic; token: string } | { error: string } {
  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { error: 'An account with this email already exists.' };
  }

  const newUser: StoredUser = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    name: name.trim(),
    email: normalizedEmail,
    role: 'customer',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.notifications.unshift({
    id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
    userId: newUser.id,
    title: 'Welcome to SkyraCloud',
    message: 'Your billing console account is ready. View your invoices and active services here.',
    read: false,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);

  return {
    user: sanitizeUser(newUser),
    token: signAuthToken(newUser.id),
  };
}

export function loginUser(email: string, password: string): { user: UserPublic; token: string } | { error: string } {
  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  const found = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!found || !verifyPassword(password, found.passwordHash)) {
    return { error: 'Invalid email or password.' };
  }
  return {
    user: sanitizeUser(found),
    token: signAuthToken(found.id),
  };
}

export function getUserInvoices(userId: string): Invoice[] {
  const db = readDb();
  return db.invoices
    .filter((inv) => inv.userId === userId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export function getUserServices(userId: string): ServiceSubscription[] {
  const db = readDb();
  return db.services
    .filter((srv) => srv.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUserNotifications(userId: string): NotificationItem[] {
  const db = readDb();
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationRead(userId: string, notificationId: string): void {
  const db = readDb();
  db.notifications = db.notifications.map((n) =>
    n.id === notificationId && n.userId === userId ? { ...n, read: true } : n
  );
  writeDb(db);
}

export function markAllNotificationsRead(userId: string): void {
  const db = readDb();
  db.notifications = db.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n));
  writeDb(db);
}

// --- ADMIN OPERATIONS ---

export function getAdminOverview() {
  const db = readDb();
  const userMap = new Map(db.users.map((u) => [u.id, u]));

  const invoices = db.invoices
    .map((inv) => {
      const owner = userMap.get(inv.userId);
      return {
        ...inv,
        userName: owner?.name || 'Unknown User',
        userEmail: owner?.email || '',
      };
    })
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const services = db.services
    .map((srv) => {
      const owner = userMap.get(srv.userId);
      return {
        ...srv,
        userName: owner?.name || 'Unknown User',
        userEmail: owner?.email || '',
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    users: db.users.map(sanitizeUser),
    invoices,
    services,
  };
}

export interface AdminCreateInvoiceInput {
  userEmail?: string;
  userId?: string;
  serviceName: string;
  serviceType: ServiceType;
  plan: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  expiryDate: string;
  notes?: string;
  items?: InvoiceLineItem[];
}

export function createAdminInvoice(input: AdminCreateInvoiceInput): Invoice | { error: string } {
  const db = readDb();
  const normalizedEmail = input.userEmail?.trim().toLowerCase();
  const targetUser = normalizedEmail
    ? db.users.find((u) => u.email.toLowerCase() === normalizedEmail)
    : input.userId
    ? db.users.find((u) => u.id === input.userId)
    : undefined;

  if (!targetUser) {
    return {
      error: normalizedEmail
        ? `No registered user found with email "${input.userEmail?.trim()}".`
        : 'Target customer not found.',
    };
  }

  const now = new Date();
  const seq = db.invoiceSeq++;

  const lineItems: InvoiceLineItem[] =
    input.items && input.items.length > 0
      ? input.items
      : [
          {
            description: `${input.plan.trim()} — ${input.serviceName.trim()}`,
            qty: 1,
            unitPrice: Number(input.amount),
            total: Number(input.amount),
          },
        ];

  const invoice: Invoice = {
    id: `inv_${crypto.randomBytes(5).toString('hex')}`,
    invoiceNumber: `INV-2026-${seq}`,
    userId: targetUser.id,
    serviceId: null,
    serviceName: input.serviceName.trim(),
    serviceType: input.serviceType,
    plan: input.plan.trim(),
    amount: Number(input.amount),
    currency: 'INR',
    status: input.status,
    issuedAt: now.toISOString(),
    dueDate: new Date(input.dueDate).toISOString(),
    paidAt: input.status === 'Paid' ? now.toISOString() : null,
    expiryDate: new Date(input.expiryDate).toISOString(),
    items: lineItems,
    notes:
      (input.notes || '').trim() ||
      (input.status === 'Paid'
        ? 'Marked as Paid by SkyraCloud Admin.'
        : input.status === 'Suspended'
        ? 'Suspended due to non-payment.'
        : 'Pending payment.'),
  };

  db.invoices.unshift(invoice);
  db.notifications.unshift({
    id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
    userId: targetUser.id,
    title: 'New invoice created',
    message: `A new invoice was created on your account with total amount: ₹${Number(input.amount).toFixed(2)}.`,
    read: false,
    createdAt: now.toISOString(),
  });

  writeDb(db);
  return invoice;
}

export interface AdminUpdateInvoiceInput {
  status?: InvoiceStatus;
  amount?: number;
  dueDate?: string;
  expiryDate?: string;
  serviceName?: string;
  plan?: string;
  notes?: string;
}

export function updateAdminInvoice(invoiceId: string, patch: AdminUpdateInvoiceInput): Invoice | { error: string } {
  const db = readDb();
  const idx = db.invoices.findIndex((i) => i.id === invoiceId);
  if (idx === -1) return { error: 'Invoice not found.' };

  const current = db.invoices[idx];
  const nextStatus = patch.status ?? current.status;
  const now = new Date();
  const nextExpiry = patch.expiryDate ? new Date(patch.expiryDate).toISOString() : current.expiryDate;
  const nextDue = patch.dueDate ? new Date(patch.dueDate).toISOString() : current.dueDate;

  let paidAt = current.paidAt;
  if (nextStatus === 'Paid' && current.status !== 'Paid') {
    paidAt = now.toISOString();
  } else if (nextStatus !== 'Paid') {
    paidAt = null;
  }

  const updated: Invoice = {
    ...current,
    status: nextStatus,
    amount: patch.amount !== undefined ? Number(patch.amount) : current.amount,
    dueDate: nextDue,
    expiryDate: nextExpiry,
    paidAt,
    serviceName: patch.serviceName !== undefined ? patch.serviceName.trim() : current.serviceName,
    plan: patch.plan !== undefined ? patch.plan.trim() : current.plan,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
  };

  if (patch.amount !== undefined && updated.items.length === 1) {
    updated.items = [
      {
        ...updated.items[0],
        unitPrice: updated.amount,
        total: updated.amount,
      },
    ];
  }

  db.invoices[idx] = updated;

  // Synchronize linked VPS/Minecraft/Bot service
  if (updated.serviceId) {
    const srvIdx = db.services.findIndex((s) => s.id === updated.serviceId);
    if (srvIdx !== -1) {
      const nextSrvStatus: ServiceStatus =
        nextStatus === 'Paid' ? 'Active' : nextStatus === 'Suspended' ? 'Suspended' : 'Pending';
      db.services[srvIdx] = {
        ...db.services[srvIdx],
        name: updated.serviceName,
        plan: updated.plan,
        expiryDate: nextExpiry,
        status: nextSrvStatus,
      };
    }
  }

  // Push meaningful customer notifications on status transitions
  if (patch.status && patch.status !== current.status) {
    if (nextStatus === 'Paid') {
      db.notifications.unshift({
        id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
        userId: updated.userId,
        title: 'Service activated',
        message: `Your invoice ${updated.invoiceNumber} is Paid. Service ${updated.serviceName} is now Active.`,
        read: false,
        createdAt: now.toISOString(),
      });
    } else if (nextStatus === 'Suspended') {
      db.notifications.unshift({
        id: `ntf_${crypto.randomBytes(5).toString('hex')}`,
        userId: updated.userId,
        title: 'Service suspended',
        message: `Invoice ${updated.invoiceNumber} is unpaid/suspended. Service ${updated.serviceName} has been suspended.`,
        read: false,
        createdAt: now.toISOString(),
      });
    }
  }

  writeDb(db);
  return updated;
}

export function deleteAdminInvoice(invoiceId: string): boolean {
  const db = readDb();
  const exists = db.invoices.some((i) => i.id === invoiceId);
  if (!exists) return false;
  db.invoices = db.invoices.filter((i) => i.id !== invoiceId);
  writeDb(db);
  return true;
}

export function updateAdminService(
  serviceId: string,
  patch: { status?: ServiceStatus; expiryDate?: string; specs?: string; ipAddress?: string }
): ServiceSubscription | { error: string } {
  const db = readDb();
  const idx = db.services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { error: 'Service not found.' };

  const current = db.services[idx];
  const updated: ServiceSubscription = {
    ...current,
    status: patch.status ?? current.status,
    expiryDate: patch.expiryDate ? new Date(patch.expiryDate).toISOString() : current.expiryDate,
    specs: patch.specs !== undefined ? patch.specs : current.specs,
    ipAddress: patch.ipAddress !== undefined ? patch.ipAddress : current.ipAddress,
  };
  db.services[idx] = updated;

  // Keep matching invoice expiry synced if updated by admin
  if (patch.expiryDate) {
    db.invoices = db.invoices.map((inv) =>
      inv.serviceId === serviceId ? { ...inv, expiryDate: updated.expiryDate } : inv
    );
  }

  writeDb(db);
  return updated;
}

export function updateUserRole(userId: string, role: UserRole): UserPublic | null {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], role };
  writeDb(db);
  return sanitizeUser(db.users[idx]);
}

export function createOrPromoteAdmin(
  name: string,
  email: string,
  password: string
): { user: UserPublic; action: 'created' | 'promoted' } {
  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existingIdx = db.users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);

  if (existingIdx !== -1) {
    db.users[existingIdx] = {
      ...db.users[existingIdx],
      name: name.trim() || db.users[existingIdx].name,
      role: 'admin',
      passwordHash: password ? hashPassword(password) : db.users[existingIdx].passwordHash,
    };
    writeDb(db);
    return { user: sanitizeUser(db.users[existingIdx]), action: 'promoted' };
  }

  const newAdmin: StoredUser = {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    name: name.trim(),
    email: normalizedEmail,
    role: 'admin',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newAdmin);
  writeDb(db);
  return { user: sanitizeUser(newAdmin), action: 'created' };
}
