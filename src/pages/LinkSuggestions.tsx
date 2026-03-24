import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';
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

export default function LinkSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadSuggestions();
  }, [filter]);

  async function loadSuggestions() {
    let query = supabase
      .from('link_suggestions')
      .select(`
        id, anchor_text, similarity_score, context_snippet, status, created_at,
        source_post:posts!link_suggestions_source_post_id_fkey(title, url),
        target_post:posts!link_suggestions_target_post_id_fkey(title, url)
      `)
      .order('similarity_score', { ascending: false })
      .limit(50);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setSuggestions((data ?? []) as unknown as Suggestion[]);
  }

  async function updateStatus(id: string, status: string) {
    const updates: Record<string, any> = { status };
    if (status === 'applied') updates.applied_at = new Date().toISOString();

    const { error } = await supabase.from('link_suggestions').update(updates).eq('id', id);
    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(`Suggestion ${status}`);
      loadSuggestions();
    }
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    accepted: 'bg-primary/10 text-primary border-primary/20',
    applied: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const filters = ['all', 'pending', 'accepted', 'applied', 'rejected'];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold tracking-tight">Link Suggestions</h1>
        <p className="text-muted-foreground mt-1">Review and manage AI-generated internal link suggestions.</p>
      </motion.div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No suggestions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crawl some sites and run the analysis to generate link suggestions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColor[s.status] || ''}>{s.status}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {(s.similarity_score * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="font-semibold">
                        "{s.anchor_text}"
                      </p>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>
                          <span className="text-foreground font-medium">From:</span>{' '}
                          {s.source_post?.title ?? 'Unknown'}
                        </p>
                        <p>
                          <span className="text-foreground font-medium">To:</span>{' '}
                          {s.target_post?.title ?? 'Unknown'}
                        </p>
                      </div>
                      {s.context_snippet && (
                        <p className="text-xs text-muted-foreground italic bg-muted rounded p-2 mt-2">
                          …{s.context_snippet}…
                        </p>
                      )}
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'accepted')}>
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(s.id, 'rejected')}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
