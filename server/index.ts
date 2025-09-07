import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import pg from "pg";
const { Pool } = pg;
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

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

// Database connection with enhanced error handling and retry logic
let pool: pg.Pool;

async function initializeDatabase(retries = 5, initialDelay = 1000) {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Initializing database connection... (attempt ${attempt}/${retries})`);
      
      // Create new pool instance for each attempt
      if (pool) {
        await pool.end().catch(() => {}); // Cleanup previous pool if exists
      }
      
      pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test database connection with timeout
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection established');
      
      return pool;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Database connection failed (attempt ${attempt}/${retries}):`, error.message);
      
      if (attempt === retries) {
        console.error('💥 Database connection failed after all retries');
        console.error('This may be due to:');
        console.error('- Incorrect DATABASE_URL credentials (check username/password)');
        console.error('- Database server not accessible');
        console.error('- Network connectivity issues');
        console.error('- Database not provisioned or properly configured');
        console.error('Please verify DATABASE_URL is properly formatted for PostgreSQL connection');
        break;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`⏳ Retrying database connection in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
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
  let dbConnected = false;
  
  try {
    // Validate environment variables first
    validateEnvironment();
    
    try {
      // Initialize database connection
      await initializeDatabase();
      
      // Initialize database tables
      await ensureTables();
      dbConnected = true;
    } catch (dbError) {
      console.error('⚠️  Database initialization failed, but continuing startup in degraded mode');
      console.error('The application will start without database connectivity');
      console.error('Database operations will fail until connection is restored');
      console.error('Database error:', dbError instanceof Error ? dbError.message : dbError);
    }

  // Health check endpoint
  app.get('/healthz', async (_req, res) => {
    const health: any = { 
      ok: true,
      database: 'disconnected',
      timestamp: new Date().toISOString()
    };
    
    try {
      if (pool) {
        await pool.query('SELECT 1');
        health.database = 'connected';
      } else {
        health.ok = false;
        health.database = 'not_initialized';
      }
    } catch (e: any) {
      health.ok = false;
      health.database = 'error';
      health.error = String(e);
    }
    
    const status = health.ok ? 200 : 503;
    res.status(status).json(health);
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

  // === METRICS: /api/metrics/overview ===
  // Devuelve 0 si no hay datos; el FE renombra la tarjeta a "Accepted Invitations"
  app.get('/api/metrics/overview', async (_req, res) => {
    if (process.env.DEBUG_DIAGNOSTICS) {
      console.log("[DIAGNOSTICO BFF] Solicitando /api/metrics/overview");
    }
    try {
      const sql = `
      WITH
      hr_accepted AS (
        SELECT count(*) AS c
        FROM public.hr_inbound_seen
        WHERE seen_at >= NOW() - interval '24 hours'
      ),
      active_leads AS (
        SELECT count(DISTINCT id) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE status IN ('pending','processing','wait')
      ),
      qualified_24h AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE updated_at >= NOW() - interval '24 hours'
          AND (
            NULLIF(result_json->'qualifier_llm'->>'is_task_complete','')::boolean IS TRUE
            OR lower(status) LIKE 'qualif%'
          )
      ),
      scheduled_24h AS (
        SELECT count(*) AS c
        FROM public.linkedin_jobs_incubadora
        WHERE updated_at >= NOW() - interval '24 hours'
          AND (
            NULLIF(result_json->'scheduler_llm'->>'is_task_complete','')::boolean IS TRUE
            OR lower(status) LIKE 'schedul%' OR lower(status) LIKE 'booking%'
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
          sum((chatwoot_mode = 'ai-on')::int) AS ai_on,
          count(*) AS total
        FROM public.linkedin_jobs_incubadora
      ),
      ttfr AS (
        SELECT 0::numeric AS seconds
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
      
      if (process.env.DEBUG_DIAGNOSTICS) {
        console.log("[DIAGNOSTICO BFF] Resultado crudo de PostgreSQL:", JSON.stringify(rows, null, 2));
        if (!rows || rows.length === 0) {
          console.log("[DIAGNOSTICO BFF] Advertencia: PostgreSQL devolvió un array vacío o nulo.");
        }
      }

      res.json(rows[0]);
    } catch (error: any) {
      console.error("[DIAGNOSTICO BFF] ERROR en PostgreSQL:", error.message, error.stack);
      res.status(500).json({ error: 'Internal Server Error' });
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

  // Serve static files from dist/public
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  if (fs.existsSync(distPath)) {
    log("📁 Serving static files from dist/public", "express");
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    log("❌ No build directory found, serving minimal response", "express");
    app.use("*", (_req, res) => {
      res.status(503).send(`
        <html>
          <body>
            <h1>Tramia Dashboard</h1>
            <p>Application is running but frontend build not found.</p>
            <p>Please build the frontend first.</p>
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
    console.error('- Server initialization failure');
    console.error('- Invalid PORT environment variable');
    console.error('Please check your deployment configuration and try again.');
    
    // Only exit if it's a critical non-database error
    if (!dbConnected && error instanceof Error && error.message.includes('environment')) {
      console.error('Critical environment error, exiting...');
      process.exit(1);
    } else {
      console.error('Non-critical error, attempting graceful degradation...');
    }
  }
})();
