import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createAdminInvoice,
  deleteAdminInvoice,
  findUserById,
  getAdminOverview,
  getUserInvoices,
  getUserNotifications,
  getUserServices,
  loginUser,
  markAllNotificationsRead,
  markNotificationRead,
  registerUser,
  sanitizeUser,
  updateAdminInvoice,
  updateAdminService,
  updateUserRole,
  verifyAuthToken,
  type StoredUser,
} from './server/store';

interface AuthedRequest extends Request {
  user?: StoredUser;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('skyra_session=')) {
        return decodeURIComponent(cookie.slice('skyra_session='.length));
      }
    }
  }
  return null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const userId = verifyAuthToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const user = findUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'skyracloud-billing' });
  });

  // Auth routes
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const result = registerUser(name, email, password);
    if ('error' in result) {
      res.status(409).json({ error: result.error });
      return;
    }

    res.setHeader(
      'Set-Cookie',
      `skyra_session=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    res.status(201).json(result);
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const result = loginUser(email, password);
    if ('error' in result) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.setHeader(
      'Set-Cookie',
      `skyra_session=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    res.json(result);
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', 'skyra_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  // Customer Billing & Services
  app.get('/api/billing/overview', requireAuth, (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    res.json({
      invoices: getUserInvoices(userId),
      services: getUserServices(userId),
      notifications: getUserNotifications(userId),
    });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    markNotificationRead(req.user!.id, req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    markAllNotificationsRead(req.user!.id);
    res.json({ ok: true });
  });

  // Admin Billing Management
  app.get('/api/admin/overview', requireAuth, requireAdmin, (_req, res) => {
    res.json(getAdminOverview());
  });

  app.post('/api/admin/invoices', requireAuth, requireAdmin, (req, res) => {
    const {
      userEmail,
      userId,
      serviceName,
      serviceType,
      plan,
      amount,
      status,
      dueDate,
      expiryDate,
      notes,
      items,
    } = req.body ?? {};

    if ((!userEmail && !userId) || !serviceName || !serviceType || !plan || amount === undefined || !dueDate || !expiryDate) {
      res.status(400).json({ error: 'Please complete all required invoice fields.' });
      return;
    }
    if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
      res.status(400).json({ error: 'Amount must be a valid non-negative number.' });
      return;
    }

    const result = createAdminInvoice({
      userEmail,
      userId,
      serviceName,
      serviceType,
      plan,
      amount: Number(amount),
      status: status || 'Unpaid',
      dueDate,
      expiryDate,
      notes,
      items,
    });

    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.status(201).json({ invoice: result });
  });

  app.patch('/api/admin/invoices/:id', requireAuth, requireAdmin, (req, res) => {
    const result = updateAdminInvoice(req.params.id, req.body ?? {});
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ invoice: result });
  });

  app.delete('/api/admin/invoices/:id', requireAuth, requireAdmin, (req, res) => {
    const deleted = deleteAdminInvoice(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }
    res.json({ ok: true });
  });

  app.patch('/api/admin/services/:id', requireAuth, requireAdmin, (req, res) => {
    const result = updateAdminService(req.params.id, req.body ?? {});
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ service: result });
  });

  app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
    const { role } = req.body ?? {};
    if (role !== 'admin' && role !== 'customer') {
      res.status(400).json({ error: 'Role must be admin or customer.' });
      return;
    }
    if (req.params.id === req.user!.id && role !== 'admin') {
      res.status(400).json({ error: 'You cannot demote your own active admin account.' });
      return;
    }
    const updated = updateUserRole(req.params.id, role);
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: updated });
  });

  // Vite or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkyraCloud Billing Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SkyraCloud server:', err);
  process.exit(1);
});
