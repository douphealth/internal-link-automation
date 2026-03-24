/**
 * Supabase pgvector store service.
 * Handles embedding storage and similarity search via Postgres.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err } from '@/shared/kernel/Result';
import type { SimilarPost } from '../types';
import type { VectorError } from '../errors';

/**
 * Store a single embedding in Supabase.
 */
export async function storeEmbedding(
  postId: string,
  embedding: number[],
  modelVersion: string = 'all-MiniLM-L6-v2'
): Promise<Result<void, VectorError>> {
  const { error } = await supabase
    .from('embeddings')
    .upsert(
      {
        post_id: postId,
        embedding: JSON.stringify(embedding),
        model_version: modelVersion,
      },
      { onConflict: 'post_id,model_version' }
    );

  if (error) {
    return Err({ type: 'STORAGE_ERROR', message: error.message });
  }

  return Ok(undefined);
}

/**
 * Batch store embeddings.
 */
export async function storeEmbeddingsBatch(
  items: Array<{ postId: string; embedding: number[] }>,
  modelVersion: string = 'all-MiniLM-L6-v2'
): Promise<Result<number, VectorError>> {
  const rows = items.map((item) => ({
    post_id: item.postId,
    embedding: JSON.stringify(item.embedding),
    model_version: modelVersion,
  }));

  const { error } = await supabase
    .from('embeddings')
    .upsert(rows, { onConflict: 'post_id,model_version' });

  if (error) {
    return Err({ type: 'STORAGE_ERROR', message: error.message });
  }

  return Ok(items.length);
}

/**
 * Find similar posts using pgvector cosine similarity (executes IN Postgres).
 */
export async function findSimilarPosts(
  queryEmbedding: number[],
  options: {
    threshold?: number;
    limit?: number;
    excludePostId?: string;
  } = {}
): Promise<Result<SimilarPost[], VectorError>> {
  const {
    threshold = 0.7,
    limit = 20,
    excludePostId = null,
  } = options;

  const { data, error } = await supabase.rpc('match_posts', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    exclude_post_id: excludePostId,
  });

  if (error) {
    return Err({ type: 'QUERY_ERROR', message: error.message });
  }

  const results: SimilarPost[] = ((data as Record<string, unknown>[]) || []).map((row) => ({
    postId: row.post_id as string,
    wpPostId: row.wp_post_id as number,
    title: row.title as string,
    slug: row.slug as string,
    similarity: row.similarity as number,
  })) as SimilarPost[];

  return Ok(results);
}

/**
 * Get embedding for a specific post.
 */
export async function getEmbedding(
  postId: string
): Promise<Result<number[] | null, VectorError>> {
  const { data, error } = await supabase
    .from('embeddings')
    .select('embedding')
    .eq('post_id', postId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return Err({ type: 'QUERY_ERROR', message: error.message });
  }

  return Ok((data?.embedding as unknown as number[] | undefined) || null);
}
