import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { SuggestionCardSkeleton } from '@/components/shared/Skeletons';
import { StaggerList, StaggerItem } from '@/components/shared/StaggerList';
import { Check, X, Link2, ArrowRight, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Suggestion {
  id: string;
  anchor_text: string;
  similarity_score: number;
  context_snippet: string | null;
  status: string;
  created_at: string;
  source_post: { title: string; url: string } | null;
  target_post: { title: string; url: string } | null;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  accepted: 'bg-primary/10 text-primary border-primary/20',
  applied: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const filters = ['all', 'pending', 'accepted', 'applied', 'rejected'] as const;

function useSuggestions(filter: string) {
  return useQuery({
    queryKey: ['suggestions', filter],
    queryFn: async () => {
      let query = supabase
        .from('link_suggestions')
        .select(`
          id, anchor_text, similarity_score, context_snippet, status, created_at,
          source_post:posts!link_suggestions_source_post_id_fkey(title, url),
          target_post:posts!link_suggestions_target_post_id_fkey(title, url)
        `)
        .order('similarity_score', { ascending: false })
        .limit(50);

      if (filter !== 'all') query = query.eq('status', filter);
      const { data } = await query;
      return (data ?? []) as unknown as Suggestion[];
    },
    staleTime: 15_000,
  });
}

export default function LinkSuggestions() {
  const [filter, setFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { data: suggestions = [], isLoading } = useSuggestions(filter);

  async function updateStatus(id: string, status: string) {
    const updates: Record<string, any> = { status };
    if (status === 'applied') updates.applied_at = new Date().toISOString();

    const { error } = await supabase.from('link_suggestions').update(updates).eq('id', id);
    if (error) {
      toast.error('Failed to update suggestion');
    } else {
      toast.success(`Suggestion ${status}`, {
        description: status === 'accepted' ? 'Ready to be applied.' : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Link Suggestions"
        description="Review and manage AI-generated internal link suggestions."
        badge={
          suggestions.length > 0 ? (
            <Badge variant="secondary" className="text-[10px] font-mono font-bold rounded-md">{suggestions.length}</Badge>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              'h-8 text-xs capitalize rounded-lg',
              filter === f ? 'shadow-soft' : 'border-border/60 hover:bg-muted/60'
            )}
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SuggestionCardSkeleton key={i} />)}
        </div>
      ) : !suggestions.length ? (
        <EmptyState
          icon={Link2}
          title={filter !== 'all' ? `No ${filter} suggestions` : 'No suggestions yet'}
          description={
            filter !== 'all'
              ? `No suggestions with status "${filter}". Try a different filter.`
              : 'Crawl some sites and run the analysis to generate link suggestions.'
          }
        />
      ) : (
        <StaggerList>
          {suggestions.map((s) => (
            <StaggerItem key={s.id}>
              <Card className="transition-all duration-200 hover:shadow-soft overflow-hidden group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Status & score */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] font-bold capitalize rounded-md', statusStyles[s.status])}>
                          {s.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums font-medium">
                            {(s.similarity_score * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>

                      {/* Anchor text */}
                      <p className="font-bold text-sm">
                        <span className="text-primary">"</span>
                        {s.anchor_text}
                        <span className="text-primary">"</span>
                      </p>

                      {/* From → To */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-foreground/70 shrink-0 text-[11px]">From:</span>
                          <span className="truncate">{s.source_post?.title ?? 'Unknown'}</span>
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 hidden sm:block text-muted-foreground/30" />
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-foreground/70 shrink-0 text-[11px]">To:</span>
                          <span className="truncate">{s.target_post?.title ?? 'Unknown'}</span>
                        </span>
                      </div>

                      {/* Context */}
                      {s.context_snippet && (
                        <p className="text-[11px] text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed border border-border/30">
                          …{s.context_snippet}…
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {s.status === 'pending' && (
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg border-success/30 text-success hover:bg-success/8 hover:text-success hover:border-success/50"
                          onClick={() => updateStatus(s.id, 'accepted')}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={() => updateStatus(s.id, 'rejected')}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}