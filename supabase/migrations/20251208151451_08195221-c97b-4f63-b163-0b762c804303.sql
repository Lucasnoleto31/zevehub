-- Create storage bucket for educational videos
INSERT INTO storage.buckets (id, name, public) VALUES ('educational-videos', 'educational-videos', true);

-- Storage policies for educational videos
CREATE POLICY "Anyone can view educational videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'educational-videos');

CREATE POLICY "Admins can upload educational videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'educational-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update educational videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'educational-videos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete educational videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'educational-videos' AND public.is_admin(auth.uid()));