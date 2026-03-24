/**
 * Analytics context types.
 */

import type { AnalyticsEventId } from '@/shared/kernel/BrandedTypes';

export type AnalyticsEventType =
  | 'link_suggested'
  | 'link_applied'
  | 'link_rejected'
  | 'batch_started'
  | 'batch_completed'
  | 'batch_failed'
  | 'posts_synced'
  | 'embeddings_computed'
  | 'clusters_computed';

export interface AnalyticsEvent {
  readonly id: AnalyticsEventId;
  readonly eventType: AnalyticsEventType;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}

export interface AnalyticsSummary {
  readonly totalLinksApplied: number;
  readonly totalLinksSuggested: number;
  readonly totalBatchesRun: number;
  readonly avgSimilarityScore: number;
  readonly topLinkedPosts: Array<{ postId: string; title: string; linkCount: number }>;
}
