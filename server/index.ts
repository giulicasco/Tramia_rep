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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow Vite HMR and dev scripts
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"], // Allow WebSocket for HMR
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable COEP for dev compatibility
}));
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

  // === METRICS: /api/metrics/overview ===
  // Devuelve 0 si no hay datos; el FE renombra la tarjeta a "Accepted Invitations"
  app.get('/api/metrics/overview', async (_req, res) => {
    try {
      const sql = `
      WITH
      hr_accepted AS (
        SELECT count(*) AS c
        FROM public.hr_inbound_seen
        WHERE seen_at >= NOW() - interval '24 hours'
      ),
      active_leads AS (
        SELECT count(DISTINCT user_id) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE status IN ('pending','processing','wait')
          AND (chatwoot_mode = 'ai-on' OR chatwoot_mode IS NULL)
      ),
      qualified_24h AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE updated_at >= NOW() - interval '24 hours'
          AND (
            (result_json->'qualifier_llm'->>'is_task_complete')::bool IS TRUE
            OR lower(conversation_status) LIKE 'qualif%'
          )
      ),
      scheduled_24h AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE updated_at >= NOW() - interval '24 hours'
          AND (
            (result_json->'scheduler_llm'->>'is_task_complete')::bool IS TRUE
            OR lower(conversation_status) LIKE 'schedul%' OR lower(conversation_status) LIKE 'booking%'
          )
      ),
      queue AS (
        SELECT
          sum((status='pending')::int) AS pending,
          sum((status='processing')::int) AS processing
        FROM public.linkedin_jobs_incubadora
      ),
      ai_status AS (
        SELECT
          sum((chatwoot_mode='ai-on')::int) AS ai_on,
          count(*) AS total
        FROM public.linkedin_jobs_incubadora
      ),
      ttfr AS (
        SELECT avg(extract(epoch from (last_human_message_at - last_lead_message_at))) AS seconds
        FROM public.linkedin_jobs_incubadora
        WHERE last_human_message_at IS NOT NULL
          AND last_lead_message_at IS NOT NULL
          AND last_human_message_at >= NOW() - interval '24 hours'
      )
      SELECT
        COALESCE((SELECT c FROM hr_accepted),0)       AS hr_accepted_24h,
        COALESCE((SELECT c FROM active_leads),0)      AS active_leads,
        COALESCE((SELECT c FROM qualified_24h),0)     AS qualified_24h,
        COALESCE((SELECT c FROM scheduled_24h),0)     AS scheduled_24h,
        COALESCE((SELECT pending FROM queue),0)       AS queue_pending,
        COALESCE((SELECT processing FROM queue),0)    AS queue_processing,
        COALESCE((SELECT ai_on FROM ai_status),0)     AS ai_on,
        COALESCE((SELECT total FROM ai_status),0)     AS ai_total,
        COALESCE((SELECT seconds FROM ttfr),0)        AS ttfr_seconds;
      `;
      const { rows } = await pool.query(sql);
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'metrics_failed' });
    }
  });

  // === QUEUE STATUS: /api/queue/status ===
  app.get('/api/queue/status', async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT status, count(*)::int AS count
        FROM public.linkedin_jobs_incubadora
        GROUP BY status
      `);
      const base: Record<string, number> = { pending: 0, processing: 0, wait: 0, done: 0, failed: 0 };
      for (const r of rows) base[r.status] = r.count;
      res.json(Object.entries(base).map(([status, count]) => ({ status, count })));
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'queue_failed' });
    }
  });

  // === RECENT CONVERSATIONS: /api/activity/recent-conversations ===
  // Últimas 3 conversaciones distintas con su último mensaje detectado en result_json
  app.get('/api/activity/recent-conversations', async (_req, res) => {
    try {
      const sql = `
      WITH latest AS (
        SELECT
          id,
          chatwoot_conversation_id,
          updated_at,
          COALESCE(
            NULLIF(result_json->'closer_llm'->>'response_text',''),
            NULLIF(result_json->'scheduler_llm'->>'response_text',''),
            NULLIF(result_json->'objeciones_llm'->>'response_text',''),
            NULLIF(result_json->'follow_up_llm'->>'response_text',''),
            NULLIF(result_json->'qualifier_llm'->>'response_text','')
          ) AS last_message
        FROM public.linkedin_jobs_incubadora
        WHERE chatwoot_conversation_id IS NOT NULL
        ORDER BY updated_at DESC
      )
      SELECT DISTINCT ON (chatwoot_conversation_id)
        chatwoot_conversation_id,
        id AS job_id,
        COALESCE(last_message, 'No hay mensaje registrado') AS last_message,
        updated_at
      FROM latest
      ORDER BY chatwoot_conversation_id, updated_at DESC
      LIMIT 3;
      `;
      const { rows } = await pool.query(sql);
      res.json(rows.map(r => ({
        conversation_id: r.chatwoot_conversation_id,
        job_id: r.job_id,
        last_message: r.last_message,
        at: r.updated_at
      })));
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'recent_failed' });
    }
  });

  // Data wipe endpoint for testing cleanup
  app.post('/admin/wipe-data', requireAdmin, async (_req, res) => {
    try {
      await pool.query('BEGIN');
      await pool.query('DELETE FROM public.linkedin_jobs_memory_incubadora');
      await pool.query('DELETE FROM public.hr_inbound_seen');
      await pool.query('DELETE FROM public.linkedin_jobs_incubadora');
      await pool.query('COMMIT');
      res.json({ ok: true });
    } catch (e: any) {
      await pool.query('ROLLBACK');
      res.status(500).json({ error: e.message || 'wipe_failed' });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // Let the SPA handle authentication state client-side
  // Only protect API routes server-side (already done above)

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
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
