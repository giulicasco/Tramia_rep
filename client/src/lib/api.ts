import { apiRequest } from "./queryClient";

// Helper function for making API requests
export async function api<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const response = await apiRequest(method, url, data);
  // CRUCIAL: TanStack Query necesita que se lance un error si la respuesta no es OK.
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const result = await response.json();
  // Only log in development or when explicitly enabled
  if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_DIAGNOSTICS) {
    console.log(`[DIAGNOSTICO FE] Datos recibidos en TanStack Query para ${url}:`, result);
  }
  return result;
}

// Auth & User API
export const authApi = {
  getMe: () => api("GET", "/auth/me"),
  getOrganizations: () => api("GET", "/api/orgs"),
  createOrganization: (data: any) => api("POST", "/api/orgs", data),
};

// Integrations API
export const integrationsApi = {
  getStatus: () => api("GET", "/api/integrations/status"),
  testChatwoot: () => api("POST", "/api/integrations/chatwoot/test"),
  testHeyReach: () => api("POST", "/api/integrations/heyreach/test"),
  getN8nStatus: () => api("GET", "/api/integrations/n8n/status"),
};

// Agents API
export const agentsApi = {
  getAll: () => api("GET", "/api/agents"),
  update: (agentType: string, data: any) => api("PUT", `/api/agents/${agentType}`, data),
  test: (agentType: string, input: any) => api("POST", `/api/agents/${agentType}/test`, { input }),
};

// Knowledge API
export const knowledgeApi = {
  getAll: () => api("GET", "/api/knowledge"),
  create: (data: any) => api("POST", "/api/knowledge", data),
  update: (id: string, data: any) => api("PUT", `/api/knowledge/${id}`, data),
  delete: (id: string) => api("DELETE", `/api/knowledge/${id}`),
  reindex: (id: string) => api("POST", `/api/knowledge/${id}/reindex`),
  search: (query: string, topK = 5) => api("POST", "/api/knowledge/search", { query, topK }),
};

// Conversations API
export const conversationsApi = {
  getAll: () => api("GET", "/api/conversations"),
  getById: (id: string) => api("GET", `/api/conversations/${id}`),
  performAction: (id: string, action: any) => api("POST", `/api/conversations/${id}/actions`, action),
};

// Jobs API
export const jobsApi = {
  getAll: () => api("GET", "/api/jobs"),
  retry: (id: string) => api("POST", `/api/jobs/${id}/retry`),
  cancel: (id: string) => api("POST", `/api/jobs/${id}/cancel`),
  reassign: (id: string, agentType: string) => api("POST", `/api/jobs/${id}/reassign`, { agent_type: agentType }),
};

// Reports API
export const reportsApi = {
  getOverview: (from?: string, to?: string) => api("GET", `/api/reports/overview?from=${from || ""}&to=${to || ""}`),
  getAgents: (from?: string, to?: string) => api("GET", `/api/reports/agents?from=${from || ""}&to=${to || ""}`),
  getFunnel: (from?: string, to?: string) => api("GET", `/api/reports/funnel?from=${from || ""}&to=${to || ""}`),
  getOps: (from?: string, to?: string) => api("GET", `/api/reports/ops?from=${from || ""}&to=${to || ""}`),
  getCosts: (from?: string, to?: string) => api("GET", `/api/reports/costs?from=${from || ""}&to=${to || ""}`),
};

// Webhooks API
export const webhooksApi = {
  getLogs: (source?: string, limit = 50) => api("GET", `/api/webhooks/logs?source=${source || ""}&limit=${limit}`),
};

// Settings API
export const settingsApi = {
  getGating: () => api("GET", "/api/settings/gating"),
  updateGating: (data: any) => api("PUT", "/api/settings/gating", data),
  getFollowups: () => api("GET", "/api/settings/followups"),
  updateFollowups: (data: any) => api("PUT", "/api/settings/followups", data),
  getAuditLogs: () => api("GET", "/api/audit"),
};

// WebSocket connection for real-time updates
export class TramiaWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(onMessage: (data: any) => void) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log("Connected to Tramia WebSocket");
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    this.ws.onclose = () => {
      console.log("Disconnected from Tramia WebSocket");
      this.attemptReconnect(onMessage);
    };
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private attemptReconnect(onMessage: (data: any) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(onMessage);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
