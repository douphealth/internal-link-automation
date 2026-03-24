
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_post_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_wp_id ON public.posts(wp_post_id);
CREATE INDEX idx_posts_status ON public.posts(status);

-- Embeddings table with pgvector
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_post_embedding UNIQUE (post_id, model_version)
);

CREATE INDEX idx_embeddings_hnsw ON public.embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Link suggestions table
CREATE TABLE public.link_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  target_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  similarity_score FLOAT NOT NULL,
  context_snippet TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  CONSTRAINT no_self_link CHECK (source_post_id != target_post_id),
  CONSTRAINT unique_link_pair UNIQUE (source_post_id, target_post_id)
);

CREATE INDEX idx_links_source ON public.link_suggestions(source_post_id);
CREATE INDEX idx_links_status ON public.link_suggestions(status);
CREATE INDEX idx_links_score ON public.link_suggestions(similarity_score DESC);

-- Clusters table
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  centroid vector(384),
  post_count INTEGER DEFAULT 0,
  coherence FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cluster_members (
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  distance FLOAT NOT NULL,
  PRIMARY KEY (cluster_id, post_id)
);

-- Analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_time ON public.analytics_events(created_at DESC);

-- Batch jobs table
CREATE TABLE public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'idle',
  phase TEXT DEFAULT 'init',
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Enable Realtime on batch_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_jobs;

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated full access (single-tenant app)
CREATE POLICY "Authenticated full access" ON public.posts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.embeddings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.link_suggestions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.clusters FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.cluster_members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.analytics_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON public.batch_jobs FOR ALL USING (auth.role() = 'authenticated');

-- pgvector similarity search function
CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 20,
  exclude_post_id UUID DEFAULT NULL
)
RETURNS TABLE (
  post_id UUID,
  wp_post_id INTEGER,
  title TEXT,
  slug TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.wp_post_id,
    p.title,
    p.slug,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.embeddings e
  JOIN public.posts p ON p.id = e.post_id
  WHERE (1 - (e.embedding <=> query_embedding))::FLOAT > match_threshold
    AND (exclude_post_id IS NULL OR p.id != exclude_post_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
