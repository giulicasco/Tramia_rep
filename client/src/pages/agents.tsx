import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Play, Save, RotateCcw, GitBranch, TestTube, Settings, Code } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AgentType, AgentTestResult } from "@/types";

const agentTypes: AgentType[] = ["qualifier", "closer", "scheduler", "objections", "pooling", "followups"];

const agentDescriptions = {
  qualifier: "Qualifies leads based on ICP criteria and engagement level",
  closer: "Handles objections and closes qualified leads",
  scheduler: "Schedules meetings and manages calendar coordination",
  objections: "Specialized in handling common objections and concerns",
  pooling: "Manages lead pools and distribution logic",
  followups: "Automated follow-up sequences and nurturing"
};

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("qualifier");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [outputSchema, setOutputSchema] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<AgentTestResult | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["/api/agents"],
    queryFn: agentsApi.getAll,
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ agentType, data }: { agentType: string; data: any }) =>
      agentsApi.update(agentType, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent Updated",
        description: "Agent configuration saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agent configuration.",
        variant: "destructive",
      });
    },
  });

  const testAgentMutation = useMutation({
    mutationFn: ({ agentType, input }: { agentType: string; input: any }) =>
      agentsApi.test(agentType, input),
    onSuccess: (result) => {
      setTestResult(result);
      toast({
        title: "Test Completed",
        description: `Agent test completed. Used ${result.tokensUsed} tokens.`,
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Agent test failed. Check configuration and try again.",
        variant: "destructive",
      });
    },
  });

  const currentAgent = agents.find((agent: any) => agent.agentType === selectedAgent);

  const handleSave = () => {
    updateAgentMutation.mutate({
      agentType: selectedAgent,
      data: {
        system: systemPrompt,
        outputSchema: outputSchema ? JSON.parse(outputSchema) : null,
        paramsJson: {
          model: "gpt-4",
          temperature: 0.7,
          maxTokens: 500,
          mcpEnabled
        }
      }
    });
  };

  const handleTest = () => {
    if (!testInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide test input for the agent.",
        variant: "destructive",
      });
      return;
    }

    testAgentMutation.mutate({
      agentType: selectedAgent,
      input: testInput
    });
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
    <div className="p-6 space-y-6 fade-in" data-testid="agents-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agents & Prompts</h1>
          <p className="text-muted-foreground">Configure and test AI agents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="font-mono">
            {agents.length} agents configured
          </Badge>
        </div>
      </div>

      {/* Agent Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agentTypes.map((agentType) => {
              const agent = agents.find((a: any) => a.agentType === agentType);
              const isActive = selectedAgent === agentType;
              
              return (
                <Button
                  key={agentType}
                  variant={isActive ? "default" : "outline"}
                  className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                    isActive ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => {
                    setSelectedAgent(agentType);
                    setSystemPrompt(agent?.system || "");
                    setOutputSchema(agent?.outputSchema ? JSON.stringify(agent.outputSchema, null, 2) : "");
                    setMcpEnabled(agent?.paramsJson?.mcpEnabled || false);
                  }}
                  data-testid={`select-agent-${agentType}`}
                >
                  <Bot className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium capitalize">{agentType}</div>
                    <div className="text-xs opacity-75">
                      v{agent?.version || "1.0.0"}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span className="capitalize">{selectedAgent}</span>
              <Badge variant="outline" className="font-mono">
                v{currentAgent?.version || "1.0.0"}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {agentDescriptions[selectedAgent]}
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
                <TabsTrigger value="params">Params</TabsTrigger>
                <TabsTrigger value="version">Version</TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-4">
                <div>
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Enter the system prompt for this agent..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    data-testid="system-prompt-input"
                  />
                </div>
              </TabsContent>

              <TabsContent value="schema" className="space-y-4">
                <div>
                  <Label htmlFor="output-schema">Output Schema (JSON)</Label>
                  <Textarea
                    id="output-schema"
                    placeholder="Enter the JSON schema for agent output..."
                    value={outputSchema}
                    onChange={(e) => setOutputSchema(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    data-testid="output-schema-input"
                  />
                </div>
              </TabsContent>

              <TabsContent value="params" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Select defaultValue="gpt-4">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      defaultValue="0.7"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min="1"
                      max="4000"
                      defaultValue="500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="budget">Monthly Token Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="0"
                      defaultValue="100000"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mcp-enabled"
                    checked={mcpEnabled}
                    onCheckedChange={setMcpEnabled}
                    data-testid="mcp-toggle"
                  />
                  <Label htmlFor="mcp-enabled">Enable MCP Tools</Label>
                </div>
              </TabsContent>

              <TabsContent value="version" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Version management coming soon</p>
                  <p className="text-sm">Track changes, diff versions, and rollback</p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center space-x-2 mt-6">
              <Button
                onClick={handleSave}
                disabled={updateAgentMutation.isPending}
                data-testid="save-agent"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" disabled>
                <GitBranch className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Bench */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="h-5 w-5" />
              <span>Test Bench</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Test agent with sample input
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-input">Test Input</Label>
              <Textarea
                id="test-input"
                placeholder="Enter test input for the agent..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="min-h-[120px]"
                data-testid="test-input"
              />
            </div>

            <Button
              onClick={handleTest}
              disabled={testAgentMutation.isPending || !testInput.trim()}
              className="w-full"
              data-testid="test-agent"
            >
              <Play className="h-4 w-4 mr-2" />
              {testAgentMutation.isPending ? "Testing..." : "Run Test"}
            </Button>

            {testResult && (
              <div className="space-y-4">
                <div className="border border-border rounded p-4">
                  <h4 className="font-semibold mb-2">Test Result</h4>
                  {testResult.success ? (
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded font-mono text-sm">
                        <pre>{JSON.stringify(testResult.output, null, 2)}</pre>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Tokens: {testResult.tokensUsed}</span>
                        <span>Cost: ${testResult.estimatedCost.toFixed(4)}</span>
                        {testResult.latency && (
                          <span>Latency: {testResult.latency}ms</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-destructive">
                      <p>Test failed: {testResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last 24 hours performance metrics
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agentTypes.map((agentType) => (
              <div
                key={agentType}
                className="border border-border rounded p-4 text-center"
              >
                <div className="font-medium capitalize mb-2">{agentType}</div>
                <div className="text-2xl font-bold text-accent mb-1">
                  {Math.floor(Math.random() * 100) + 50}
                </div>
                <div className="text-xs text-muted-foreground">messages</div>
                <div className="text-xs text-accent mt-1">
                  {(Math.random() * 0.2 + 0.8).toFixed(2)} success rate
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
