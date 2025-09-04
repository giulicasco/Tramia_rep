import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, TrendingUp, Users, Clock, 
  DollarSign, Filter, Download, Calendar 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList
} from "recharts";
import { reportsApi } from "@/lib/api";

const COLORS = ['hsl(187, 95%, 43%)', 'hsl(78, 76%, 58%)', 'hsl(35, 92%, 50%)', 'hsl(348, 90%, 60%)', 'hsl(252, 83%, 67%)'];

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  const { data: overviewData } = useQuery({
    queryKey: ["/api/reports/overview"],
    queryFn: () => reportsApi.getOverview(),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["/api/reports/agents"],
    queryFn: () => reportsApi.getAgents(),
  });

  const { data: funnelData } = useQuery({
    queryKey: ["/api/reports/funnel"],
    queryFn: () => reportsApi.getFunnel(),
  });

  const { data: opsData } = useQuery({
    queryKey: ["/api/reports/ops"],
    queryFn: () => reportsApi.getOps(),
  });

  const { data: costsData } = useQuery({
    queryKey: ["/api/reports/costs"],
    queryFn: () => reportsApi.getCosts(),
  });

  // Mock chart data
  const funnelChartData = [
    { name: "HR Accepted", value: 247, fill: COLORS[0] },
    { name: "Contacted", value: 198, fill: COLORS[1] },
    { name: "Qualified", value: 89, fill: COLORS[2] },
    { name: "Scheduled", value: 34, fill: COLORS[3] }
  ];

  const agentPerformanceData = [
    { name: "Qualifier", messages: 156, completion: 89, tokens: 234 },
    { name: "Closer", messages: 98, completion: 76, tokens: 345 },
    { name: "Scheduler", messages: 67, completion: 92, tokens: 189 },
    { name: "Objections", messages: 45, completion: 84, tokens: 278 },
    { name: "Follow-ups", messages: 78, completion: 71, tokens: 167 }
  ];

  const costTrendData = [
    { date: "Jan", tokens: 750000, cost: 18.5 },
    { date: "Feb", tokens: 820000, cost: 20.2 },
    { date: "Mar", tokens: 780000, cost: 19.1 },
    { date: "Apr", tokens: 890000, cost: 22.8 },
    { date: "May", tokens: 847000, cost: 23.4 }
  ];

  const responseTimeData = [
    { hour: "00", avgTime: 2.1 },
    { hour: "06", avgTime: 1.8 },
    { hour: "12", avgTime: 3.2 },
    { hour: "18", avgTime: 2.7 },
    { hour: "24", avgTime: 2.4 }
  ];

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="reports-page">
      {/* Header with Tramia railway watermark */}
      <div className="relative flex items-center justify-between watermark">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analytics and performance insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="qualifier">Qualifier</SelectItem>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="scheduler">Scheduler</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total Leads</span>
                </div>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-accent">+12.3%</span> from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Conversion Rate</span>
                </div>
                <div className="text-2xl font-bold">38.2%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-accent">+2.1%</span> from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Avg Response Time</span>
                </div>
                <div className="text-2xl font-bold font-mono">2.4m</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-accent">-15s</span> from last period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Cost Per Lead</span>
                </div>
                <div className="text-2xl font-bold">$0.94</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-destructive">+$0.08</span> from last period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Response Time Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trend (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avgTime" 
                    stroke="hsl(187, 95%, 43%)" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={funnelChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Funnel Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Funnel Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {funnelData?.stages?.map((stage: any, index: number) => (
                  <div key={stage.name} className="flex items-center justify-between p-3 border border-border rounded">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{stage.count}</div>
                      <div className="text-sm text-muted-foreground">
                        {(stage.rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Agent Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={agentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="hsl(187, 95%, 43%)" name="Messages" />
                  <Bar dataKey="completion" fill="hsl(78, 76%, 58%)" name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Agent Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Agent Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentPerformanceData.map((agent) => (
                  <div key={agent.name} className="border border-border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{agent.name}</h4>
                      <Badge variant="outline">{agent.completion}% success</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Messages</span>
                        <div className="font-bold">{agent.messages}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Tokens</span>
                        <div className="font-bold font-mono">{agent.tokens}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost/Message</span>
                        <div className="font-bold">$0.{Math.floor(Math.random() * 20 + 10)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Cost Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono">847K</div>
                  <div className="text-sm text-muted-foreground">Total Tokens</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">$23.42</div>
                  <div className="text-sm text-muted-foreground">Estimated Cost</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">$0.028</div>
                  <div className="text-sm text-muted-foreground">Cost per 1K tokens</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Trend (Last 5 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(35, 92%, 50%)" 
                    strokeWidth={2}
                    name="Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost by Agent */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown by Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(costsData?.byAgent || {}).map(([agent, cost]) => (
                  <div key={agent} className="flex items-center justify-between">
                    <span className="capitalize">{agent}</span>
                    <span className="font-mono font-bold">${cost}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="space-y-6">
          {/* Operational Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{opsData?.webhookErrors || 2}</div>
                  <div className="text-sm text-muted-foreground">Webhook Errors</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono">{opsData?.avgLatency || 142}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Latency</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{opsData?.rateLimits || 1}</div>
                  <div className="text-sm text-muted-foreground">Rate Limits Hit</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{((opsData?.uptime || 0.998) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>System Health Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 border border-border rounded">
                  <div className="w-3 h-3 bg-accent rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">All systems operational</div>
                    <div className="text-sm text-muted-foreground">16:45 UTC-3</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 border border-border rounded">
                  <div className="w-3 h-3 bg-warning rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">HeyReach rate limit detected</div>
                    <div className="text-sm text-muted-foreground">16:37 UTC-3</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 border border-border rounded">
                  <div className="w-3 h-3 bg-destructive rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">Webhook delivery failed</div>
                    <div className="text-sm text-muted-foreground">15:23 UTC-3</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
