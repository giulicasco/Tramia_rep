import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings as SettingsIcon, Users, Shield, Flag, Clock, 
  Save, Plus, Trash2, Eye, Edit 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types";

export default function Settings() {
  const [aiGatingEnabled, setAiGatingEnabled] = useState(true);
  const [externalAiEnabled, setExternalAiEnabled] = useState(false);
  const [muteWindow, setMuteWindow] = useState(60);
  const [followupsEnabled, setFollowupsEnabled] = useState(true);
  const [maxFollowups, setMaxFollowups] = useState(3);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gatingSettings } = useQuery({
    queryKey: ["/api/settings/gating"],
    queryFn: settingsApi.getGating,
  });

  const { data: followupSettings } = useQuery({
    queryKey: ["/api/settings/followups"],
    queryFn: settingsApi.getFollowups,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["/api/audit"],
    queryFn: settingsApi.getAuditLogs,
  });

  const updateGatingMutation = useMutation({
    mutationFn: settingsApi.updateGating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/gating"] });
      toast({
        title: "Settings Saved",
        description: "AI gating settings updated successfully.",
      });
    },
  });

  const updateFollowupsMutation = useMutation({
    mutationFn: settingsApi.updateFollowups,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/followups"] });
      toast({
        title: "Settings Saved",
        description: "Follow-up settings updated successfully.",
      });
    },
  });

  const handleSaveGating = () => {
    updateGatingMutation.mutate({
      hrLeadsAiEnabled: aiGatingEnabled,
      externalLeadsAiEnabled: externalAiEnabled,
      muteWindow
    });
  };

  const handleSaveFollowups = () => {
    updateFollowupsMutation.mutate({
      enabled: followupsEnabled,
      maxFollowups,
      intervals: [24, 72, 168],
      workingHours: { start: 9, end: 18 }
    });
  };

  // Mock data for users
  const mockUsers = [
    { id: "1", name: "Juan Díaz", email: "juan@incubadoragrowth.com", role: "admin" as UserRole, lastActive: "2024-01-15T16:45:00Z" },
    { id: "2", name: "María García", email: "maria@incubadoragrowth.com", role: "operator" as UserRole, lastActive: "2024-01-15T15:30:00Z" },
    { id: "3", name: "Carlos Rodriguez", email: "carlos@incubadoragrowth.com", role: "viewer" as UserRole, lastActive: "2024-01-15T14:20:00Z" }
  ];

  const mockFeatureFlags = [
    { id: "ai_gating", name: "AI Gating", description: "Enable/disable AI responses", enabled: true },
    { id: "mcp_integration", name: "MCP Integration", description: "Model Context Protocol support", enabled: false },
    { id: "advanced_reporting", name: "Advanced Reporting", description: "Enhanced analytics features", enabled: true },
    { id: "webhook_retries", name: "Webhook Retries", description: "Automatic webhook retry mechanism", enabled: true }
  ];

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { variant: "default", className: "bg-destructive text-destructive-foreground" },
      operator: { variant: "secondary", className: "bg-primary text-primary-foreground" },
      viewer: { variant: "outline", className: "" }
    };

    const config = roleConfig[role];
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure system settings and permissions</p>
        </div>
      </div>

      <Tabs defaultValue="gating" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="gating">AI Gating</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="gating" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>AI Gating Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="hr-gating">HR Leads AI-enabled by default</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically enable AI for leads from HeyReach
                    </p>
                  </div>
                  <Switch
                    id="hr-gating"
                    checked={aiGatingEnabled}
                    onCheckedChange={setAiGatingEnabled}
                    data-testid="hr-ai-gating"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="external-gating">External Leads AI-enabled by default</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically enable AI for external/manual leads
                    </p>
                  </div>
                  <Switch
                    id="external-gating"
                    checked={externalAiEnabled}
                    onCheckedChange={setExternalAiEnabled}
                    data-testid="external-ai-gating"
                  />
                </div>

                <div>
                  <Label htmlFor="mute-window">Mute Window (minutes)</Label>
                  <Input
                    id="mute-window"
                    type="number"
                    min="1"
                    max="1440"
                    value={muteWindow}
                    onChange={(e) => setMuteWindow(Number(e.target.value))}
                    className="w-32"
                    data-testid="mute-window"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Default time to mute AI when manually disabled
                  </p>
                </div>
              </div>

              <div className="border border-border rounded p-4 bg-muted/20">
                <h4 className="font-semibold mb-2">Gating Rules</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• HR leads start with AI-{aiGatingEnabled ? "on" : "off"} by default</li>
                  <li>• External leads start with AI-{externalAiEnabled ? "on" : "off"} by default</li>
                  <li>• Manual toggle overrides default for {muteWindow} minutes</li>
                  <li>• AI can be permanently disabled per conversation</li>
                </ul>
              </div>

              <Button
                onClick={handleSaveGating}
                disabled={updateGatingMutation.isPending}
                data-testid="save-gating"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Gating Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Follow-up Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="followups-enabled">Enable Follow-ups</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send follow-up messages to inactive leads
                    </p>
                  </div>
                  <Switch
                    id="followups-enabled"
                    checked={followupsEnabled}
                    onCheckedChange={setFollowupsEnabled}
                    data-testid="followups-enabled"
                  />
                </div>

                {followupsEnabled && (
                  <>
                    <div>
                      <Label htmlFor="max-followups">Maximum Follow-ups</Label>
                      <Input
                        id="max-followups"
                        type="number"
                        min="1"
                        max="10"
                        value={maxFollowups}
                        onChange={(e) => setMaxFollowups(Number(e.target.value))}
                        className="w-32"
                        data-testid="max-followups"
                      />
                    </div>

                    <div>
                      <Label>Follow-up Intervals</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <Label htmlFor="interval-1" className="text-sm">1st Follow-up</Label>
                          <Select defaultValue="24">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="24">24 hours</SelectItem>
                              <SelectItem value="48">48 hours</SelectItem>
                              <SelectItem value="72">72 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="interval-2" className="text-sm">2nd Follow-up</Label>
                          <Select defaultValue="72">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="72">72 hours</SelectItem>
                              <SelectItem value="96">96 hours</SelectItem>
                              <SelectItem value="120">5 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="interval-3" className="text-sm">3rd Follow-up</Label>
                          <Select defaultValue="168">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="168">1 week</SelectItem>
                              <SelectItem value="336">2 weeks</SelectItem>
                              <SelectItem value="720">1 month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Working Hours</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="start-hour" className="text-sm">Start</Label>
                          <Select defaultValue="9">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, '0')}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="end-hour" className="text-sm">End</Label>
                          <Select defaultValue="18">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, '0')}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleSaveFollowups}
                disabled={updateFollowupsMutation.isPending}
                data-testid="save-followups"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Follow-up Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
                <Button data-testid="invite-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-${user.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.lastActive).toLocaleString("es-AR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="outline" size="sm" data-testid={`edit-user-${user.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`delete-user-${user.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Flag className="h-5 w-5" />
                <span>Feature Flags</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFeatureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between p-4 border border-border rounded">
                    <div>
                      <div className="font-medium">{flag.name}</div>
                      <div className="text-sm text-muted-foreground">{flag.description}</div>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => {
                        toast({
                          title: "Feature Flag Updated",
                          description: `${flag.name} has been ${flag.enabled ? "disabled" : "enabled"}.`,
                        });
                      }}
                      data-testid={`flag-${flag.id}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Audit Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs?.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="flex items-start space-x-4 p-3 border border-border rounded">
                    <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded flex items-center justify-center text-xs font-semibold">
                      {log.actorName?.charAt(0) || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{log.actorName || "System"}</span>{" "}
                        <span className="text-muted-foreground">{log.action}</span>{" "}
                        <span className="font-mono text-primary">{log.target}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(log.createdAt).toLocaleString("es-AR")}
                      </div>
                    </div>
                  </div>
                )) || (
                  // Mock audit log entries
                  [
                    {
                      id: "1",
                      actorName: "Juan Díaz",
                      action: "updated agent prompt for",
                      target: "Closer",
                      createdAt: "2024-01-15T16:34:12Z"
                    },
                    {
                      id: "2",
                      actorName: "María García",
                      action: "enabled AI for conversation",
                      target: "cw_1a2b3c",
                      createdAt: "2024-01-15T16:30:45Z"
                    },
                    {
                      id: "3",
                      actorName: "System",
                      action: "created job",
                      target: "job_qualifier_001",
                      createdAt: "2024-01-15T16:28:30Z"
                    }
                  ].map((log) => (
                    <div key={log.id} className="flex items-start space-x-4 p-3 border border-border rounded">
                      <div className="w-8 h-8 bg-secondary text-secondary-foreground rounded flex items-center justify-center text-xs font-semibold">
                        {log.actorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className="font-medium">{log.actorName}</span>{" "}
                          <span className="text-muted-foreground">{log.action}</span>{" "}
                          <span className="font-mono text-primary">{log.target}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleString("es-AR")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>Billing Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <SettingsIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Billing configuration coming soon</p>
                <p className="text-sm">Usage tracking and cost management</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
