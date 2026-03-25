
DROP POLICY IF EXISTS "Authenticated full access" ON public.sites;
CREATE POLICY "Allow all access" ON public.sites FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.posts;
CREATE POLICY "Allow all access" ON public.posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.analytics_events;
CREATE POLICY "Allow all access" ON public.analytics_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.batch_jobs;
CREATE POLICY "Allow all access" ON public.batch_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.cluster_members;
CREATE POLICY "Allow all access" ON public.cluster_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.clusters;
CREATE POLICY "Allow all access" ON public.clusters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.embeddings;
CREATE POLICY "Allow all access" ON public.embeddings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated full access" ON public.link_suggestions;
CREATE POLICY "Allow all access" ON public.link_suggestions FOR ALL USING (true) WITH CHECK (true);
