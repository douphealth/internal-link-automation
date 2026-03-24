import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, ExternalLink, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LinkSuggestionData {
  id: string;
  anchor_text: string;
  similarity_score: number;
  context_snippet: string | null;
  status: string;
  target_title?: string;
  target_url?: string;
}

interface Props {
  suggestion: LinkSuggestionData;
  onStatusChange: (id: string, status: string) => void;
}

function getScoreStyle(score: number): string {
  if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-orange-600 bg-orange-50 border-orange-200';
}

function getScoreLabel(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.8) return 'Strong';
  if (score >= 0.7) return 'Good';
  return 'Fair';
}

export function LinkSuggestionCard({ suggestion, onStatusChange }: Props) {
  const [loading, setLoading] = React.useState<'accept' | 'reject' | null>(null);

  async function handleAction(status: 'accepted' | 'rejected') {
    setLoading(status === 'accepted' ? 'accept' : 'reject');

    const { error } = await supabase
      .from('link_suggestions')
      .update({
        status,
        ...(status === 'accepted' ? { applied_at: new Date().toISOString() } : {}),
      })
      .eq('id', suggestion.id);

    setLoading(null);

    if (error) {
      toast.error(`Failed to ${status} suggestion`);
      return;
    }

    onStatusChange(suggestion.id, status);
    toast.success(status === 'accepted' ? 'Link suggestion accepted!' : 'Link suggestion dismissed');
  }

  const scorePercent = Math.round(suggestion.similarity_score * 100);
  const isPending = suggestion.status === 'pending';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Relevance</span>
          </div>
          <Badge variant="outline" className={cn('text-xs font-mono', getScoreStyle(suggestion.similarity_score))}>
            {scorePercent}% — {getScoreLabel(suggestion.similarity_score)}
          </Badge>
        </div>

        {/* Target */}
        {suggestion.target_title && (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate flex-1">{suggestion.target_title}</p>
            {suggestion.target_url && (
              <a href={suggestion.target_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Anchor Text */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Suggested Anchor Text</p>
          <p className="text-sm font-medium bg-muted/50 rounded px-2 py-1 border">
            &ldquo;{suggestion.anchor_text}&rdquo;
          </p>
        </div>

        {/* Context */}
        {suggestion.context_snippet && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Context in Source</p>
            <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3">
              {suggestion.context_snippet}
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleAction('accepted')}
              disabled={loading !== null}
            >
              {loading === 'accept' ? <span className="animate-spin">⟳</span> : <Check className="h-3.5 w-3.5 mr-1" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleAction('rejected')}
              disabled={loading !== null}
            >
              {loading === 'reject' ? <span className="animate-spin">⟳</span> : <X className="h-3.5 w-3.5 mr-1" />}
              Dismiss
            </Button>
          </div>
        )}

        {!isPending && (
          <Badge variant={suggestion.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
            {suggestion.status === 'accepted' ? '✓ Accepted' : '✗ Dismissed'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
