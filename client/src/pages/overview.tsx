import { useQuery } from "@tanstack/react-query";
import { 
  UserPlus, 
  MessageSquare, 
  CheckCircle, 
  CalendarCheck,
  Clock,
  Bot,
  ExternalLink,
  Upload,
  BarChart3
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";

export default function Overview() {
  // Fetch metrics data
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics/overview"],
    queryFn: () => api("GET", "/api/metrics/overview"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch queue status
  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ["/api/queue/status"],
    queryFn: () => api("GET", "/api/queue/status"),
    refetchInterval: 30000,
  });

  // Fetch recent conversations
  const { data: recentConversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/activity/recent-conversations"],
    queryFn: () => api("GET", "/api/activity/recent-conversations"),
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  if (metricsLoading || queueLoading || conversationsLoading) {
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

  const m: any = metrics || {};
  const queue: any[] = queueData || [];
  const conversations: any[] = recentConversations || [];

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="overview-page">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Accepted Invitations"
          value={m.hr_accepted_24h || 0}
          icon={<UserPlus className="h-5 w-5" />}
        />
        
        <KpiCard
          title="Active Leads"
          value={m.active_leads || 0}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        
        <KpiCard
          title="Qualified (24h)"
          value={m.qualified_24h || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        
        <KpiCard
          title="Scheduled (24h)"
          value={m.scheduled_24h || 0}
          icon={<CalendarCheck className="h-5 w-5" />}
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
              <div className="text-2xl font-bold text-foreground font-mono">
                {m.ttfr_seconds ? (m.ttfr_seconds / 60).toFixed(1) + 'm' : '0m'}
              </div>
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
              <div className="text-2xl font-bold text-foreground">
                {m.ai_total > 0 ? Math.round((m.ai_on / m.ai_total) * 100) + '%' : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">
                {m.ai_on || 0}/{m.ai_total || 0} conversations AI-enabled
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="queue-processing-metric">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Queue
              </h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-warning rounded-full" />
                <div className="w-2 h-2 bg-accent rounded-full live-indicator" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">
                {m.queue_pending || 0} / {m.queue_processing || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pending / Processing</div>
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
            {queue.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No data yet.</p>
              </div>
            ) : (
              queue.map((item: any) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{item.status}</span>
                  <Badge 
                    variant="outline" 
                    className={`font-mono ${
                      item.status === 'processing' ? 'text-accent border-accent live-indicator' :
                      item.status === 'pending' ? 'text-warning border-warning' :
                      item.status === 'failed' ? 'text-destructive border-destructive' :
                      'text-muted-foreground'
                    }`}
                  >
                    {item.count}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card data-testid="recent-conversations">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-foreground">Recent Conversations</h3>
            <p className="text-sm text-muted-foreground">Latest 3 conversations with last messages</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              </div>
            ) : (
              conversations.map((conv: any) => (
                <div key={conv.conversation_id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs font-mono">
                      #{conv.conversation_id?.toString().slice(-2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium">
                      Conversation #{conv.conversation_id}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {conv.last_message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      <Card data-testid="quick-actions">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="https://chat.incubadoragrowth.com/app/accounts/1/inbox-view"
              target="_blank" 
              rel="noreferrer"
              className="inline-flex"
            >
              <Button
                className="flex items-center space-x-3 p-4 h-auto bg-primary text-primary-foreground hover:bg-primary/90 hover-lift click-press w-full"
                data-testid="action-open-chat"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="font-medium">Open Chat</span>
              </Button>
            </a>

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