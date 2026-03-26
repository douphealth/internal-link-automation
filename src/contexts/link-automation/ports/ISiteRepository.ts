/**
 * Port: Site Repository interface.
 * Decouples business logic from Supabase infrastructure.
 */

import { Result } from '@/shared/kernel/Result';

export interface PageData {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly url: string;
  readonly slug: string;
  readonly wordCount: number | null;
  readonly siteId: string;
}

export interface LinkSuggestionData {
  readonly sourcePostId: string;
  readonly targetPostId: string;
  readonly anchorText: string;
  readonly similarityScore: number;
  readonly contextSnippet: string;
  readonly status: string;
}

export interface SimilarPost {
  readonly postId: string;
  readonly wpPostId: number;
  readonly title: string;
  readonly slug: string;
  readonly similarity: number;
}

export interface ISiteRepository {
  getPages(siteId: string, limit?: number): Promise<Result<PageData[], Error>>;
  getExistingEmbeddingIds(postIds: string[]): Promise<Result<Set<string>, Error>>;
  getAllEmbeddings(postIds: string[]): Promise<Result<Map<string, number[]>, Error>>;
  saveLinkSuggestions(suggestions: LinkSuggestionData[]): Promise<Result<void, Error>>;
  findSimilarPosts(embedding: number[], excludePostId: string, threshold?: number, limit?: number): Promise<Result<SimilarPost[], Error>>;
  createBatchJob(siteId: string): Promise<Result<{ id: string }, Error>>;
  updateBatchJob(jobId: string, update: Record<string, unknown>): Promise<Result<void, Error>>;
}
