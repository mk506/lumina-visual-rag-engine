import { useState, useEffect, useCallback } from "react";
import { Film, Sparkles, ArrowRight, Search, MessageSquare, Zap } from "lucide-react";
import { LuminaHeader } from "@/components/LuminaHeader";
import { VideoUploader } from "@/components/VideoUploader";
import { VideoCard } from "@/components/VideoCard";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SearchPanel } from "@/components/SearchPanel";
import { VideoQA } from "@/components/VideoQA";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { getVideos, getVideo, getVideoSegments, getVideoUrl, Video, VideoSegment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);
  const [showUploader, setShowUploader] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadVideos = useCallback(async () => {
    try {
      const fetchedVideos = await getVideos();
      setVideos(fetchedVideos);
    } catch (error) {
      toast({
        title: "Failed to load videos",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadVideos();
    
    // Poll for status updates
    const interval = setInterval(loadVideos, 10000);
    return () => clearInterval(interval);
  }, [loadVideos]);

  const handleVideoSelect = async (video: Video) => {
    if (video.status !== "ready") {
      toast({
        title: "Video still processing",
        description: "Please wait for the analysis to complete",
      });
      return;
    }

    setSelectedVideo(video);
    setSeekToTime(undefined);
    
    try {
      const videoSegments = await getVideoSegments(video.id);
      setSegments(videoSegments);
    } catch (error) {
      console.error("Failed to load segments:", error);
      setSegments([]);
    }
  };

  const handleSearchResultClick = async (videoId: string, timestamp: number) => {
    if (!selectedVideo || selectedVideo.id !== videoId) {
      const video = await getVideo(videoId);
      if (video) {
        await handleVideoSelect(video);
      }
    }
    setSeekToTime(timestamp);
  };

  const handleTimestampClick = (timestamp: string) => {
    const parts = timestamp.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }
    setSeekToTime(seconds);
  };

  const readyVideos = videos.filter((v) => v.status === "ready");
  const hasVideos = videos.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <LuminaHeader
        onUploadClick={() => setShowUploader(true)}
        onSearchClick={() => setShowSearch(true)}
      />

      <main className="pt-20 pb-12">
        {/* Hero Section - Only show when no video selected */}
        {!selectedVideo && !hasVideos && !isLoading && (
          <section className="container mx-auto px-6 py-24 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary" />
                AI-Powered Video Intelligence
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
                Search <span className="gradient-text">Inside</span>
                <br />Your Videos
              </h1>

              <p className="text-xl text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
                Upload any video and instantly search through its content. Find exact moments using natural language queries.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <Button variant="glow" size="xl" onClick={() => setShowUploader(true)}>
                  <Film className="w-5 h-5" />
                  Upload Your First Video
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 pt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                <div className="glass rounded-2xl p-6 text-left space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Search className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Semantic Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Find moments using natural language. Search for objects, actions, or spoken words.
                  </p>
                </div>

                <div className="glass rounded-2xl p-6 text-left space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg">Video Q&A</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about your video content and get AI-powered answers with timestamps.
                  </p>
                </div>

                <div className="glass rounded-2xl p-6 text-left space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/40 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Instant Seeking</h3>
                  <p className="text-sm text-muted-foreground">
                    Click any search result to jump directly to that exact moment in the video.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Video Library */}
        {hasVideos && !selectedVideo && (
          <section className="container mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Your Videos</h2>
                <p className="text-muted-foreground">
                  {readyVideos.length} of {videos.length} ready for search
                </p>
              </div>
              <Button variant="glow" onClick={() => setShowUploader(true)}>
                <Film className="w-4 h-4" />
                Upload New
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoSelect(video)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Video Player View */}
        {selectedVideo && (
          <section className="container mx-auto px-6 py-8">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedVideo(null);
                  setSegments([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Library
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Player + Timeline */}
              <div className="lg:col-span-2 space-y-6">
                <VideoPlayer
                  src={getVideoUrl(selectedVideo.storage_path)}
                  title={selectedVideo.title}
                  seekToTime={seekToTime}
                  onTimeUpdate={setCurrentTime}
                />

                <div className="glass rounded-2xl p-4">
                  <Timeline
                    segments={segments}
                    currentTime={currentTime}
                    onSegmentClick={(t) => setSeekToTime(t)}
                  />
                </div>
              </div>

              {/* Q&A Panel */}
              <div className="lg:col-span-1 h-[600px]">
                <VideoQA
                  videoId={selectedVideo.id}
                  videoTitle={selectedVideo.title}
                  onTimestampClick={handleTimestampClick}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      <VideoUploader
        open={showUploader}
        onClose={() => setShowUploader(false)}
        onUploadComplete={loadVideos}
      />

      <SearchPanel
        open={showSearch}
        onClose={() => setShowSearch(false)}
        videoId={selectedVideo?.id}
        onResultClick={handleSearchResultClick}
      />
    </div>
  );
}
