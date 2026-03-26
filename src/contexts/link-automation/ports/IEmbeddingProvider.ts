/**
 * Port: Embedding Provider interface.
 * Decouples embedding computation from specific AI provider (OpenAI, Gemini, etc.).
 */

import { Result } from '@/shared/kernel/Result';

export interface EmbeddingResult {
  readonly postId: string;
  readonly embedding: number[];
}

export interface IEmbeddingProvider {
  computeEmbeddings(
    texts: string[],
    postIds: string[]
  ): Promise<Result<EmbeddingResult[], Error>>;
}
