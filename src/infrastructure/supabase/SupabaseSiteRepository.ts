/**
 * Supabase adapter implementing ISiteRepository port.
 * Decouples link-automation domain from Supabase infrastructure.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err } from '@/shared/kernel/Result';
import type { ISiteRepository, PageData, LinkSuggestionData, SimilarPost } from '@/contexts/link-automation/ports/ISiteRepository';

export class SupabaseSiteRepository implements ISiteRepository {
  async getPages(siteId: string, limit?: number): Promise<Result<PageData[], Error>> {
    const allPages: PageData[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, url, slug, word_count, site_id')
        .eq('site_id', siteId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) return Err(new Error(error.message));

      for (const p of data ?? []) {
        allPages.push({
          id: p.id,
          title: p.title,
          content: p.content ?? '',
          url: p.url,
          slug: p.slug,
          wordCount: p.word_count,
          siteId: p.site_id ?? siteId,
        });
      }

      if (!data || data.length < PAGE_SIZE) break;
      if (limit && allPages.length >= limit) break;
      page++;
    }

    return Ok(limit ? allPages.slice(0, limit) : allPages);
  }

  async getExistingEmbeddingIds(postIds: string[]): Promise<Result<Set<string>, Error>> {
    const ids = new Set<string>();
    for (let i = 0; i < postIds.length; i += 500) {
      const batch = postIds.slice(i, i + 500);
      const { data, error } = await supabase.from('embeddings').select('post_id').in('post_id', batch);
      if (error) return Err(new Error(error.message));
      for (const e of data ?? []) ids.add(e.post_id);
    }
    return Ok(ids);
  }

  async getAllEmbeddings(postIds: string[]): Promise<Result<Map<string, number[]>, Error>> {
    const map = new Map<string, number[]>();
    for (let i = 0; i < postIds.length; i += 500) {
      const batch = postIds.slice(i, i + 500);
      const { data, error } = await supabase.from('embeddings').select('post_id, embedding').in('post_id', batch);
      if (error) return Err(new Error(error.message));
      for (const emb of data ?? []) {
        try {
          const parsed = typeof emb.embedding === 'string' ? JSON.parse(emb.embedding) : emb.embedding;
          map.set(emb.post_id, parsed);
        } catch (_e) {
          // skip unparseable embeddings
        }
      }
    }
    return Ok(map);
  }

  async saveLinkSuggestions(suggestions: LinkSuggestionData[]): Promise<Result<void, Error>> {
    if (suggestions.length === 0) return Ok(undefined);

    const rows = suggestions.map((s) => ({
      source_post_id: s.sourcePostId,
      target_post_id: s.targetPostId,
      anchor_text: s.anchorText,
      similarity_score: s.similarityScore,
      context_snippet: s.contextSnippet,
      status: s.status || 'pending',
    }));

    const { error } = await supabase
      .from('link_suggestions')
      .upsert(rows, { onConflict: 'source_post_id,target_post_id' });

    if (error) return Err(new Error(error.message));
    return Ok(undefined);
  }

  async findSimilarPosts(
    embedding: number[],
    excludePostId: string,
    threshold = 0.15,
    limit = 10
  ): Promise<Result<SimilarPost[], Error>> {
    const embeddingStr = `[${embedding.join(',')}]`;
    const { data, error } = await supabase.rpc('match_posts', {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: limit,
      exclude_post_id: excludePostId,
    });

    if (error) return Err(new Error(error.message));
    return Ok(
      (data ?? []).map((s: { post_id: string; wp_post_id: number; title: string; slug: string; similarity: number }) => ({
        postId: s.post_id,
        wpPostId: s.wp_post_id,
        title: s.title,
        slug: s.slug,
        similarity: s.similarity,
      }))
    );
  }

  async createBatchJob(siteId: string): Promise<Result<{ id: string }, Error>> {
    const { data, error } = await supabase
      .from('batch_jobs')
      .insert({
        status: 'running',
        phase: 'init',
        progress: 0,
        total: 0,
        started_at: new Date().toISOString(),
        metadata: { siteId },
      })
      .select('id')
      .single();

    if (error || !data) return Err(new Error(error?.message ?? 'Failed to create batch job'));
    return Ok({ id: data.id });
  }

  async updateBatchJob(jobId: string, update: Record<string, unknown>): Promise<Result<void, Error>> {
    const { error } = await supabase.from('batch_jobs').update(update).eq('id', jobId);
    if (error) return Err(new Error(error.message));
    return Ok(undefined);
  }
}
