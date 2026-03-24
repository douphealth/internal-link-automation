/**
 * Vector Analysis context types.
 */

import type { PostId, ClusterId, EmbeddingId } from '@/shared/kernel/BrandedTypes';

export interface PostEmbedding {
  readonly id: EmbeddingId;
  readonly postId: PostId;
  readonly embedding: Float32Array;
  readonly modelVersion: string;
  readonly createdAt: string;
}

export interface SimilarPost {
  readonly postId: PostId;
  readonly wpPostId: number;
  readonly title: string;
  readonly slug: string;
  readonly similarity: number;
}

export interface Cluster {
  readonly id: ClusterId;
  readonly label: string | null;
  readonly centroid: Float32Array | null;
  readonly postCount: number;
  readonly coherence: number;
  readonly createdAt: string;
}

export interface ClusterMember {
  readonly clusterId: ClusterId;
  readonly postId: PostId;
  readonly distance: number;
}

export interface ClusteringResult {
  readonly clusters: Cluster[];
  readonly members: ClusterMember[];
  readonly totalPosts: number;
  readonly avgCoherence: number;
}

/** Worker message types for typed worker communication */
export type WorkerRequest =
  | { type: 'cosine_similarity'; vectorA: Float32Array; vectorB: Float32Array }
  | { type: 'batch_cosine'; query: Float32Array; corpus: Float32Array[]; ids: string[] }
  | { type: 'kmeans'; vectors: Float32Array[]; k: number; maxIterations: number };

export type WorkerResponse =
  | { type: 'cosine_result'; similarity: number }
  | { type: 'batch_cosine_result'; results: Array<{ id: string; similarity: number }> }
  | { type: 'kmeans_result'; assignments: number[]; centroids: Float32Array[] }
  | { type: 'error'; message: string };
