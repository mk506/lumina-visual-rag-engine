-- Create videos table to store uploaded video metadata
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_segments table to store analyzed segments with embeddings
CREATE TABLE public.video_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  timestamp_display TEXT NOT NULL,
  frame_path TEXT,
  transcript TEXT,
  description TEXT,
  ocr_text TEXT,
  detected_objects JSONB DEFAULT '{}',
  embedding_text TEXT,
  confidence_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_qa_history table for Q&A conversations
CREATE TABLE public.video_qa_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  relevant_timestamps JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_video_segments_video_id ON public.video_segments(video_id);
CREATE INDEX idx_video_segments_timestamp ON public.video_segments(timestamp_seconds);
CREATE INDEX idx_video_qa_video_id ON public.video_qa_history(video_id);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_qa_history ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required for this demo)
CREATE POLICY "Allow public read access to videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to videos" ON public.videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to videos" ON public.videos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to videos" ON public.videos FOR DELETE USING (true);

CREATE POLICY "Allow public read access to video_segments" ON public.video_segments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to video_segments" ON public.video_segments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to video_segments" ON public.video_segments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to video_segments" ON public.video_segments FOR DELETE USING (true);

CREATE POLICY "Allow public read access to video_qa_history" ON public.video_qa_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to video_qa_history" ON public.video_qa_history FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png']);

-- Storage policies for videos bucket
CREATE POLICY "Allow public read access to videos bucket" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Allow public upload to videos bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
CREATE POLICY "Allow public update to videos bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
CREATE POLICY "Allow public delete from videos bucket" ON storage.objects FOR DELETE USING (bucket_id = 'videos');