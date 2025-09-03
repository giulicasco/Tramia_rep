import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ExternalLink, Power, Clock, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { conversationsApi } from "@/lib/api";

export default function Conversations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: conversationsApi.getAll,
  });

  const filteredConversations = conversations.filter((conv: any) => {
    const matchesSearch = !searchTerm || 
      conv.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.userId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleOpenChatwoot = (conversationId: string) => {
    // This would open Chatwoot with SSO deep-link
    const chatwootUrl = `https://chat.incubadoragrowth.com/app/accounts/1/conversations/${conversationId}`;
    window.open(chatwootUrl, '_blank');
  };

  const handleToggleAI = async (conversationId: string, enabled: boolean) => {
    await conversationsApi.performAction(conversationId, {
      type: 'toggle_ai',
      enabled
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
    <div className="p-6 space-y-6 fade-in" data-testid="conversations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground">Manage active conversations and AI gating</p>
        </div>
        <Badge variant="outline" className="font-mono">
          {filteredConversations.length} conversations
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-conversations"
              />
            </div>
            <Button variant="outline" size="sm" data-testid="filter-button">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Conversations</h3>
            <div className="flex items-center space-x-2">
              <span className="live-indicator">●</span>
              <span className="text-sm text-muted-foreground">Live updates</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Last Interaction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No conversations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredConversations.map((conversation: any) => (
                  <TableRow key={conversation.id} data-testid={`conversation-${conversation.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                          {conversation.userName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {conversation.userName || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {conversation.chatwootContactId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {conversation.userId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {conversation.campaign || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={conversation.status === "active" ? "default" : "secondary"}
                        className={conversation.status === "active" ? "bg-accent text-accent-foreground" : ""}
                      >
                        {conversation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={conversation.aiEnabled}
                          onCheckedChange={(checked) => handleToggleAI(conversation.id, checked)}
                          size="sm"
                          data-testid={`ai-toggle-${conversation.id}`}
                        />
                        {conversation.aiMutedUntil && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Muted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {conversation.lastInteraction 
                          ? new Date(conversation.lastInteraction).toLocaleString("es-AR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChatwoot(conversation.chatwootConversationId)}
                          data-testid={`open-chatwoot-${conversation.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!conversation.aiEnabled}
                          data-testid={`force-agent-${conversation.id}`}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          Agent
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Conversation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Enabled</span>
              <span className="text-lg font-bold text-accent">
                {conversations.filter((c: any) => c.aiEnabled).length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Human Handled</span>
              <span className="text-lg font-bold text-warning">
                {conversations.filter((c: any) => !c.aiEnabled).length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
              <span className="text-lg font-bold text-foreground font-mono">2.4m</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
