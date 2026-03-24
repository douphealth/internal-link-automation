import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({ sites: 0, posts: 0, suggestions: 0, applied: 0 });
  const [recentSuggestions, setRecentSuggestions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [sitesRes, postsRes, suggestionsRes, appliedRes, recentRes] = await Promise.all([
        supabase.from('sites').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'applied'),
        supabase.from('link_suggestions').select('id, anchor_text, similarity_score, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({
        sites: sitesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        suggestions: suggestionsRes.count ?? 0,
        applied: appliedRes.count ?? 0,
      });
      setRecentSuggestions(recentRes.data ?? []);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/10 text-warning',
    accepted: 'bg-primary/10 text-primary',
    applied: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your internal linking automation.</p>
      </motion.div>

      <StatsCards
        sitesCount={stats.sites}
        postsCount={stats.posts}
        suggestionsCount={stats.suggestions}
        appliedCount={stats.applied}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No suggestions yet. Add a site and crawl its pages to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {recentSuggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{s.anchor_text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Score: {(s.similarity_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColor[s.status] || ''}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
