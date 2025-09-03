import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Webhook, Search, Filter, RefreshCw, 
  Eye, AlertCircle, CheckCircle, Clock 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { webhooksApi } from "@/lib/api";

export default function Webhooks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: webhookLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/webhooks/logs", sourceFilter === "all" ? undefined : sourceFilter],
    queryFn: () => webhooksApi.getLogs(sourceFilter === "all" ? undefined : sourceFilter),
  });

  const filteredLogs = webhookLogs.filter((log: any) => {
    const matchesSearch = !searchTerm || 
      log.eventId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-accent" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      success: "bg-accent text-accent-foreground",
      error: "bg-destructive text-destructive-foreground",
      pending: "bg-warning text-warning-foreground"
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-muted"}>
        {status}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceColors = {
      chatwoot: "bg-primary text-primary-foreground",
      heyreach: "bg-secondary text-secondary-foreground",
      n8n: "bg-accent text-accent-foreground"
    };

    return (
      <Badge variant="outline" className={sourceColors[source as keyof typeof sourceColors]}>
        {source}
      </Badge>
    );
  };

  // Mock webhook logs for demonstration
  const mockLogs = [
    {
      id: "log_001",
      source: "heyreach",
      eventId: "hr_accepted_001",
      status: "success",
      payloadJson: {
        event: "message_accepted",
        leadId: "hr_lead_001",
        senderAccount: "hr_sender_01",
        timestamp: "2024-01-15T16:45:30Z"
      },
      createdAt: "2024-01-15T16:45:30Z"
    },
    {
      id: "log_002",
      source: "chatwoot",
      eventId: "cw_msg_002",
      status: "success",
      payloadJson: {
        event: "message_created",
        conversationId: "cw_1a2b3c",
        contactId: "contact_123",
        message: "Hola, estoy interesado en más información"
      },
      createdAt: "2024-01-15T16:42:15Z"
    },
    {
      id: "log_003",
      source: "n8n",
      eventId: "n8n_workflow_003",
      status: "error",
      payloadJson: {
        workflowId: "lead_processing",
        error: "Rate limit exceeded on HeyReach API"
      },
      error: "HTTP 429: Too Many Requests",
      createdAt: "2024-01-15T16:37:45Z"
    }
  ];

  const displayLogs = webhookLogs.length > 0 ? filteredLogs : mockLogs.filter((log) => {
    const matchesSearch = !searchTerm || 
      log.eventId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

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
    <div className="p-6 space-y-6 fade-in" data-testid="webhooks-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground">Monitor webhook deliveries and debug issues</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="refresh-webhooks"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-accent">
                  {displayLogs.filter(log => log.status === "success").length}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {displayLogs.filter(log => log.status === "error").length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-warning">
                  {displayLogs.filter(log => log.status === "pending").length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {displayLogs.length}
                </div>
                <div className="text-sm text-muted-foreground">Total (24h)</div>
              </div>
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by event ID or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-webhooks"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="chatwoot">Chatwoot</SelectItem>
                <SelectItem value="heyreach">HeyReach</SelectItem>
                <SelectItem value="n8n">n8n</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="h-5 w-5" />
            <span>Webhook Logs</span>
            <div className="flex items-center space-x-2 ml-auto">
              <span className="live-indicator">●</span>
              <span className="text-sm text-muted-foreground">Live updates</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No webhook logs found
                  </TableCell>
                </TableRow>
              ) : (
                displayLogs.map((log: any) => (
                  <TableRow key={log.id} data-testid={`webhook-log-${log.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {log.eventId}
                          </code>
                          {log.error && (
                            <div className="text-xs text-destructive mt-1">
                              {log.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSourceBadge(log.source)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("es-AR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            data-testid={`view-webhook-${log.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Webhook className="h-5 w-5" />
                              <span>Webhook Details</span>
                              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                                {log.eventId}
                              </code>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Source</Label>
                                <div className="mt-1">{getSourceBadge(log.source)}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="mt-1">{getStatusBadge(log.status)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Timestamp</Label>
                              <div className="text-sm text-muted-foreground mt-1">
                                {new Date(log.createdAt).toLocaleString("es-AR")}
                              </div>
                            </div>

                            {log.error && (
                              <div>
                                <Label className="text-sm font-medium text-destructive">Error</Label>
                                <div className="text-sm text-destructive mt-1 font-mono bg-destructive/10 p-2 rounded">
                                  {log.error}
                                </div>
                              </div>
                            )}

                            <div>
                              <Label className="text-sm font-medium">Payload</Label>
                              <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-64 font-mono">
                                {JSON.stringify(log.payloadJson, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {["chatwoot", "heyreach", "n8n"].map((source) => {
          const sourceLogs = displayLogs.filter((log: any) => log.source === source).slice(0, 5);
          
          return (
            <Card key={source}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 capitalize">
                  {getSourceBadge(source)}
                  <span className="text-sm text-muted-foreground">
                    ({sourceLogs.length} events)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceLogs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No recent events
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sourceLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {getStatusIcon(log.status)}
                          <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono truncate">
                            {log.eventId}
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
