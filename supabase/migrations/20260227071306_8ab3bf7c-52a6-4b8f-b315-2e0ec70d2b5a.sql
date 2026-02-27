
-- Create storage bucket for ads media
INSERT INTO storage.buckets (id, name, public)
VALUES ('ads-media', 'ads-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to ads-media
CREATE POLICY "Authenticated users can upload ads media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ads-media');

-- Allow public read access
CREATE POLICY "Public read access for ads media"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads-media');

-- Allow owners to update their uploads
CREATE POLICY "Users can update own ads media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ads-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow owners to delete their uploads
CREATE POLICY "Users can delete own ads media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ads-media' AND (storage.foldername(name))[1] = auth.uid()::text);
