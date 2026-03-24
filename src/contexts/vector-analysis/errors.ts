/**
 * Vector Analysis domain errors.
 */

export type VectorError =
  | { type: 'EMBEDDING_ERROR'; message: string; postId?: string }
  | { type: 'STORAGE_ERROR'; message: string }
  | { type: 'QUERY_ERROR'; message: string }
  | { type: 'CLUSTERING_ERROR'; message: string }
  | { type: 'WORKER_ERROR'; message: string; workerId?: string }
  | { type: 'DIMENSION_MISMATCH'; expected: number; received: number };
