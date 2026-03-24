/**
 * Link Automation context types.
 * Defines the domain model for link scanning, ranking, and injection.
 */

import type { PostId, WPPostId, LinkSuggestionId } from '@/shared/kernel/BrandedTypes';

export type LinkStatus = 'pending' | 'accepted' | 'rejected' | 'applied';

export interface LinkSuggestion {
  readonly id: LinkSuggestionId;
  readonly sourcePostId: PostId;
  readonly targetPostId: PostId;
  readonly anchorText: string;
  readonly similarityScore: number;
  readonly contextSnippet: string | null;
  readonly status: LinkStatus;
  readonly createdAt: string;
  readonly appliedAt: string | null;
}

export interface ExistingLink {
  readonly href: string;
  readonly anchorText: string;
  readonly isInternal: boolean;
}

export interface LinkScanResult {
  readonly postId: PostId;
  readonly existingLinks: ExistingLink[];
  readonly wordCount: number;
  readonly linkDensity: number;
}

export interface LinkRankingInput {
  readonly sourcePostId: PostId;
  readonly candidates: Array<{
    targetPostId: PostId;
    similarity: number;
    title: string;
    slug: string;
  }>;
  readonly existingLinks: ExistingLink[];
  readonly maxSuggestions: number;
}

export interface LinkInjectionResult {
  readonly postId: PostId;
  readonly wpPostId: WPPostId;
  readonly originalContent: string;
  readonly modifiedContent: string;
  readonly linksInjected: number;
}
