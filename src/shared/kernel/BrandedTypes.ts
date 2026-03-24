/**
 * Branded Types for compile-time ID safety.
 * Prevents accidental mixing of semantically different string/number IDs.
 *
 * @example
 * const postId = createPostId('abc-123');
 * const clusterId = createClusterId('xyz-789');
 * // postId cannot be passed where clusterId is expected — compile error!
 */

declare const __brand: unique symbol;

/** Brand a base type with a unique tag */
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ─── Branded ID Types ────────────────────────────────────────────

export type PostId = Brand<string, 'PostId'>;
export type WPPostId = Brand<number, 'WPPostId'>;
export type EmbeddingId = Brand<string, 'EmbeddingId'>;
export type ClusterId = Brand<string, 'ClusterId'>;
export type LinkSuggestionId = Brand<string, 'LinkSuggestionId'>;
export type BatchJobId = Brand<string, 'BatchJobId'>;
export type AnalyticsEventId = Brand<string, 'AnalyticsEventId'>;

// ─── Factory Functions ───────────────────────────────────────────

export function createPostId(id: string): PostId {
  return id as PostId;
}

export function createWPPostId(id: number): WPPostId {
  return id as WPPostId;
}

export function createEmbeddingId(id: string): EmbeddingId {
  return id as EmbeddingId;
}

export function createClusterId(id: string): ClusterId {
  return id as ClusterId;
}

export function createLinkSuggestionId(id: string): LinkSuggestionId {
  return id as LinkSuggestionId;
}

export function createBatchJobId(id: string): BatchJobId {
  return id as BatchJobId;
}

export function createAnalyticsEventId(id: string): AnalyticsEventId {
  return id as AnalyticsEventId;
}
