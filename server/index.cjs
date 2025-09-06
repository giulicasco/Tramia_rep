require('dotenv/config');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// --- middlewares base ---
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// --- auth mínima (adaptá a tu lógica JWT si ya la tenías) ---
function requireAuth(req, res, next) {
    // si ya tenés tu cookie JWT, validala aquí; mientras tanto pasamos si existe cookie 'sid'
    if (!req.cookies?.sid)
        return res.status(401).json({ error: 'unauthorized' });
    // podés decodificar y guardar req.user si querés
    req.user = { email: 'partners@letsaitomate.com', role: 'admin' };
    next();
}
// --- utils rango ---
function parseRange(q) {
    const now = new Date();
    let from = null, to = null;
    if (q.from && q.to) {
        const f = new Date(String(q.from)), t = new Date(String(q.to));
        if (!isNaN(+f) && !isNaN(+t) && f < t) {
            from = f;
            to = t;
        }
    }
    if (!from || !to) {
        const r = String(q.range || '24h');
        const map = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
        const hours = map[r] ?? 24;
        to = now;
        from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
    return { from, to };
}
function rangeLabel(q) {
    if (q.from && q.to)
        return 'Custom';
    return { '24h': 'Last 24h', '7d': 'Last 7 days', '30d': 'Last 30 days' }[q.range] || 'Last 24h';
}
// --- health ---
app.get('/healthz', async (_req, res) => {
    try {
        await pool.query('select 1');
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
// --- me ---
app.get('/auth/me', requireAuth, (req, res) => {
    res.json({
        isAuthenticated: true,
        user: { email: req.user.email, role: req.user.role },
        organization: { id: 'default', name: 'Tramia', slug: 'main' },
    });
});
// --- API protegida ---
app.use('/api', requireAuth);
// OVERVIEW (Plan Pro: window + snapshot)
app.get('/api/metrics/overview', async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
        const winSql = `
    WITH
    accepted AS (
      SELECT count(*) AS c FROM public.hr_inbound_seen
      WHERE seen_at >= $1 AND seen_at < $2
    ),
    qualified AS (
      SELECT count(*) AS c FROM public.linkedin_jobs_incubadora
      WHERE qualified_at >= $1 AND qualified_at < $2
    ),
    scheduled AS (
      SELECT count(*) AS c FROM public.linkedin_jobs_incubadora
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
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'metrics_failed' });
    }
});
// Recent inbound (últimos 3 del lead en rango)
app.get('/api/activity/recent-inbound', async (req, res) => {
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
        SELECT m.message
        FROM public.linkedin_jobs_memory_incubadora m
        WHERE m.session_id::text = b.chatwoot_conversation_id::text
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
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'recent_inbound_failed' });
    }
});
// Conversations list
app.get('/api/conversations/list', async (req, res) => {
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
        SELECT m.message
        FROM public.linkedin_jobs_memory_incubadora m
        WHERE m.session_id::text = j.chatwoot_conversation_id::text
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
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'conversations_failed' });
    }
});
// Running jobs
app.get('/api/queue/running', async (_req, res) => {
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
    }
    catch (e) {
        res.status(500).json({ error: e.message || 'queue_running_failed' });
    }
});
// --- Setup Vite in development ---
async function setupServer() {
    if (process.env.NODE_ENV !== 'production') {
        const { setupViteServer } = require('./vite');
        await setupViteServer(app);
    }
    else {
        // --- Static PRODUCTION: dist/public ---
        const staticDir = path.resolve(process.cwd(), 'dist/public');
        app.use(express.static(staticDir));
        app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
    }
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => console.log(`BFF listening on :${port}`));
}
setupServer().catch(console.error);
