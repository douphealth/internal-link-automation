/**
 * WordPress client service.
 * All WP API calls route through Supabase Edge Functions — never directly to WP.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err } from '@/shared/kernel/Result';
import type { FetchPostsResponse, WPPost } from '../types';
import type { WordPressError } from '../errors';

/**
 * Fetch posts via the wp-proxy Edge Function.
 */
export async function fetchPosts(
  page: number = 1,
  perPage: number = 20,
  search?: string
): Promise<Result<FetchPostsResponse, WordPressError>> {
  const body: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
  };
  if (search) body.search = search;

  const { data, error } = await supabase.functions.invoke('wp-proxy', {
    body,
  });

  if (error) {
    return Err({ type: 'NETWORK_ERROR', message: error.message });
  }

  if (data?.error) {
    if (String(data.error).includes('Rate limit')) {
      return Err({ type: 'RATE_LIMITED', message: data.error });
    }
    if (String(data.error).includes('credentials')) {
      return Err({ type: 'CREDENTIALS_MISSING', message: data.error });
    }
    return Err({ type: 'WP_API_ERROR', message: data.error, status: 502 });
  }

  return Ok(data as FetchPostsResponse);
}

/**
 * Update post content via the wp-update Edge Function.
 */
export async function updatePostContent(
  wpPostId: number,
  content: string
): Promise<Result<WPPost, WordPressError>> {
  const { data, error } = await supabase.functions.invoke('wp-update', {
    body: { wpPostId, content },
  });

  if (error) {
    return Err({ type: 'NETWORK_ERROR', message: error.message });
  }

  if (!data?.success) {
    return Err({
      type: 'WP_API_ERROR',
      message: data?.error || 'Unknown error',
      status: 500,
    });
  }

  return Ok(data.post as WPPost);
}
