-- Create storage bucket for published sites
INSERT INTO storage.buckets (id, name, public)
VALUES ('published-sites', 'published-sites', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to published sites
CREATE POLICY "Published sites are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'published-sites');

-- Allow authenticated users to upload their own sites
CREATE POLICY "Users can upload their own published sites"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'published-sites' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own sites
CREATE POLICY "Users can update their own published sites"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'published-sites' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own sites
CREATE POLICY "Users can delete their own published sites"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'published-sites' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add subdomain column to projects for tracking
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Create index for fast subdomain lookups
CREATE INDEX IF NOT EXISTS idx_projects_subdomain ON public.projects(subdomain) WHERE subdomain IS NOT NULL;