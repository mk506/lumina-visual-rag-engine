import { supabase } from "@/integrations/supabase/client";

export interface Video {
  id: string;
  title: string;
  filename: string;
  storage_path: string;
  duration_seconds: number | null;
  thumbnail_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VideoSegment {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  timestamp_display: string;
  frame_path: string | null;
  transcript: string | null;
  description: string | null;
  ocr_text: string | null;
  detected_objects: Record<string, number>;
  embedding_text: string | null;
  confidence_score: number;
  created_at: string;
}

export interface SearchResult {
  id: string;
  video_id: string;
  video_title: string;
  video_path: string;
  timestamp_seconds: number;
  timestamp_display: string;
  description: string | null;
  transcript: string | null;
  ocr_text: string | null;
  detected_objects: Record<string, number>;
  relevance_score: number;
  relevance_reason: string;
}

export interface SearchFilters {
  objectName?: string;
  minCount?: number;
}

// Upload video
export async function uploadVideo(file: File, title: string): Promise<Video> {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storagePath = `uploads/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw new Error(`Failed to upload video: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("videos")
    .getPublicUrl(storagePath);

  // Create video record
  const { data: video, error: insertError } = await supabase
    .from("videos")
    .insert({
      title,
      filename,
      storage_path: storagePath,
      status: "processing",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    throw new Error(`Failed to create video record: ${insertError.message}`);
  }

  // Trigger analysis in background
  try {
    await supabase.functions.invoke("analyze-video", {
      body: {
        videoId: video.id,
        videoUrl: urlData.publicUrl,
        title,
      },
    });
  } catch (analysisError) {
    console.error("Analysis trigger error:", analysisError);
    // Don't fail the upload if analysis fails to start
  }

  return video;
}

// Get all videos
export async function getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch videos: ${error.message}`);
  }

  return data || [];
}

// Get video by ID
export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch video: ${error.message}`);
  }

  return data;
}

// Get video segments
export async function getVideoSegments(videoId: string): Promise<VideoSegment[]> {
  const { data, error } = await supabase
    .from("video_segments")
    .select("*")
    .eq("video_id", videoId)
    .order("timestamp_seconds", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch segments: ${error.message}`);
  }

  return data || [];
}

// Search videos
export async function searchVideos(
  query: string,
  videoId?: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke("search-videos", {
    body: { query, videoId, filters },
  });

  if (error) {
    console.error("Search error:", error);
    throw new Error(`Search failed: ${error.message}`);
  }

  return data?.results || [];
}

// Video Q&A
export async function askVideoQuestion(
  videoId: string,
  question: string
): Promise<{ answer: string; relevant_timestamps: string[] }> {
  const { data, error } = await supabase.functions.invoke("video-qa", {
    body: { videoId, question },
  });

  if (error) {
    console.error("Q&A error:", error);
    throw new Error(`Q&A failed: ${error.message}`);
  }

  return {
    answer: data?.answer || "Unable to process question",
    relevant_timestamps: data?.relevant_timestamps || [],
  };
}

// Get video URL
export function getVideoUrl(storagePath: string): string {
  const { data } = supabase.storage.from("videos").getPublicUrl(storagePath);
  return data.publicUrl;
}

// Delete video
export async function deleteVideo(id: string): Promise<void> {
  const video = await getVideo(id);
  if (!video) return;

  // Delete from storage
  await supabase.storage.from("videos").remove([video.storage_path]);

  // Delete from database (segments will cascade)
  const { error } = await supabase.from("videos").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}
