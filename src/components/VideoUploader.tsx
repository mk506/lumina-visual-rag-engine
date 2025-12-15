import { useState, useCallback } from "react";
import { Upload, X, Film, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadVideo } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface VideoUploaderProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export function VideoUploader({ open, onClose, onUploadComplete }: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, etc.)",
        variant: "destructive",
      });
    }
  }, [title, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video and enter a title",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadVideo(file, title.trim());
      setUploadComplete(true);
      toast({
        title: "Upload successful!",
        description: "Your video is being analyzed. This may take a few moments.",
      });
      
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 2000);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle("");
    setIsUploading(false);
    setUploadComplete(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl glass-strong border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="w-5 h-5 text-primary" />
            Upload Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Drop Zone */}
          <div
            className={`upload-zone text-center ${isDragging ? "drag-over" : ""} ${file ? "border-primary bg-primary/5" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploadComplete ? (
              <div className="flex flex-col items-center gap-4 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">AI analysis in progress...</p>
                </div>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Film className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground truncate max-w-xs">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Drop your video here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Video Title</label>
            <Input
              placeholder="Enter a title for your video..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input border-border"
              disabled={isUploading || uploadComplete}
            />
          </div>

          {/* Upload Button */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="glow"
              onClick={handleUpload}
              disabled={!file || !title.trim() || isUploading || uploadComplete}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
