import { Clock, Eye, FileText, Tag } from "lucide-react";
import { VideoSegment } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TimelineProps {
  segments: VideoSegment[];
  currentTime: number;
  onSegmentClick: (timestamp: number) => void;
}

export function Timeline({ segments, currentTime, onSegmentClick }: TimelineProps) {
  if (segments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No segments analyzed yet</p>
      </div>
    );
  }

  const maxTime = Math.max(...segments.map((s) => Number(s.timestamp_seconds))) || 1;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground px-1">Video Timeline</h4>
      
      {/* Visual timeline bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Current time indicator */}
        <div 
          className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(currentTime / maxTime) * 100}%` }}
        />
        
        {/* Segment markers */}
        {segments.map((seg, idx) => (
          <button
            key={seg.id}
            onClick={() => onSegmentClick(Number(seg.timestamp_seconds))}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-background hover:scale-150 transition-transform z-10"
            style={{ left: `${(Number(seg.timestamp_seconds) / maxTime) * 100}%` }}
            title={seg.timestamp_display}
          />
        ))}
      </div>

      {/* Segment list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        {segments.map((seg) => {
          const isActive = Math.abs(currentTime - Number(seg.timestamp_seconds)) < 5;
          
          return (
            <button
              key={seg.id}
              onClick={() => onSegmentClick(Number(seg.timestamp_seconds))}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all duration-200",
                "hover:bg-muted/50 group",
                isActive && "bg-primary/10 border border-primary/30"
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "font-mono text-xs px-2 py-1 rounded bg-muted flex-shrink-0",
                  isActive && "bg-primary text-primary-foreground"
                )}>
                  {seg.timestamp_display}
                </span>
                
                <div className="flex-1 min-w-0 space-y-1">
                  {seg.description && (
                    <p className="text-sm text-foreground line-clamp-2 flex items-start gap-1.5">
                      <Eye className="w-3 h-3 mt-1 flex-shrink-0 text-muted-foreground" />
                      {seg.description}
                    </p>
                  )}
                  
                  {seg.transcript && (
                    <p className="text-xs text-muted-foreground line-clamp-1 flex items-start gap-1.5">
                      <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      "{seg.transcript}"
                    </p>
                  )}

                  {seg.detected_objects && Object.keys(seg.detected_objects).length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      {Object.entries(seg.detected_objects).slice(0, 3).map(([obj, count]) => (
                        <span
                          key={obj}
                          className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs"
                        >
                          {obj}:{count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
