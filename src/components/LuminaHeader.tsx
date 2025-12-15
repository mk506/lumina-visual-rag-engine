import { Search, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LuminaHeaderProps {
  onUploadClick: () => void;
  onSearchClick: () => void;
}

export function LuminaHeader({ onUploadClick, onSearchClick }: LuminaHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent blur-lg opacity-50" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Lumina</h1>
              <p className="text-xs text-muted-foreground">Visual RAG Engine</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              variant="glass" 
              size="default" 
              onClick={onSearchClick}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button 
              variant="glow" 
              size="default" 
              onClick={onUploadClick}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
