/**
 * WordPress integration context types.
 */

import type { WPPostId } from '@/shared/kernel/BrandedTypes';

export interface WPPost {
  readonly id: number;
  readonly title: { readonly rendered: string };
  readonly slug: string;
  readonly link: string;
  readonly content: { readonly rendered: string };
  readonly date: string;
  readonly modified: string;
}

export interface WPPagination {
  readonly total: number;
  readonly totalPages: number;
  readonly currentPage: number;
}

export interface FetchPostsResponse {
  readonly posts: WPPost[];
  readonly pagination: WPPagination;
}

export interface SyncedPost {
  readonly id: string;
  readonly wpPostId: WPPostId;
  readonly title: string;
  readonly slug: string;
  readonly url: string;
  readonly contentHash: string;
  readonly wordCount: number;
  readonly status: string;
  readonly fetchedAt: string;
  readonly updatedAt: string;
}
