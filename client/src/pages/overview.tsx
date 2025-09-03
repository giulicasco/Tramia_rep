import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  UserPlus, 
  MessageSquare, 
  CheckCircle, 
  CalendarCheck,
  Clock,
  Bot,
  Coins,
  ExternalLink,
  TestTubeDiagonal,
  Upload,
  BarChart3
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { reportsApi } from "@/lib/api";
import { TramiaWebSocket } from "@/lib/api";

export default function Overview() {
  const [liveData, setLiveData] = useState({});
  const [ws] = useState(() => new TramiaWebSocket());

  // Fetch overview data
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ["/api/reports/overview"],
    queryFn: () => reportsApi.getOverview(),
  });

  // Setup WebSocket for live updates
  useEffect(() => {
    ws.connect((data) => {
      if (data.type === "live_update") {
        setLiveData(data.data);
      }
    });

    return () => {
      ws.disconnect();
    };
  }, [ws]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-6 animate-pulse">
              <div className="h-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpiData = overviewData || {
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

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="overview-page">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="HR Accepted"
          value={kpiData.hrAccepted}
          icon={<UserPlus className="h-5 w-5" />}
          trend={{
            value: kpiData.trends.hrAccepted,
            label: "vs yesterday",
            positive: true,
          }}
        />
        
        <KpiCard
          title="Active Leads"
          value={kpiData.activeLeads}
          icon={<MessageSquare className="h-5 w-5" />}
          trend={{
            value: kpiData.trends.activeLeads,
            label: "conversion rate",
            positive: false,
          }}
        />
        
        <KpiCard
          title="Qualified"
          value={kpiData.qualified}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={{
            value: kpiData.trends.qualified,
            label: "qualification rate",
            positive: true,
          }}
        />
        
        <KpiCard
          title="Scheduled"
          value={kpiData.scheduled}
          icon={<CalendarCheck className="h-5 w-5" />}
          trend={{
            value: kpiData.trends.scheduled,
            label: "booking rate",
            positive: true,
          }}
        />
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card data-testid="ttfr-metric">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                TTFR
              </h3>
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground font-mono">2.4m</div>
              <div className="text-xs text-muted-foreground">Time to First Response</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="ai-status-metric">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                AI Status
              </h3>
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">94%</div>
              <div className="text-xs text-muted-foreground">Conversations AI-enabled</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="token-usage-metric">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Tokens/Day
              </h3>
              <Coins className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground font-mono">847K</div>
              <div className="text-xs text-muted-foreground">$23.42 estimated cost</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Operations Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs Queue Status */}
        <Card data-testid="jobs-queue-status">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-foreground">Jobs Queue Status</h3>
            <p className="text-sm text-muted-foreground">Real-time job processing overview</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Badge variant="outline" className="font-mono text-warning border-warning">
                12
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Processing</span>
              <Badge variant="outline" className="font-mono text-accent border-accent live-indicator">
                4
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed (24h)</span>
              <span className="text-sm font-mono text-foreground">1,247</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failed (24h)</span>
              <span className="text-sm font-mono text-destructive">3</span>
            </div>
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Average Processing Time</span>
                <span className="font-mono text-foreground">1.8s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card data-testid="system-health">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-foreground">System Health</h3>
            <p className="text-sm text-muted-foreground">Integration status and alerts</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent rounded-full live-indicator" />
                <span className="text-sm text-foreground">Chatwoot</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">98ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-warning rounded-full" />
                <span className="text-sm text-foreground">HeyReach</span>
              </div>
              <span className="text-xs font-mono text-warning">Rate Limited</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent rounded-full live-indicator" />
                <span className="text-sm text-foreground">n8n Workflows</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">142ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-accent rounded-full live-indicator" />
                <span className="text-sm text-foreground">Database</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">23ms</span>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Webhook Errors (24h)</span>
                <span className="font-mono text-destructive">2</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card data-testid="recent-activity">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <Button variant="link" size="sm" className="text-primary hover:text-primary/80">
              View All
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Latest system events and user actions</p>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="py-4 flex items-start space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-mono">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground">
                Agent <span className="font-mono text-primary">Qualifier</span> processed conversation{" "}
                <span className="font-mono text-primary">cw_1a2b3c</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                2 minutes ago • Lead qualified for scheduling
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">16:40:23</div>
          </div>

          <div className="py-4 flex items-start space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-warning text-warning-foreground text-xs">
                ⚠
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground">
                HeyReach rate limit reached for account{" "}
                <span className="font-mono text-primary">hr_sender_01</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                5 minutes ago • 12 jobs paused, retry at 17:00
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">16:37:45</div>
          </div>

          <div className="py-4 flex items-start space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                JD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground">
                Juan Díaz updated agent prompt for{" "}
                <span className="font-mono text-primary">Closer</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                8 minutes ago • Version 1.4.2 published
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">16:34:12</div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Panel */}
      <Card data-testid="quick-actions">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              className="flex items-center space-x-3 p-4 h-auto bg-primary text-primary-foreground hover:bg-primary/90 hover-lift click-press"
              data-testid="action-open-chatwoot"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">Open Chatwoot</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center space-x-3 p-4 h-auto hover-lift click-press"
              data-testid="action-test-agents"
            >
              <TestTubeDiagonal className="h-4 w-4" />
              <span className="font-medium">Test Agents</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center space-x-3 p-4 h-auto hover-lift click-press"
              data-testid="action-upload-knowledge"
            >
              <Upload className="h-4 w-4" />
              <span className="font-medium">Upload Knowledge</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center space-x-3 p-4 h-auto hover-lift click-press"
              data-testid="action-view-reports"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
