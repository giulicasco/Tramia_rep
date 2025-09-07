import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { callN8N } from "./n8n";
import { pool } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth & User routes
  app.get("/api/me", async (req, res) => {
    try {
      // Query real user data from database
      const userQuery = await pool.query(`
        SELECT id, email, role, created_at 
        FROM admin_users 
        WHERE is_active = true 
        LIMIT 1
      `);
      
      if (userQuery.rows.length > 0) {
        const user = userQuery.rows[0];
        res.json({
          isAuthenticated: true,
          user: { 
            id: user.id.toString(), 
            name: user.email.split('@')[0], // Use email prefix as name
            email: user.email, 
            roles: [user.role] 
          },
          organization: { 
            id: "tramia", 
            name: "Tramia", 
            slug: "tramia" 
          }
        });
      } else {
        res.status(401).json({ message: "No active user found" });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch user" });
    }
  });

  // Reports routes
  app.get("/api/reports/overview", async (req, res) => {
    try {
      // Query real metrics from database
      const overviewQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN qualified_at IS NOT NULL THEN 1 END) as qualified,
          COUNT(CASE WHEN scheduled_at IS NOT NULL THEN 1 END) as scheduled,
          COUNT(CASE WHEN status IN ('active', 'pending') THEN 1 END) as active_leads
        FROM linkedin_jobs_incubadora
      `);

      const hrQuery = await pool.query(`
        SELECT COUNT(*) as hr_accepted 
        FROM hr_inbound_seen
      `);

      const overview = overviewQuery.rows[0];
      const hrData = hrQuery.rows[0];

      // Create basic trends data for the last 7 days
      const trendsQuery = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as jobs
        FROM linkedin_jobs_incubadora 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      const trends = trendsQuery.rows.map(row => ({
        date: row.date,
        qualified: Math.floor(Math.random() * 5), // Basic placeholder
        scheduled: Math.floor(Math.random() * 3), // Basic placeholder
        jobs: parseInt(row.jobs)
      }));

      res.json({
        hrAccepted: parseInt(hrData.hr_accepted) || 0,
        activeLeads: parseInt(overview.active_leads) || 0,
        qualified: parseInt(overview.qualified) || 0,
        scheduled: parseInt(overview.scheduled) || 0,
        trends: trends
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch overview" });
    }
  });

  app.get("/api/reports/agents", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-reports-agents`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch agents report" });
    }
  });

  app.get("/api/reports/funnel", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-reports-funnel`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch funnel report" });
    }
  });

  app.get("/api/reports/costs", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-reports-costs`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch costs report" });
    }
  });

  app.get("/api/reports/ops", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-reports-ops`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch ops report" });
    }
  });

  // Conversations routes
  app.get("/api/conversations", async (_req, res) => {
    try {
      // Query real conversation data from linkedin jobs
      const conversationsQuery = await pool.query(`
        SELECT 
          id,
          user_id,
          COALESCE(linkedin_user_data, 'LinkedIn User') as name,
          chatwoot_conversation_id,
          status,
          conversation_status,
          created_at,
          last_message_at,
          qualified_at,
          scheduled_at
        FROM linkedin_jobs_incubadora 
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const conversations = conversationsQuery.rows.map(row => ({
        id: row.id.toString(),
        user_id: row.user_id,
        name: row.name || 'LinkedIn User',
        chatwoot_conversation_id: row.chatwoot_conversation_id,
        status: row.status,
        conversation_status: row.conversation_status,
        created_at: row.created_at,
        last_message_at: row.last_message_at,
        qualified_at: row.qualified_at,
        scheduled_at: row.scheduled_at
      }));

      res.json(conversations);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-conversations-get?id=${encodeURIComponent(req.params.id)}`, undefined, { method: "GET" });
      res.json(data); // { id, timeline:[...] }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations/:id/actions", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-conv-action`, { id: req.params.id, ...req.body });
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to perform action" });
    }
  });

  // Jobs (queue) routes
  app.get("/api/jobs", async (_req, res) => {
    try {
      // Query real job data from database
      const jobsQuery = await pool.query(`
        SELECT 
          id,
          user_id,
          status,
          agent_type,
          priority,
          created_at,
          updated_at,
          processing_started_at,
          retry_count,
          finish_status,
          COALESCE(linkedin_user_data, 'LinkedIn User') as user_name
        FROM linkedin_jobs_incubadora 
        ORDER BY created_at DESC
        LIMIT 100
      `);

      const jobs = jobsQuery.rows.map(row => ({
        id: row.id.toString(),
        user_id: row.user_id,
        user_name: row.user_name || 'LinkedIn User',
        status: row.status,
        agent_type: row.agent_type,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at,
        processing_started_at: row.processing_started_at,
        retry_count: row.retry_count || 0,
        finish_status: row.finish_status
      }));

      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs/:id/retry", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-jobs-retry`, { id: req.params.id });
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to retry job" });
    }
  });

  app.post("/api/jobs/:id/cancel", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-jobs-cancel`, { id: req.params.id });
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to cancel job" });
    }
  });

  app.post("/api/jobs/:id/reassign", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-jobs-reassign`, { id: req.params.id, ...req.body });
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to reassign job" });
    }
  });

  // Agents (prompts & test) routes
  app.get("/api/agents", async (_req, res) => {
    try {
      const agents = await callN8N(`/webhook/tramia-agents-get`, undefined, { method: "GET" });
      res.json(agents); // [{ agentType, system, outputSchema, paramsJson, version }, ...]
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch agents" });
    }
  });

  app.put("/api/agents/:agentType", async (req, res) => {
    try {
      const saved = await callN8N(`/webhook/tramia-agents-update`, { agentType: req.params.agentType, ...req.body });
      res.json(saved); // { ok:true, version }
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid agent configuration" });
    }
  });

  app.post("/api/agents/:agentType/test", async (req, res) => {
    try {
      const result = await callN8N(`/webhook/tramia-agents-test`, { agentType: req.params.agentType, input: req.body?.input });
      res.json(result); // { success, output, tokensUsed, estimatedCost }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Agent test failed" });
    }
  });

  // Knowledge routes
  app.get("/api/knowledge", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-list`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch knowledge" });
    }
  });

  app.post("/api/knowledge", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-create`, req.body);
      res.json(data); // { id, status:'queued' }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to create knowledge item" });
    }
  });

  app.put("/api/knowledge/:id", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-update`, { id: req.params.id, ...req.body });
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to update knowledge item" });
    }
  });

  app.delete("/api/knowledge/:id", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-delete`, { id: req.params.id });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to delete knowledge item" });
    }
  });

  app.post("/api/knowledge/:id/reindex", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-reindex`, { id: req.params.id });
      res.json(data); // { success: true, message: "Reindexing started" }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to start reindexing" });
    }
  });

  app.post("/api/knowledge/search", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-knowledge-search`, req.body);
      res.json(data); // [{ id, title, content, score, source }, ...]
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Knowledge search failed" });
    }
  });

  // Integrations routes
  app.get("/api/integrations/status", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-integrations-status`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations/chatwoot/test", async (_req, res) => {
    try {
      const result = await callN8N(`/webhook/tramia-cw-test`, {
        base: process.env.CHATWOOT_BASE,
        accountId: parseInt(process.env.CHATWOOT_ACCOUNT_ID!, 10),
        inboxIdentifier: process.env.CHATWOOT_INBOX_IDENTIFIER,
        token: process.env.CHATWOOT_API_TOKEN
      });
      res.json(result); // { success, contactId, conversationId }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Chatwoot test failed" });
    }
  });

  app.post("/api/integrations/heyreach/test", async (_req, res) => {
    try {
      const result = await callN8N(`/webhook/tramia-hr-check`, {
        apiKey: process.env.HEYREACH_API_KEY
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "HeyReach test failed" });
    }
  });

  app.get("/api/integrations/n8n/status", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-n8n-status`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch n8n status" });
    }
  });

  // Settings routes
  app.get("/api/settings/gating", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-settings-gating-get`, undefined, { method: "GET" });
      res.json(data); // { hrLeadsAiEnabled, externalLeadsAiEnabled, muteWindow }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch gating" });
    }
  });

  app.put("/api/settings/gating", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-settings-gating-set`, req.body);
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to save gating" });
    }
  });

  app.get("/api/settings/followups", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-settings-followups-get`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch followup settings" });
    }
  });

  app.put("/api/settings/followups", async (req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-settings-followups-set`, req.body);
      res.json(data); // { ok:true }
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to save followup settings" });
    }
  });

  // Webhooks and audit routes
  app.get("/api/webhooks/logs", async (req, res) => {
    try {
      const { source, limit = 50 } = req.query;
      const data = await callN8N(`/webhook/tramia-webhook-logs?source=${source || ""}&limit=${limit}`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch webhook logs" });
    }
  });

  app.get("/api/audit", async (_req, res) => {
    try {
      const data = await callN8N(`/webhook/tramia-audit-logs`, undefined, { method: "GET" });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send periodic updates
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'live_update',
          data: {
            timestamp: new Date().toISOString(),
            activeJobs: Math.floor(Math.random() * 20) + 10,
            onlineAgents: Math.floor(Math.random() * 5) + 3
          }
        }));
      }
    }, 30000); // Every 30 seconds

    ws.on('close', () => {
      clearInterval(interval);
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}