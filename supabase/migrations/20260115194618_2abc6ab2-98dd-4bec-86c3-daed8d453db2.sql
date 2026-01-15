-- Create reels table for educational video content
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'dicas',
  duration_seconds INTEGER CHECK (duration_seconds <= 120),
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create reel interactions table for tracking user engagement
CREATE TABLE public.reel_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  liked BOOLEAN NOT NULL DEFAULT false,
  watched BOOLEAN NOT NULL DEFAULT false,
  watch_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reels (public read, admin write)
CREATE POLICY "Anyone can view active reels"
ON public.reels FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage reels"
ON public.reels FOR ALL
USING (public.is_admin(auth.uid()));

-- RLS Policies for reel_interactions (users manage their own)
CREATE POLICY "Users can view their own interactions"
ON public.reel_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
ON public.reel_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
ON public.reel_interactions FOR UPDATE
USING (auth.uid() = user_id);

-- Create storage bucket for reels videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('reels', 'reels', true, 104857600);

-- Storage policies for reels bucket
CREATE POLICY "Public can view reels"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

CREATE POLICY "Admins can upload reels"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reels' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update reels"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reels' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete reels"
ON storage.objects FOR DELETE
USING (bucket_id = 'reels' AND public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_reels_updated_at
BEFORE UPDATE ON public.reels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reel_interactions_updated_at
BEFORE UPDATE ON public.reel_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;