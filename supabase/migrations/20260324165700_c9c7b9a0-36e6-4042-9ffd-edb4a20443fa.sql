
-- 1. Create sites table to track multiple websites
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  source_type text NOT NULL DEFAULT 'generic' CHECK (source_type IN ('wordpress', 'generic')),
  wp_rest_url text,
  wp_username text,
  wp_app_password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON public.sites FOR ALL TO public USING (auth.role() = 'authenticated');

-- 2. Add site_id and source_type to posts, make wp_post_id nullable
ALTER TABLE public.posts ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN source_type text DEFAULT 'wordpress';
ALTER TABLE public.posts ADD COLUMN content text;
ALTER TABLE public.posts ALTER COLUMN wp_post_id DROP NOT NULL;
ALTER TABLE public.posts ALTER COLUMN wp_post_id SET DEFAULT NULL;
