/**
 * Supabase adapter implementing IEmbeddingProvider port.
 * Delegates to the compute-embeddings edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err } from '@/shared/kernel/Result';
import type { IEmbeddingProvider, EmbeddingResult } from '@/contexts/link-automation/ports/IEmbeddingProvider';

export class SupabaseEmbeddingProvider implements IEmbeddingProvider {
  async computeEmbeddings(
    texts: string[],
    postIds: string[]
  ): Promise<Result<EmbeddingResult[], Error>> {
    const { data, error } = await supabase.functions.invoke('compute-embeddings', {
      body: { texts, postIds },
    });

    if (error) return Err(new Error(error.message));
    if (data?.error) return Err(new Error(data.error));

    const results: EmbeddingResult[] = (data?.embeddings ?? []).map(
      (emb: { postId: string; embedding: number[] }) => ({
        postId: emb.postId,
        embedding: emb.embedding,
      })
    );

    return Ok(results);
  }
}
