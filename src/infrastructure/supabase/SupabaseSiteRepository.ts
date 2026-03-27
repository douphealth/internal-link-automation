/**
 * Supabase adapter implementing ISiteRepository port.
 * Decouples link-automation domain from Supabase infrastructure.
 */

import { supabase } from '@/integrations/supabase/client';
import { Result, Ok, Err } from '@/shared/kernel/Result';
import type { ISiteRepository, Page, LinkSuggestion } from '@/contexts/link-automation/ports/ISiteRepository';

export class SupabaseSiteRepository implements ISiteRepository {
  async getPages(siteId: string): Promise<Result<Page[], Error>> {
    const allPages: Page[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, url')
        .eq('site_id', siteId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) return Err(new Error(error.message));

      for (const p of data ?? []) {
        allPages.push({ id: p.id, title: p.title, content: p.content ?? '', url: p.url });
      }

      if (!data || data.length < PAGE_SIZE) break;
      page++;
    }

    return Ok(allPages);
  }

  async saveLinkSuggestions(suggestions: LinkSuggestion[]): Promise<Result<void, Error>> {
    if (suggestions.length === 0) return Ok(undefined);

    const rows = suggestions.map((s) => ({
      source_post_id: s.sourcePostId,
      target_post_id: s.targetPostId,
      anchor_text: s.anchorText,
      similarity_score: s.similarityScore,
      context_snippet: s.contextSnippet,
      status: 'pending',
    }));

    const { error } = await supabase
      .from('link_suggestions')
      .upsert(rows, { onConflict: 'source_post_id,target_post_id' });

    if (error) return Err(new Error(error.message));
    return Ok(undefined);
  }
}
