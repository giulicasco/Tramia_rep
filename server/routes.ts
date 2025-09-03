import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertOrganizationSchema, insertAgentConfigSchema, insertKnowledgeItemSchema, insertJobSchema, insertConversationSchema, insertWebhookLogSchema, insertAuditLogSchema, insertIntegrationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth & User routes
  app.get("/api/me", async (req, res) => {
    try {
      // Mock user for development - in production this would come from session
      const user = await storage.getUser("user-1");
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const organization = await storage.getOrganization(user.orgId);
      res.json({ user, organization, roles: user.roles });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orgs", async (req, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post("/api/orgs", async (req, res) => {
    try {
      const data = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(data);
      res.json(organization);
    } catch (error) {
      res.status(400).json({ message: "Invalid organization data" });
    }
  });

  // Integrations routes
  app.get("/api/integrations/status", async (req, res) => {
    try {
      const integrations = await storage.getIntegrations("org-1"); // Mock org ID
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations/chatwoot/test", async (req, res) => {
    try {
      // Mock Chatwoot test
      const result = {
        success: true,
        message: "Test contact and conversation created successfully",
        contactId: "test_contact_" + Date.now(),
        conversationId: "test_conv_" + Date.now()
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Chatwoot test failed" });
    }
  });

  app.post("/api/integrations/heyreach/test", async (req, res) => {
    try {
      // Mock HeyReach test
      const result = {
        success: true,
        message: "API key validated successfully",
        account: "test_account"
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "HeyReach test failed" });
    }
  });

  app.get("/api/integrations/n8n/status", async (req, res) => {
    try {
      const status = {
        workflows: [
          { id: "workflow_1", name: "Lead Processing", status: "active", lastRun: new Date() },
          { id: "workflow_2", name: "Follow-up Scheduler", status: "active", lastRun: new Date() }
        ]
      };
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch n8n status" });
    }
  });

  // Agents routes
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgentConfigs("org-1"); // Mock org ID
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.put("/api/agents/:agentType", async (req, res) => {
    try {
      const { agentType } = req.params;
      const data = insertAgentConfigSchema.parse({ ...req.body, agentType });
      const agent = await storage.updateAgentConfig(agentType, data);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ message: "Invalid agent configuration" });
    }
  });

  app.post("/api/agents/:agentType/test", async (req, res) => {
    try {
      const { agentType } = req.params;
      const { input } = req.body;
      
      // Mock LLM test
      const result = {
        success: true,
        output: {
          status: "qualified",
          confidence: 0.85,
          reasoning: "Lead shows strong interest and fits ICP"
        },
        tokensUsed: 156,
        estimatedCost: 0.0023
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Agent test failed" });
    }
  });

  // Knowledge routes
  app.get("/api/knowledge", async (req, res) => {
    try {
      const knowledge = await storage.getKnowledgeItems("org-1"); // Mock org ID
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch knowledge items" });
    }
  });

  app.post("/api/knowledge", async (req, res) => {
    try {
      const data = insertKnowledgeItemSchema.parse(req.body);
      const knowledge = await storage.createKnowledgeItem(data);
      res.json(knowledge);
    } catch (error) {
      res.status(400).json({ message: "Invalid knowledge item data" });
    }
  });

  app.put("/api/knowledge/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const knowledge = await storage.updateKnowledgeItem(id, req.body);
      res.json(knowledge);
    } catch (error) {
      res.status(400).json({ message: "Failed to update knowledge item" });
    }
  });

  app.delete("/api/knowledge/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgeItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete knowledge item" });
    }
  });

  app.post("/api/knowledge/:id/reindex", async (req, res) => {
    try {
      const { id } = req.params;
      // Mock reindexing
      res.json({ success: true, message: "Reindexing started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start reindexing" });
    }
  });

  app.post("/api/knowledge/search", async (req, res) => {
    try {
      const { query, topK = 5 } = req.body;
      // Mock RAG search
      const results = [
        {
          id: "kb_1",
          title: "Company Onboarding Guide",
          content: "Our comprehensive onboarding process...",
          score: 0.89,
          source: "docs/onboarding.pdf"
        }
      ];
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Knowledge search failed" });
    }
  });

  // Conversations routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations("org-1"); // Mock org ID
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      res.json(conversation);
    } catch (error) {
      res.status(404).json({ message: "Conversation not found" });
    }
  });

  app.post("/api/conversations/:id/actions", async (req, res) => {
    try {
      const { id } = req.params;
      const { type, ...data } = req.body;
      
      // Handle different action types
      switch (type) {
        case 'toggle_ai':
          await storage.updateConversation(id, { aiEnabled: data.enabled });
          break;
        case 'mute_until':
          await storage.updateConversation(id, { aiMutedUntil: new Date(data.until) });
          break;
        case 'force_agent':
          // Mock forcing agent
          break;
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Action failed" });
    }
  });

  // Jobs routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs("org-1"); // Mock org ID
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs/:id/retry", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateJob(id, { status: "pending" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to retry job" });
    }
  });

  app.post("/api/jobs/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.updateJob(id, { status: "cancelled" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel job" });
    }
  });

  app.post("/api/jobs/:id/reassign", async (req, res) => {
    try {
      const { id } = req.params;
      const { agent_type } = req.body;
      await storage.updateJob(id, { agentType: agent_type });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reassign job" });
    }
  });

  // Reports routes
  app.get("/api/reports/overview", async (req, res) => {
    try {
      const { from, to } = req.query;
      // Mock overview data
      const data = {
        hrAccepted: 247,
        activeLeads: 89,
        qualified: 34,
        scheduled: 18,
        trends: {
          hrAccepted: 12.3,
          activeLeads: -2.1,
          qualified: 8.7,
          scheduled: 15.2
        }
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overview report" });
    }
  });

  app.get("/api/reports/agents", async (req, res) => {
    try {
      const data = {
        qualifier: { messages: 156, completionRate: 0.89, avgTokens: 234 },
        closer: { messages: 98, completionRate: 0.76, avgTokens: 345 },
        scheduler: { messages: 67, completionRate: 0.92, avgTokens: 189 }
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents report" });
    }
  });

  app.get("/api/reports/funnel", async (req, res) => {
    try {
      const data = {
        stages: [
          { name: "HR Accepted", count: 247, rate: 1.0 },
          { name: "Contacted", count: 198, rate: 0.80 },
          { name: "Qualified", count: 89, rate: 0.45 },
          { name: "Scheduled", count: 34, rate: 0.38 }
        ]
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch funnel report" });
    }
  });

  app.get("/api/reports/ops", async (req, res) => {
    try {
      const data = {
        webhookErrors: 2,
        avgLatency: 142,
        rateLimits: 1,
        uptime: 0.998
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ops report" });
    }
  });

  app.get("/api/reports/costs", async (req, res) => {
    try {
      const data = {
        totalTokens: 847000,
        estimatedCost: 23.42,
        byAgent: {
          qualifier: 12.45,
          closer: 7.89,
          scheduler: 3.08
        }
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch costs report" });
    }
  });

  // Webhooks routes
  app.get("/api/webhooks/logs", async (req, res) => {
    try {
      const { source, limit = 50 } = req.query;
      const logs = await storage.getWebhookLogs("org-1", source as string, Number(limit));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  // Settings routes
  app.get("/api/settings/gating", async (req, res) => {
    try {
      const settings = {
        hrLeadsAiEnabled: true,
        externalLeadsAiEnabled: false,
        muteWindow: 60 // minutes
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gating settings" });
    }
  });

  app.put("/api/settings/gating", async (req, res) => {
    try {
      // Mock save gating settings
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save gating settings" });
    }
  });

  app.get("/api/settings/followups", async (req, res) => {
    try {
      const settings = {
        enabled: true,
        maxFollowups: 3,
        intervals: [24, 72, 168], // hours
        workingHours: { start: 9, end: 18 }
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch followup settings" });
    }
  });

  app.put("/api/settings/followups", async (req, res) => {
    try {
      // Mock save followup settings
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save followup settings" });
    }
  });

  app.get("/api/audit", async (req, res) => {
    try {
      const logs = await storage.getAuditLogs("org-1"); // Mock org ID
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
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
