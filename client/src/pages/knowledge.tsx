import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Brain, Upload, Link, Search, Tag, FileText, 
  Trash2, RefreshCw, Eye, Settings, Filter 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { knowledgeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeStatus, KnowledgeSearchResult } from "@/types";

const statusColors = {
  queued: "bg-warning text-warning-foreground",
  embedding: "bg-accent text-accent-foreground live-indicator",
  ready: "bg-accent text-accent-foreground",
  failed: "bg-destructive text-destructive-foreground"
};

const sourceTypeIcons = {
  pdf: "📄",
  csv: "📊",
  md: "📝",
  url: "🔗",
  text: "📄"
};

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState<KnowledgeSearchResult[]>([]);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadLang, setUploadLang] = useState("es");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: knowledgeItems = [], isLoading } = useQuery({
    queryKey: ["/api/knowledge"],
    queryFn: knowledgeApi.getAll,
  });

  const createKnowledgeMutation = useMutation({
    mutationFn: knowledgeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      setUploadUrl("");
      setUploadTitle("");
      setUploadTags("");
      toast({
        title: "Knowledge Added",
        description: "Knowledge item has been queued for processing.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add knowledge item.",
        variant: "destructive",
      });
    },
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: knowledgeApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({
        title: "Knowledge Deleted",
        description: "Knowledge item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete knowledge item.",
        variant: "destructive",
      });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: knowledgeApi.reindex,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      toast({
        title: "Reindexing Started",
        description: "Knowledge item is being reprocessed.",
      });
    },
  });

  const searchKnowledgeMutation = useMutation({
    mutationFn: ({ query, topK }: { query: string; topK: number }) =>
      knowledgeApi.search(query, topK),
    onSuccess: (results) => {
      setRagResults(results);
    },
  });

  const handleAddUrl = () => {
    if (!uploadUrl.trim() || !uploadTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both URL and title.",
        variant: "destructive",
      });
      return;
    }

    createKnowledgeMutation.mutate({
      orgId: "org-1", // Mock org ID
      title: uploadTitle,
      sourceType: "url",
      url: uploadUrl,
      tags: uploadTags.split(",").map(t => t.trim()).filter(Boolean),
      lang: uploadLang,
      status: "queued"
    });
  };

  const handleSearch = () => {
    if (!ragQuery.trim()) return;
    
    searchKnowledgeMutation.mutate({
      query: ragQuery,
      topK: 5
    });
  };

  const filteredItems = knowledgeItems.filter((item: any) => {
    return !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const getStatusBadge = (status: KnowledgeStatus) => (
    <Badge className={statusColors[status]}>
      {status}
    </Badge>
  );

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
    <div className="p-6 space-y-6 fade-in" data-testid="knowledge-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Hub</h1>
          <p className="text-muted-foreground">Manage knowledge sources for AI agents</p>
        </div>
        <Badge variant="outline" className="font-mono">
          {knowledgeItems.length} items • {knowledgeItems.filter((item: any) => item.status === "ready").length} ready
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Add Knowledge</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com/document.pdf"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    data-testid="knowledge-url-input"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Document title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    data-testid="knowledge-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="industry, ICP, sales"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    data-testid="knowledge-tags-input"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={uploadLang} onValueChange={setUploadLang}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddUrl}
                  disabled={createKnowledgeMutation.isPending}
                  className="w-full"
                  data-testid="add-knowledge-url"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Add URL
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Drag & drop files here</p>
                  <p className="text-sm text-muted-foreground">PDF, CSV, MD files supported</p>
                  <Button variant="outline" className="mt-4" disabled>
                    Choose Files
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* RAG Test Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>RAG Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rag-query">Query</Label>
              <Textarea
                id="rag-query"
                placeholder="Ask a question about your knowledge base..."
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                className="min-h-[100px]"
                data-testid="rag-query-input"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchKnowledgeMutation.isPending || !ragQuery.trim()}
              className="w-full"
              data-testid="search-knowledge"
            >
              <Search className="h-4 w-4 mr-2" />
              {searchKnowledgeMutation.isPending ? "Searching..." : "Search"}
            </Button>

            {ragResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Results</h4>
                {ragResults.map((result, index) => (
                  <div key={index} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{result.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {(result.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {result.source}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Knowledge Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Items</span>
                <span className="font-bold">{knowledgeItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ready</span>
                <span className="font-bold text-accent">
                  {knowledgeItems.filter((item: any) => item.status === "ready").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Processing</span>
                <span className="font-bold text-warning">
                  {knowledgeItems.filter((item: any) => item.status === "embedding").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-bold text-destructive">
                  {knowledgeItems.filter((item: any) => item.status === "failed").length}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Storage Used</span>
                <span className="text-sm font-mono">2.3 GB</span>
              </div>
              <Progress value={45} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">45% of 5 GB limit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Knowledge Items</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="search-knowledge-items"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No knowledge items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: any) => (
                  <TableRow key={item.id} data-testid={`knowledge-item-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {sourceTypeIcons[item.sourceType as keyof typeof sourceTypeIcons]}
                        </span>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.url && (
                            <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                              {item.url}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.sourceType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {item.bytes ? `${(item.bytes / 1024).toFixed(1)} KB` : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("es-AR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reindexMutation.mutate(item.id)}
                          disabled={reindexMutation.isPending}
                          data-testid={`reindex-${item.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`view-${item.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteKnowledgeMutation.mutate(item.id)}
                          disabled={deleteKnowledgeMutation.isPending}
                          data-testid={`delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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
