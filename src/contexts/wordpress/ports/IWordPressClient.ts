/**
 * Port: WordPress Client interface.
 * Decouples WordPress domain logic from Supabase Edge Function infrastructure.
 */

import { Result } from '@/shared/kernel/Result';
import type { FetchPostsResponse, WPPost } from '../types';

export interface IWordPressClient {
  fetchPosts(page?: number, perPage?: number, search?: string): Promise<Result<FetchPostsResponse, Error>>;
  updatePostContent(wpPostId: number, content: string): Promise<Result<WPPost, Error>>;
}
