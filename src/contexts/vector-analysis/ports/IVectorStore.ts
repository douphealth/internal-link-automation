/**
 * Port: Vector Store interface.
 * Decouples vector analysis domain from Supabase pgvector infrastructure.
 */

import { Result } from '@/shared/kernel/Result';
import type { SimilarPost } from '../types';

export interface IVectorStore {
  storeEmbedding(postId: string, embedding: number[], modelVersion?: string): Promise<Result<void, Error>>;
  storeEmbeddingsBatch(items: Array<{ postId: string; embedding: number[] }>, modelVersion?: string): Promise<Result<number, Error>>;
  findSimilarPosts(queryEmbedding: number[], options?: {
    threshold?: number;
    limit?: number;
    excludePostId?: string;
  }): Promise<Result<SimilarPost[], Error>>;
  getEmbedding(postId: string): Promise<Result<number[] | null, Error>>;
}
