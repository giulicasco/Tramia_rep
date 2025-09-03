import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plug, CheckCircle, AlertTriangle, XCircle, 
  ExternalLink, Settings, Zap, TestTube, RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { integrationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Integrations() {
  const [chatwootApiToken, setChatwootApiToken] = useState("");
  const [heyReachApiKey, setHeyReachApiKey] = useState("");
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: integrationStatus, isLoading } = useQuery({
    queryKey: ["/api/integrations/status"],
    queryFn: integrationsApi.getStatus,
  });

  const testChatwootMutation = useMutation({
    mutationFn: integrationsApi.testChatwoot,
    onSuccess: (result) => {
      toast({
        title: "Chatwoot Test Successful",
        description: `Created test contact: ${result.contactId}`,
      });
    },
    onError: () => {
      toast({
        title: "Chatwoot Test Failed",
        description: "Failed to connect to Chatwoot API",
        variant: "destructive",
      });
    },
  });

  const testHeyReachMutation = useMutation({
    mutationFn: integrationsApi.testHeyReach,
    onSuccess: (result) => {
      toast({
        title: "HeyReach Test Successful",
        description: `Connected to account: ${result.account}`,
      });
    },
    onError: () => {
      toast({
        title: "HeyReach Test Failed",
        description: "Failed to validate API key",
        variant: "destructive",
      });
    },
  });

  const { data: n8nStatus } = useQuery({
    queryKey: ["/api/integrations/n8n/status"],
    queryFn: integrationsApi.getN8nStatus,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "online":
        return <CheckCircle className="h-4 w-4 text-accent" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "error":
      case "offline":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { variant: "default", className: "bg-accent text-accent-foreground" },
      warning: { variant: "outline", className: "border-warning text-warning" },
      error: { variant: "destructive", className: "bg-destructive text-destructive-foreground" },
      offline: { variant: "secondary", className: "" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground">Configure external service connections</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="live-indicator">●</span>
          <span className="text-sm text-muted-foreground">Live status</span>
        </div>
      </div>

      {/* Integration Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon("connected")}
                <span className="font-medium">Chatwoot</span>
              </div>
              {getStatusBadge("connected")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Customer conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon("warning")}
                <span className="font-medium">HeyReach</span>
              </div>
              {getStatusBadge("warning")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">LinkedIn outreach</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon("connected")}
                <span className="font-medium">n8n</span>
              </div>
              {getStatusBadge("connected")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Workflow automation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(mcpEnabled ? "connected" : "offline")}
                <span className="font-medium">MCP</span>
              </div>
              {getStatusBadge(mcpEnabled ? "connected" : "offline")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Model Context Protocol</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chatwoot" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chatwoot">Chatwoot</TabsTrigger>
          <TabsTrigger value="heyreach">HeyReach</TabsTrigger>
          <TabsTrigger value="n8n">n8n</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
        </TabsList>

        <TabsContent value="chatwoot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-accent text-accent-foreground rounded flex items-center justify-center">
                  <span className="text-sm font-bold">CW</span>
                </div>
                <span>Chatwoot Configuration</span>
                {getStatusBadge("connected")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chatwoot-domain">Domain</Label>
                <Input
                  id="chatwoot-domain"
                  value="https://chat.incubadoragrowth.com"
                  disabled
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="chatwoot-account">Account ID</Label>
                <Input
                  id="chatwoot-account"
                  value="••••••••••••1234"
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Account ID is configured in backend for security
                </p>
              </div>

              <div>
                <Label htmlFor="chatwoot-token">Application API Token</Label>
                <Input
                  id="chatwoot-token"
                  type="password"
                  value={chatwootApiToken}
                  onChange={(e) => setChatwootApiToken(e.target.value)}
                  placeholder="Enter Chatwoot API token..."
                  className="font-mono"
                  data-testid="chatwoot-api-token"
                />
              </div>

              <div>
                <Label htmlFor="chatwoot-inbox">Inbox Identifier</Label>
                <Input
                  id="chatwoot-inbox"
                  value="hr-inbox-uuid-1234"
                  disabled
                  className="font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => testChatwootMutation.mutate()}
                  disabled={testChatwootMutation.isPending}
                  data-testid="test-chatwoot"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testChatwootMutation.isPending ? "Testing..." : "Test Connection"}
                </Button>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Chatwoot
                </Button>
              </div>

              <div className="border border-border rounded p-4 bg-muted/20">
                <h4 className="font-semibold mb-2">Single Sign-On (SSO)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Chatwoot is configured with SSO via the main identity provider.
                  Deep-links will automatically authenticate users.
                </p>
                <Badge variant="outline" className="text-xs">
                  ✓ SSO Configured
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heyreach" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center">
                  <span className="text-sm font-bold">HR</span>
                </div>
                <span>HeyReach Configuration</span>
                {getStatusBadge("warning")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="heyreach-api-key">API Key</Label>
                <Input
                  id="heyreach-api-key"
                  type="password"
                  value={heyReachApiKey}
                  onChange={(e) => setHeyReachApiKey(e.target.value)}
                  placeholder="Enter HeyReach API key..."
                  className="font-mono"
                  data-testid="heyreach-api-key"
                />
              </div>

              <div>
                <Label>Webhook Endpoints</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <code className="text-sm">/api/webhooks/hr-accepted</code>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <code className="text-sm">/api/webhooks/hr-inbound</code>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <code className="text-sm">/api/webhooks/hr-outbound</code>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => testHeyReachMutation.mutate()}
                  disabled={testHeyReachMutation.isPending}
                  data-testid="test-heyreach"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testHeyReachMutation.isPending ? "Testing..." : "Test API Key"}
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Webhooks
                </Button>
              </div>

              <div className="border border-warning rounded p-4 bg-warning/10">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-semibold text-warning">Rate Limited</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  HeyReach API rate limit reached for sender account hr_sender_01.
                  12 jobs paused, retry at 17:00 UTC-3.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <span>n8n Workflow Automation</span>
                {getStatusBadge("connected")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="n8n-base-url">Base URL</Label>
                <Input
                  id="n8n-base-url"
                  value="https://n8n.incubadoragrowth.com"
                  disabled
                  className="font-mono"
                />
              </div>

              <div>
                <Label>Active Workflows</Label>
                <div className="space-y-3">
                  {n8nStatus?.workflows?.map((workflow: any) => (
                    <div key={workflow.id} className="flex items-center justify-between p-3 border border-border rounded">
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Last run: {workflow.lastRun ? new Date(workflow.lastRun).toLocaleString() : "Never"}
                        </div>
                      </div>
                      <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                        {workflow.status}
                      </Badge>
                    </div>
                  )) || [
                    <div key="1" className="flex items-center justify-between p-3 border border-border rounded">
                      <div>
                        <div className="font-medium">Lead Processing Pipeline</div>
                        <div className="text-sm text-muted-foreground">Last run: 2 minutes ago</div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">active</Badge>
                    </div>,
                    <div key="2" className="flex items-center justify-between p-3 border border-border rounded">
                      <div>
                        <div className="font-medium">Follow-up Scheduler</div>
                        <div className="text-sm text-muted-foreground">Last run: 15 minutes ago</div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">active</Badge>
                    </div>
                  ]}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open n8n Dashboard
                </Button>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center">
                  <span className="text-sm font-bold">MCP</span>
                </div>
                <span>Model Context Protocol</span>
                {getStatusBadge(mcpEnabled ? "connected" : "offline")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="mcp-enabled"
                  checked={mcpEnabled}
                  onCheckedChange={setMcpEnabled}
                  data-testid="mcp-toggle"
                />
                <Label htmlFor="mcp-enabled">Enable MCP Integration</Label>
              </div>

              {mcpEnabled && (
                <>
                  <div>
                    <Label htmlFor="mcp-endpoint">MCP Server Endpoint</Label>
                    <Input
                      id="mcp-endpoint"
                      value={mcpEndpoint}
                      onChange={(e) => setMcpEndpoint(e.target.value)}
                      placeholder="ws://localhost:3001/mcp"
                      className="font-mono"
                      data-testid="mcp-endpoint"
                    />
                  </div>

                  <div>
                    <Label>Available Tools</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">heyreach_send_message</span>
                        <Badge variant="outline" className="text-xs">Available</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">heyreach_get_conversation</span>
                        <Badge variant="outline" className="text-xs">Available</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">heyreach_schedule_followup</span>
                        <Badge variant="outline" className="text-xs">Available</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded p-4 bg-muted/20">
                    <h4 className="font-semibold mb-2">MCP Integration Benefits</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Direct tool access for AI agents</li>
                      <li>• Reduced API call latency</li>
                      <li>• Enhanced context awareness</li>
                      <li>• Standardized tool interface</li>
                    </ul>
                  </div>
                </>
              )}

              {!mcpEnabled && (
                <div className="border border-border rounded p-4 bg-muted/20">
                  <h4 className="font-semibold mb-2">Standard HTTP Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Currently using standard HTTP API calls to HeyReach.
                    Enable MCP for enhanced performance and capabilities.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
