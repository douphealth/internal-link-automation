import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StatsCardsSkeleton, SuggestionCardSkeleton } from '@/components/shared/Skeletons';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Link2, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [sites, posts, suggestions, applied] = await Promise.all([
        supabase.from('sites').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'applied'),
      ]);
      return {
        sites: sites.count ?? 0,
        posts: posts.count ?? 0,
        suggestions: suggestions.count ?? 0,
        applied: applied.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

function useRecentSuggestions() {
  return useQuery({
    queryKey: ['recent-suggestions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('link_suggestions')
        .select('id, anchor_text, similarity_score, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  accepted: 'bg-primary/10 text-primary border-primary/20',
  applied: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: suggestions, isLoading: suggestionsLoading } = useRecentSuggestions();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your internal linking automation across all sites."
      />

      {statsLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <StatsCards
          sitesCount={stats?.sites ?? 0}
          postsCount={stats?.posts ?? 0}
          suggestionsCount={stats?.suggestions ?? 0}
          appliedCount={stats?.applied ?? 0}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    Recent Suggestions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Latest link opportunities discovered</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {suggestions?.length ?? 0} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {suggestionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <SuggestionCardSkeleton key={i} />)}
                </div>
              ) : !suggestions?.length ? (
                <EmptyState
                  icon={Link2}
                  title="No suggestions yet"
                  description="Add a site and crawl its pages to discover internal linking opportunities."
                />
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{s.anchor_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {(s.similarity_score * 100).toFixed(0)}% match
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(s.created_at!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-semibold', statusStyles[s.status ?? 'pending'])}>
                        {s.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Add a new site', href: '/sites', desc: 'Connect any website' },
                { label: 'Review suggestions', href: '/suggestions', desc: 'Accept or reject links' },
                { label: 'View analytics', href: '/analytics', desc: 'Track performance' },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className="block rounded-lg border p-3 transition-all hover:bg-muted/40 hover:border-primary/20 hover:shadow-sm"
                >
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
                </a>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
