import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import pg from "pg";
const { Pool } = pg;
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure admin_users table exists
async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    log('Database table admin_users ensured');
  } catch (error) {
    console.error('Failed to create admin_users table:', error);
  }
}

// Authentication constants and helpers
const JWT_COOKIE = 'sid';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

function signToken(user: any) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.SESSION_SECRET!,
    { expiresIn: '12h', issuer: 'dashboard' }
  );
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.sendStatus(403);
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const raw = req.cookies[JWT_COOKIE] || (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  if (!raw) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    (req as any).user = jwt.verify(raw, process.env.SESSION_SECRET!);
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables
  await ensureTables();

  // Health check endpoint
  app.get('/healthz', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Admin user creation endpoint (protected by ADMIN_KEY)
  app.post('/admin/users', requireAdmin, async (req, res) => {
    try {
      const { email, password, role = 'admin' } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'email/password required' });
      }
      const hash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `INSERT INTO public.admin_users(email,password_hash,role)
         VALUES ($1,$2,$3)
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role
         RETURNING id,email,role,created_at`,
        [email, hash, role]
      );
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to create user' });
    }
  });

  // Authentication routes
  app.post('/auth/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'email/password required' });
      }
      const { rows } = await pool.query(
        `SELECT * FROM public.admin_users WHERE email=$1 AND is_active=TRUE`,
        [email]
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'invalid' });
      }
      const token = signToken(user);
      res.cookie(JWT_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        path: '/'
      });
      res.json({ ok: true, email: user.email, role: user.role });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Login failed' });
    }
  });

  app.post('/auth/logout', (req, res) => {
    res.clearCookie(JWT_COOKIE, {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    res.json({ ok: true });
  });

  app.get('/auth/me', requireAuth, (req, res) => {
    const user = (req as any).user;
    res.json({ email: user.email, role: user.role });
  });

  // Protect all API routes with authentication
  app.use('/api', requireAuth);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Protect SPA routes (redirect to /login if not authenticated)
  app.use((req, res, next) => {
    // Skip auth check for auth routes, admin routes, assets, and healthz
    if (
      req.path.startsWith('/auth') ||
      req.path.startsWith('/admin') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/healthz')
    ) {
      return next();
    }
    // API routes are already protected above
    if (req.path.startsWith('/api')) {
      return next();
    }
    // For GET requests to SPA routes, check authentication
    if (req.method === 'GET') {
      try {
        jwt.verify(req.cookies[JWT_COOKIE], process.env.SESSION_SECRET!);
        return next();
      } catch {
        // Redirect to login page for unauthenticated users
        return res.redirect('/login');
      }
    }
    next();
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
