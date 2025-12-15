import { useState } from "react";
import { Search, Filter, Loader2, Clock, Eye, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchVideos, SearchResult, SearchFilters } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  videoId?: string;
  onResultClick: (videoId: string, timestamp: number) => void;
}

export function SearchPanel({ open, onClose, videoId, onResultClick }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter a search query",
        description: "Type what you're looking for in the video",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchVideos(query.trim(), videoId, filters);
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        toast({
          title: "No results found",
          description: "Try different keywords or remove filters",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result.video_id, result.timestamp_seconds);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] glass-strong border-border/50 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Search className="w-5 h-5 text-primary" />
            Search Inside Videos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for moments, objects, spoken words..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "border-primary text-primary")}
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="glow" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-muted/50 space-y-3 animate-fade-in">
              <h4 className="text-sm font-medium text-muted-foreground">Object Detection Filter</h4>
              <div className="flex gap-3">
                <Input
                  placeholder="Object name (e.g., person, car)"
                  value={filters.objectName || ""}
                  onChange={(e) => setFilters({ ...filters, objectName: e.target.value })}
                  className="flex-1 bg-input"
                />
                <Input
                  type="number"
                  placeholder="Min count"
                  value={filters.minCount || ""}
                  onChange={(e) => setFilters({ ...filters, minCount: parseInt(e.target.value) || undefined })}
                  className="w-24 bg-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 py-2">
          {results.length > 0 ? (
            results.map((result) => (
              <div
                key={`${result.id}-${result.timestamp_seconds}`}
                onClick={() => handleResultClick(result)}
                className="search-result-card"
              >
                <div className="flex items-start gap-4">
                  {/* Timestamp */}
                  <div className="flex-shrink-0 w-20 h-12 rounded-lg bg-muted flex items-center justify-center font-mono text-sm text-primary">
                    <Clock className="w-3 h-3 mr-1" />
                    {result.timestamp_display}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground truncate">
                        {result.video_title}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="confidence-bar w-16"
                          style={{ opacity: result.relevance_score }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {(result.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {result.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                        <Eye className="w-3 h-3 mt-1 flex-shrink-0" />
                        {result.description}
                      </p>
                    )}

                    {result.transcript && (
                      <p className="text-sm text-muted-foreground line-clamp-1 flex items-start gap-1.5">
                        <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                        "{result.transcript}"
                      </p>
                    )}

                    {result.detected_objects && Object.keys(result.detected_objects).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {Object.entries(result.detected_objects).map(([obj, count]) => (
                          <span
                            key={obj}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                          >
                            {obj}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Search for moments inside your videos</p>
              <p className="text-sm mt-1">Use natural language to find specific scenes, objects, or spoken words</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
