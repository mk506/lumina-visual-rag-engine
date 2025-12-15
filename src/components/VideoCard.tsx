import { Film, Clock, Loader2, CheckCircle, AlertCircle, Play } from "lucide-react";
import { Video } from "@/lib/api";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  onClick: () => void;
  isSelected?: boolean;
}

export function VideoCard({ video, onClick, isSelected }: VideoCardProps) {
  const statusConfig = {
    processing: {
      icon: Loader2,
      label: "Analyzing",
      className: "text-yellow-500 animate-spin",
    },
    ready: {
      icon: CheckCircle,
      label: "Ready",
      className: "text-primary",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      className: "text-destructive",
    },
  };

  const status = statusConfig[video.status as keyof typeof statusConfig] || statusConfig.processing;
  const StatusIcon = status.icon;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
        isSelected && "border-primary shadow-lg shadow-primary/20"
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Film className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(video.duration_seconds)}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {new Date(video.created_at).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn("w-4 h-4", status.className)} />
            <span className="text-muted-foreground">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
}
