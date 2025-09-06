import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import pg from "pg";
const { Pool } = pg;
import { registerRoutes } from "./routes";
// import { setupVite, serveStatic, log } from "./vite"; // Removed to avoid vite dependency

// Local log function to avoid vite dependency
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Environment variable validation
function validateEnvironment() {
  const requiredVars = [
    'DATABASE_URL',
    'SESSION_SECRET', 
    'ADMIN_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please ensure all production secrets are properly configured in deployment settings.');
    process.exit(1);
  }

  // Set NODE_ENV to production if not specified in production environment
  // Keep NODE_ENV as-is for proper development/production behavior

  // Validate PORT
  const port = process.env.PORT;
  if (port && (isNaN(parseInt(port)) || parseInt(port) <= 0)) {
    console.error('❌ Invalid PORT environment variable:', port);
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  console.log(`🌍 Running in ${process.env.NODE_ENV} mode`);
}

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

// Database connection with enhanced error handling
let pool: pg.Pool;

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection established');
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Please verify DATABASE_URL is properly formatted for PostgreSQL connection');
    throw error;
  }
}

// Ensure database tables exist with retry logic
async function ensureTables(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create admin_users table
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
      
      // Create hr_inbound_seen table with index
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.hr_inbound_seen (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          source TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_hr_seen_at ON public.hr_inbound_seen(seen_at);
      `);
      
      console.log('✅ Database tables and indexes ensured');
      return;
    } catch (error) {
      console.error(`❌ Failed to create database tables (attempt ${attempt}/${retries}):`, error);
      if (attempt === retries) {
        console.error('💥 Database initialization failed after all retries');
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
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
  try {
    // Validate environment variables first
    validateEnvironment();
    
    // Initialize database connection
    await initializeDatabase();
    
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

  app.get('/auth/me', requireAuth, (_req, res) => {
    const u = ( _req as any ).user as { email: string; role: string };
    res.json({
      isAuthenticated: true,
      user: { email: u.email, role: u.role },
      organization: { id: 'default', name: 'Tramia', slug: 'main' },
    });
  });

  // Protect all API routes with authentication
  app.use('/api', requireAuth);

  // === HELPERS FOR PLAN PRO ===
  function parseRange(q: Record<string, any>) {
    const now = new Date();
    let from: Date | null = null, to: Date | null = null;
    if (q.from && q.to) {
      const f = new Date(String(q.from)), t = new Date(String(q.to));
      if (!isNaN(+f) && !isNaN(+t) && f < t) { from = f; to = t; }
    }
    if (!from || !to) {
      const r = String(q.range || '24h');
      const map: Record<string, number> = { '24h': 24, '7d': 24*7, '30d': 24*30 };
      const hours = map[r] ?? 24;
      to = now; from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
    return { from, to };
  }
  function rangeLabel(q: Record<string, any>) {
    if (q.from && q.to) return 'Custom';
    return ({ '24h': 'Last 24h', '7d': 'Last 7 days', '30d': 'Last 30 days' } as any)[q.range] || 'Last 24h';
  }

  // === METRICS: /api/metrics/overview (Plan Pro with range) ===
  app.get('/api/metrics/overview', requireAuth, async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const winSql = `
      WITH
      accepted AS (
        SELECT count(*) AS c
        FROM public.hr_inbound_seen
        WHERE seen_at >= $1 AND seen_at < $2
      ),
      qualified AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE qualified_at >= $1 AND qualified_at < $2
      ),
      scheduled AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE scheduled_at >= $1 AND scheduled_at < $2
      ),
      ttfr AS (
        SELECT avg(extract(epoch from (
          COALESCE(first_ai_message_at, last_human_message_at)
          - COALESCE(first_lead_message_at, last_lead_message_at)
        ))) AS seconds
        FROM public.linkedin_jobs_incubadora
        WHERE COALESCE(first_lead_message_at, last_lead_message_at) >= $1
          AND COALESCE(first_lead_message_at, last_lead_message_at) <  $2
          AND (COALESCE(first_ai_message_at, last_human_message_at) IS NOT NULL)
      )
      SELECT
        COALESCE((SELECT c FROM accepted),0)   AS accepted_invitations,
        COALESCE((SELECT c FROM qualified),0)  AS qualified,
        COALESCE((SELECT c FROM scheduled),0)  AS scheduled,
        COALESCE((SELECT seconds FROM ttfr),0) AS ttfr_seconds;
      `;
      const win = await pool.query(winSql, [from, to]);

      const snapSql = `
      WITH
      active_leads AS (
        SELECT count(DISTINCT user_id) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE status IN ('pending','processing','wait')
          AND (chatwoot_mode = 'ai-on' OR chatwoot_mode IS NULL)
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
      )
      SELECT
        COALESCE((SELECT c FROM active_leads),0)   AS active_leads,
        COALESCE((SELECT pending FROM queue),0)    AS queue_pending,
        COALESCE((SELECT processing FROM queue),0) AS queue_processing,
        COALESCE((SELECT ai_on FROM ai_status),0)  AS ai_on,
        COALESCE((SELECT total FROM ai_status),0)  AS ai_total;
      `;
      const snap = await pool.query(snapSql);

      res.json({ range: { from, to, label: rangeLabel(req.query) }, window: win.rows[0], snapshot: snap.rows[0] });
    } catch (e:any) { res.status(500).json({ error: e.message || 'metrics_failed' }); }
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

  // === RECENT INBOUND MESSAGES: /api/activity/recent-inbound ===
  app.get('/api/activity/recent-inbound', requireAuth, async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const sql = `
      WITH base AS (
        SELECT j.id AS job_id, j.chatwoot_conversation_id, j.last_lead_message_at
        FROM public.linkedin_jobs_incubadora j
        WHERE j.chatwoot_conversation_id IS NOT NULL
          AND j.last_lead_message_at IS NOT NULL
          AND j.last_lead_message_at >= $1 AND j.last_lead_message_at < $2
        ORDER BY j.last_lead_message_at DESC
      )
      SELECT DISTINCT ON (b.chatwoot_conversation_id)
        b.chatwoot_conversation_id,
        b.job_id,
        b.last_lead_message_at AS at,
        (
          SELECT m.content
          FROM public.agent_jobs_memory_incubadora m
          WHERE m.job_id = b.job_id
            AND m.created_at <= b.last_lead_message_at
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_inbound
      FROM base b
      ORDER BY b.chatwoot_conversation_id, b.last_lead_message_at DESC
      LIMIT 3;
      `;
      const { rows } = await pool.query(sql, [from, to]);
      res.json(rows.map(r => ({
        conversation_id: r.chatwoot_conversation_id,
        job_id: r.job_id,
        last_message: r.last_inbound || 'No message',
        at: r.at
      })));
    } catch (e:any) { res.status(500).json({ error: e.message || 'recent_inbound_failed' }); }
  });

  // === CONVERSATIONS LIST: /api/conversations/list ===
  app.get('/api/conversations/list', requireAuth, async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const sql = `
      SELECT
        j.id AS job_id,
        j.chatwoot_conversation_id,
        j.user_id,
        j.status,
        j.agent_type,
        j.updated_at,
        j.last_lead_message_at,
        (
          SELECT m.content
          FROM public.agent_jobs_memory_incubadora m
          WHERE m.job_id = j.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM public.linkedin_jobs_incubadora j
      WHERE j.chatwoot_conversation_id IS NOT NULL
        AND j.updated_at >= $1 AND j.updated_at < $2
      ORDER BY j.updated_at DESC
      LIMIT 100;
      `;
      const { rows } = await pool.query(sql, [from, to]);
      res.json(rows);
    } catch (e:any) { res.status(500).json({ error: e.message || 'conversations_failed' }); }
  });

  // === RUNNING JOBS: /api/queue/running ===
  app.get('/api/queue/running', requireAuth, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT id, chatwoot_conversation_id, sender_account_id, agent_type,
               status, processing_started_at, priority, updated_at
        FROM public.linkedin_jobs_incubadora
        WHERE status = 'processing'
        ORDER BY processing_started_at DESC NULLS LAST
        LIMIT 100;
      `);
      res.json(rows);
    } catch (e:any) { res.status(500).json({ error: e.message || 'queue_running_failed' }); }
  });

  // === RECENT CONVERSATIONS: /api/activity/recent-conversations (Legacy) ===
  // Últimas 3 conversaciones distintas con su último mensaje detectado en data json
  app.get('/api/activity/recent-conversations', async (_req, res) => {
    if (process.env.DEBUG_DIAGNOSTICS) {
      console.log("[DIAGNOSTICO BFF] Solicitando /api/activity/recent-conversations");
    }
    try {
      const sql = `
      WITH latest AS (
        SELECT
          id,
          chatwoot_conversation_id::text AS chatwoot_conversation_id,
          updated_at,
          COALESCE(
            NULLIF(result_json->'closer_llm'->>'response_text',''),
            NULLIF(result_json->'scheduler_llm'->>'response_text',''),
            NULLIF(result_json->'objeciones_llm'->>'response_text',''),
            NULLIF(result_json->'follow_up_llm'->>'response_text',''),
            NULLIF(result_json->'qualifier_llm'->>'response_text',''),
            'No hay mensaje registrado'
          ) AS last_message
        FROM public.linkedin_jobs_incubadora
        WHERE chatwoot_conversation_id IS NOT NULL
        ORDER BY updated_at DESC
      )
      SELECT DISTINCT ON (chatwoot_conversation_id)
        chatwoot_conversation_id,
        id AS job_id,
        last_message,
        updated_at
      FROM latest
      ORDER BY chatwoot_conversation_id, updated_at DESC
      LIMIT 3;
      `;
      const { rows } = await pool.query(sql);
      
      if (process.env.DEBUG_DIAGNOSTICS) {
        console.log("[DIAGNOSTICO BFF] Resultado crudo de PostgreSQL:", JSON.stringify(rows, null, 2));
        if (!rows || rows.length === 0) {
          console.log("[DIAGNOSTICO BFF] Advertencia: PostgreSQL devolvió un array vacío o nulo.");
        }
      }

      const conversations = rows.map(r => ({
        conversation_id: r.chatwoot_conversation_id,
        job_id: r.job_id,
        last_message: r.last_message,
        at: r.updated_at
      }));
      
      res.json(conversations);
    } catch (error: any) {
      console.error("[DIAGNOSTICO BFF] ERROR en PostgreSQL:", error.message, error.stack);
      // IMPORTANTE: Devolver un 500. Si devuelves un 200 con datos vacíos por error, TanStack Query lo cacheará como éxito.
      res.status(500).json({ error: 'Internal Server Error' });
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
    try {
      const viteModule = await import('./vite');
      if (viteModule.setupVite) {
        await viteModule.setupVite(app, server);
        log("Vite development server initialized");
      }
    } catch (e) {
      log("Vite module not available - running without HMR", "warning");
      log("Install vite dev dependency to enable development features", "warning");
    }
  } else {
    try {
      const viteModule = await import('./vite');
      if (viteModule.serveStatic) {
        viteModule.serveStatic(app);
      }
    } catch (e) {
      log("Static serving module not available - serving basic fallback", "warning");
      // Basic static fallback
      app.use("*", (_req, res) => {
        res.status(503).json({ error: "Frontend not available" });
      });
    }
  }

  // Development fallback when Vite fails to load
  if (app.get("env") === "development") {
    // Serve basic HTML + CSS + JS dashboard
    app.use("*", (_req, res) => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Tramia Dashboard</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0B0F14; color: #F8FAFC; }
    .header { background: #111827; padding: 1rem 2rem; border-bottom: 1px solid #374151; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: #1F2937; border-radius: 12px; padding: 1.5rem; border: 1px solid #374151; }
    .metric { font-size: 2rem; font-weight: 600; color: #06B6D4; margin: 0; }
    .label { color: #9CA3AF; margin: 0.5rem 0; }
    .status { color: #10B981; }
    .loading { color: #F59E0B; }
    h1 { margin: 0; color: #F8FAFC; font-size: 1.5rem; }
    .auth-section { background: #374151; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
    .login-form { display: flex; gap: 0.5rem; align-items: center; }
    .login-form input { padding: 0.5rem; border: 1px solid #6B7280; background: #1F2937; color: #F8FAFC; border-radius: 6px; }
    .login-form button { padding: 0.5rem 1rem; background: #06B6D4; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .login-form button:hover { background: #0891B2; }
    .authenticated { color: #10B981; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Tramia Dashboard</h1>
  </div>
  <div class="container">
    <div class="auth-section">
      <div id="auth-status">Verificando autenticación...</div>
      <div id="login-form" style="display: none;">
        <div class="login-form">
          <input type="email" id="email" placeholder="Email" value="partners@letsaitomate.com">
          <input type="password" id="password" placeholder="Password" value="Aitomate2025">
          <button onclick="login()">Ingresar</button>
        </div>
      </div>
    </div>
    
    <div id="dashboard" style="display: none;">
      <div class="grid">
        <div class="card">
          <div class="metric" id="active-leads">--</div>
          <div class="label">Active Leads</div>
        </div>
        <div class="card">
          <div class="metric" id="accepted-invitations">--</div>
          <div class="label">Accepted Invitations (24h)</div>
        </div>
        <div class="card">
          <div class="metric" id="qualified-leads">--</div>
          <div class="label">Qualified Leads (24h)</div>
        </div>
        <div class="card">
          <div class="metric" id="scheduled-calls">--</div>
          <div class="label">Scheduled Calls (24h)</div>
        </div>
      </div>
      
      <div class="card">
        <h3>API Status</h3>
        <p class="status">✅ Server running on port 5000</p>
        <p class="status">✅ Database connected</p>
        <p id="api-status">✅ All API endpoints operational</p>
      </div>
    </div>
  </div>

  <script>
    let authToken = null;

    async function checkAuth() {
      try {
        const response = await fetch('/auth/me');
        if (response.ok) {
          const data = await response.json();
          document.getElementById('auth-status').innerHTML = 
            '<span class="authenticated">✅ Autenticado como: ' + data.user.email + '</span>';
          document.getElementById('dashboard').style.display = 'block';
          loadMetrics();
          setInterval(loadMetrics, 30000); // Update every 30 seconds
        } else {
          document.getElementById('auth-status').innerText = 'No autenticado';
          document.getElementById('login-form').style.display = 'block';
        }
      } catch (e) {
        document.getElementById('auth-status').innerText = 'Error de conexión';
        document.getElementById('login-form').style.display = 'block';
      }
    }

    async function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
          location.reload();
        } else {
          alert('Error de autenticación');
        }
      } catch (e) {
        alert('Error de conexión');
      }
    }

    async function loadMetrics() {
      try {
        const response = await fetch('/api/metrics/overview?range=24h');
        if (response.ok) {
          const data = await response.json();
          document.getElementById('active-leads').innerText = data.snapshot.active_leads;
          document.getElementById('accepted-invitations').innerText = data.window.accepted_invitations;
          document.getElementById('qualified-leads').innerText = data.window.qualified;
          document.getElementById('scheduled-calls').innerText = data.window.scheduled;
          document.getElementById('api-status').innerHTML = '✅ Datos actualizados: ' + new Date().toLocaleTimeString();
        } else {
          document.getElementById('api-status').innerHTML = '⚠️ Error cargando métricas';
        }
      } catch (e) {
        document.getElementById('api-status').innerHTML = '❌ Error de conexión';
      }
    }

    // Initialize
    checkAuth();
  </script>
</body>
</html>
      `);
    });
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
      console.log('🚀 Tramia dashboard server started successfully');
      log(`serving on port ${port}`);
    });

  } catch (error) {
    console.error('💥 Application startup failed:', error);
    console.error('This may be due to:');
    console.error('- Missing required environment variables or secrets configuration');
    console.error('- Database connection or initialization failure');
    console.error('- Invalid PORT environment variable');
    console.error('Please check your deployment configuration and try again.');
    process.exit(1);
  }
})();
