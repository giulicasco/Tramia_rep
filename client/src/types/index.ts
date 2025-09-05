// Common types for the Tramia application

// Re-export types from shared schema for consistency
export type {
  Organization,
  InsertOrganization,
  User,
  InsertUser,
  AgentConfig,
  InsertAgentConfig,
  KnowledgeItem,
  InsertKnowledgeItem,
  Job,
  InsertJob,
  Conversation,
  InsertConversation,
  WebhookLog,
  InsertWebhookLog,
  AuditLog,
  InsertAuditLog,
  Integration,
  InsertIntegration,
  LinkedinJob,
} from "@shared/schema";

// Auth state
export interface AuthState {
  user?: {
    email: string;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  isAuthenticated?: boolean;
}

// Settings types
export interface GatingSettings {
  hrLeadsAiEnabled: boolean;
  externalLeadsAiEnabled: boolean;
  muteWindow: number;
}

export interface FollowupSettings {
  enabled: boolean;
  maxFollowups: number;
  delayHours: number;
}

// Reports data structure
export interface ReportsData {
  stages?: FunnelStage[];
  byAgent?: AgentPerformance[];
  webhookErrors?: number;
  avgLatency?: number;
  rateLimits?: number;
  uptime?: number;
}

export interface KpiData {
  hrAccepted: number;
  activeLeads: number;
  qualified: number;
  scheduled: number;
  trends: {
    hrAccepted: number;
    activeLeads: number;
    qualified: number;
    scheduled: number;
  };
}

export interface SystemHealth {
  chatwoot: {
    status: "online" | "warning" | "offline";
    latency: number;
  };
  heyreach: {
    status: "online" | "warning" | "offline";
    latency?: number;
    rateLimited?: boolean;
  };
  n8n: {
    status: "online" | "warning" | "offline";
    latency: number;
  };
  database: {
    status: "online" | "warning" | "offline";
    latency: number;
  };
}

export interface AgentTestResult {
  success: boolean;
  output: any;
  tokensUsed: number;
  estimatedCost: number;
  latency?: number;
  error?: string;
}

export interface AgentVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  system: string;
  outputSchema: any;
  paramsJson: any;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  source: string;
  metadata?: any;
}

export interface ReportFilter {
  from?: string;
  to?: string;
  agentType?: string;
  status?: string;
  campaign?: string;
}

export interface FunnelStage {
  name: string;
  count: number;
  rate: number;
  trend?: number;
}

export interface AgentPerformance {
  agentType: string;
  messages: number;
  completionRate: number;
  avgTokens: number;
  avgLatency: number;
  successRate: number;
  cost: number;
}

export interface WebSocketMessage {
  type: "live_update" | "job_update" | "conversation_update" | "system_alert";
  data: any;
  timestamp: string;
}

export interface IntegrationStatus {
  chatwoot: {
    connected: boolean;
    lastCheck: string;
    accountId?: string;
    error?: string;
  };
  heyreach: {
    connected: boolean;
    lastCheck: string;
    rateLimited?: boolean;
    error?: string;
  };
  n8n: {
    connected: boolean;
    lastCheck: string;
    workflows: Array<{
      id: string;
      name: string;
      status: "active" | "inactive";
      lastRun?: string;
    }>;
    error?: string;
  };
  mcp?: {
    enabled: boolean;
    endpoint?: string;
    error?: string;
  };
}

export interface BillingData {
  totalTokens: number;
  estimatedCost: number;
  byAgent: Record<string, number>;
  usage: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
  limits: {
    monthlyTokens?: number;
    monthlyCost?: number;
  };
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorUserId?: string;
  actorName?: string;
  action: string;
  target: string;
  beforeJson?: any;
  afterJson?: any;
  createdAt: string;
}

export interface WebhookLogEntry {
  id: string;
  orgId: string;
  source: string;
  eventId?: string;
  status: "success" | "error" | "pending";
  payloadJson?: any;
  error?: string;
  createdAt: string;
}

export type AgentType = "qualifier" | "closer" | "scheduler" | "objections" | "pooling" | "followups";
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type KnowledgeStatus = "queued" | "embedding" | "ready" | "failed";
export type UserRole = "admin" | "operator" | "viewer";
