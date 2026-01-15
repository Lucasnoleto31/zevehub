-- Add attachment_url column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to the bucket
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Allow anyone to read message attachments (since they're linked to messages)
CREATE POLICY "Anyone can read message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Allow admins to delete message attachments
CREATE POLICY "Admins can delete message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');