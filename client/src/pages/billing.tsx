import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, DollarSign, TrendingUp, Calendar,
  Download, AlertCircle, CheckCircle, Info 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { reportsApi } from "@/lib/api";

const COLORS = ['hsl(187, 95%, 43%)', 'hsl(78, 76%, 58%)', 'hsl(35, 92%, 50%)', 'hsl(348, 90%, 60%)', 'hsl(252, 83%, 67%)'];

export default function Billing() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const { data: costsData } = useQuery({
    queryKey: ["/api/reports/costs"],
    queryFn: () => reportsApi.getCosts(),
  });

  // Mock billing data
  const billingData = {
    currentMonth: {
      totalTokens: 847000,
      estimatedCost: 23.42,
      limit: 100.00,
      usage: 0.234
    },
    usage: [
      { date: "Jan 1", tokens: 25000, cost: 0.68 },
      { date: "Jan 8", tokens: 180000, cost: 4.95 },
      { date: "Jan 15", tokens: 320000, cost: 8.78 },
      { date: "Jan 22", tokens: 220000, cost: 6.12 },
      { date: "Jan 29", tokens: 102000, cost: 2.89 }
    ],
    byAgent: [
      { name: "Qualifier", tokens: 320000, cost: 8.95, percentage: 38 },
      { name: "Closer", tokens: 280000, cost: 7.84, percentage: 33 },
      { name: "Scheduler", tokens: 150000, cost: 4.20, percentage: 18 },
      { name: "Objections", tokens: 67000, cost: 1.88, percentage: 8 },
      { name: "Follow-ups", tokens: 30000, cost: 0.84, percentage: 3 }
    ],
    plan: {
      name: "Growth Plan",
      monthlyLimit: 1000000,
      monthlyCost: 100.00,
      overage: 0.035
    },
    invoices: [
      {
        id: "INV-2024-001",
        date: "2024-01-01",
        amount: 87.45,
        status: "paid",
        tokens: 2450000
      },
      {
        id: "INV-2023-012",
        date: "2023-12-01",
        amount: 92.15,
        status: "paid",
        tokens: 2580000
      },
      {
        id: "INV-2023-011",
        date: "2023-11-01",
        amount: 78.30,
        status: "paid",
        tokens: 2190000
      }
    ]
  };

  const getUsageStatus = () => {
    const usage = billingData.currentMonth.usage;
    if (usage >= 0.9) return { color: "text-destructive", icon: AlertCircle, message: "High usage" };
    if (usage >= 0.7) return { color: "text-warning", icon: Info, message: "Moderate usage" };
    return { color: "text-accent", icon: CheckCircle, message: "Normal usage" };
  };

  const usageStatus = getUsageStatus();
  const StatusIcon = usageStatus.icon;

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="billing-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Monitor usage, costs, and manage your subscription</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" data-testid="download-invoice">
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
        </div>
      </div>

      {/* Current Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold font-mono">
                  {(billingData.currentMonth.totalTokens / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-muted-foreground">Tokens Used</div>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${billingData.currentMonth.estimatedCost}
                </div>
                <div className="text-sm text-muted-foreground">Current Cost</div>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  ${billingData.plan.monthlyLimit / 10}
                </div>
                <div className="text-sm text-muted-foreground">Monthly Limit</div>
              </div>
              <CreditCard className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {(billingData.currentMonth.usage * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Usage</div>
              </div>
              <StatusIcon className={`h-8 w-8 ${usageStatus.color}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Monthly Usage Progress</span>
            <Badge variant="outline" className={usageStatus.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {usageStatus.message}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Tokens: {billingData.currentMonth.totalTokens.toLocaleString()} / {billingData.plan.monthlyLimit.toLocaleString()}</span>
              <span className="font-mono">
                ${billingData.currentMonth.estimatedCost} / ${billingData.plan.monthlyCost}
              </span>
            </div>
            <Progress 
              value={billingData.currentMonth.usage * 100} 
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Plan: {billingData.plan.name}</span>
              <span>Overage: ${billingData.plan.overage}/1K tokens</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="plan">Plan & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          {/* Usage Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usage Trend (Last 30 Days)</CardTitle>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="last30">Last 30 Days</SelectItem>
                    <SelectItem value="last90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={billingData.usage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'tokens' ? `${Number(value).toLocaleString()} tokens` : `$${value}`,
                      name === 'tokens' ? 'Tokens' : 'Cost'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="hsl(187, 95%, 43%)" 
                    strokeWidth={2}
                    name="tokens"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(78, 76%, 58%)" 
                    strokeWidth={2}
                    name="cost"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono">28.2K</div>
                  <div className="text-sm text-muted-foreground">Avg Daily Tokens</div>
                  <div className="text-xs text-accent mt-1">+5.2% vs last month</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">$0.78</div>
                  <div className="text-sm text-muted-foreground">Avg Daily Cost</div>
                  <div className="text-xs text-accent mt-1">+3.1% vs last month</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono">$0.0276</div>
                  <div className="text-sm text-muted-foreground">Cost per 1K tokens</div>
                  <div className="text-xs text-muted-foreground mt-1">Standard rate</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Agent Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution by Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={billingData.byAgent}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="percentage"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {billingData.byAgent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Agent Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingData.byAgent.map((agent, index) => (
                    <div key={agent.name} className="flex items-center justify-between p-3 border border-border rounded">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agent.tokens.toLocaleString()} tokens
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${agent.cost}</div>
                        <div className="text-sm text-muted-foreground">{agent.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Token Usage by Agent Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Token Usage Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={billingData.byAgent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString()} tokens`, 'Tokens']}
                  />
                  <Bar dataKey="tokens" fill="hsl(187, 95%, 43%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tokens Used</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`invoice-${invoice.id}`}>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                          {invoice.id}
                        </code>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString("es-AR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {(invoice.tokens / 1000).toFixed(0)}K
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">${invoice.amount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={invoice.status === "paid" ? "default" : "secondary"}
                          className={invoice.status === "paid" ? "bg-accent text-accent-foreground" : ""}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`download-${invoice.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-primary rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{billingData.plan.name}</h3>
                    <Badge className="bg-primary text-primary-foreground">Active</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly token limit:</span>
                      <span className="font-mono">{billingData.plan.monthlyLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly cost:</span>
                      <span className="font-bold">${billingData.plan.monthlyCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overage rate:</span>
                      <span className="font-mono">${billingData.plan.overage}/1K tokens</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Plan Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ 1M tokens/month included</li>
                    <li>✓ All AI agents enabled</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Webhook integrations</li>
                    <li>✓ Priority support</li>
                  </ul>
                </div>

                <Button className="w-full" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>

            {/* Usage Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Alerts & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">70% Usage Alert</div>
                      <div className="text-sm text-muted-foreground">
                        Notify when reaching 70% of monthly limit
                      </div>
                    </div>
                    <Badge variant="outline" className="text-accent">Enabled</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">90% Usage Alert</div>
                      <div className="text-sm text-muted-foreground">
                        Notify when reaching 90% of monthly limit
                      </div>
                    </div>
                    <Badge variant="outline" className="text-accent">Enabled</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Overage Protection</div>
                      <div className="text-sm text-muted-foreground">
                        Automatically pause AI when limit exceeded
                      </div>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                  </div>
                </div>

                <div className="border border-border rounded p-4 bg-muted/20">
                  <h4 className="font-semibold mb-2">Payment Method</h4>
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm">•••• •••• •••• 4242</div>
                      <div className="text-xs text-muted-foreground">Expires 12/26</div>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  Configure Alerts
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Billing History Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Summary (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">$518.42</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">14.2M</div>
                  <div className="text-sm text-muted-foreground">Total Tokens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">$86.40</div>
                  <div className="text-sm text-muted-foreground">Avg Monthly</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
