import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, RotateCcw, User, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jobsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs"],
    queryFn: jobsApi.getAll,
  });

  const retryJobMutation = useMutation({
    mutationFn: jobsApi.retry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Retried",
        description: "The job has been queued for retry.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to retry job.",
        variant: "destructive",
      });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: jobsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Cancelled",
        description: "The job has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel job.",
        variant: "destructive",
      });
    },
  });

  const reassignJobMutation = useMutation({
    mutationFn: ({ id, agentType }: { id: string; agentType: string }) => 
      jobsApi.reassign(id, agentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job Reassigned",
        description: "The job has been reassigned to a different agent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reassign job.",
        variant: "destructive",
      });
    },
  });

  const filteredJobs = jobs.filter((job: any) => {
    const matchesSearch = !searchTerm || 
      job.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.chatwootConversationId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || job.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-warning text-warning-foreground",
      processing: "bg-accent text-accent-foreground live-indicator",
      completed: "bg-accent text-accent-foreground",
      failed: "bg-destructive text-destructive-foreground",
      cancelled: "bg-muted text-muted-foreground"
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-muted"}>
        {status}
      </Badge>
    );
  };

  const getJobTypeIcon = (type: string) => {
    // Return appropriate icon based on job type
    return <div className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center font-mono">
      {type?.charAt(0).toUpperCase() || "J"}
    </div>;
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

  const jobCounts = {
    pending: jobs.filter((j: any) => j.status === "pending").length,
    processing: jobs.filter((j: any) => j.status === "processing").length,
    completed: jobs.filter((j: any) => j.status === "completed").length,
    failed: jobs.filter((j: any) => j.status === "failed").length,
    cancelled: jobs.filter((j: any) => j.status === "cancelled").length,
  };

  return (
    <div className="p-6 space-y-6 fade-in" data-testid="jobs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs Queue</h1>
          <p className="text-muted-foreground">Monitor and manage job processing</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="live-indicator">●</span>
          <span className="text-sm text-muted-foreground">Live updates</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{jobCounts.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent live-indicator">{jobCounts.processing}</div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{jobCounts.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{jobCounts.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{jobCounts.cancelled}</div>
              <div className="text-xs text-muted-foreground">Cancelled</div>
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
                placeholder="Search by job ID, type, or conversation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-jobs"
              />
            </div>
            <Button variant="outline" size="sm" data-testid="filter-button">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table with Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending ({jobCounts.pending})</TabsTrigger>
              <TabsTrigger value="processing">Processing ({jobCounts.processing})</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed ({jobCounts.failed})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Conversation</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job: any) => (
                  <TableRow key={job.id} data-testid={`job-${job.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getJobTypeIcon(job.type)}
                        <div>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {job.id.slice(0, 8)}...
                          </code>
                          {job.priority > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Priority: {job.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {job.type || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      {job.agentType ? (
                        <Badge variant="outline" className="font-mono">
                          {job.agentType}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.chatwootConversationId ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {job.chatwootConversationId}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString("es-AR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {(job.status === "failed" || job.status === "cancelled") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryJobMutation.mutate(job.id)}
                            disabled={retryJobMutation.isPending}
                            data-testid={`retry-job-${job.id}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        )}
                        
                        {(job.status === "pending" || job.status === "processing") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelJobMutation.mutate(job.id)}
                            disabled={cancelJobMutation.isPending}
                            data-testid={`cancel-job-${job.id}`}
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reassignJobMutation.mutate({ id: job.id, agentType: "qualifier" })}
                          disabled={reassignJobMutation.isPending || job.status === "completed"}
                          data-testid={`reassign-job-${job.id}`}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Reassign
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
    </div>
  );
}
