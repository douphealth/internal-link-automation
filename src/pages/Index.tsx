import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StatsCardsSkeleton, SuggestionCardSkeleton } from '@/components/shared/Skeletons';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Link2, Activity, Clock, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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

const quickActions = [
  { label: 'Add a new site', href: '/sites', desc: 'Connect any website for analysis', icon: Sparkles },
  { label: 'Review suggestions', href: '/suggestions', desc: 'Accept or reject AI links', icon: Link2 },
  { label: 'View analytics', href: '/analytics', desc: 'Track linking performance', icon: Activity },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: suggestions, isLoading: suggestionsLoading } = useRecentSuggestions();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-card to-accent/5 border p-5 sm:p-8"
      >
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/8 text-primary border-primary/15">
              Dashboard
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight mt-3">
            Welcome to <span className="text-gradient">LinkForge</span>
          </h1>
          <p className="text-[13px] sm:text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            Your AI-powered internal linking automation platform. Discover, analyze, and deploy semantic links at scale.
          </p>
        </div>
      </motion.div>

      {statsLoading ? <StatsCardsSkeleton /> : (
        <StatsCards
          sitesCount={stats?.sites ?? 0}
          postsCount={stats?.posts ?? 0}
          suggestionsCount={stats?.suggestions ?? 0}
          appliedCount={stats?.applied ?? 0}
        />
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="lg:col-span-2"
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Recent Suggestions
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-1">Latest link opportunities</CardDescription>
                </div>
                <Link to="/suggestions">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-primary gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {suggestionsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <SuggestionCardSkeleton key={i} />)}
                </div>
              ) : !suggestions?.length ? (
                <div className="p-4">
                  <EmptyState
                    icon={Link2}
                    title="No suggestions yet"
                    description="Add a site and crawl its pages to discover internal linking opportunities."
                  />
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {s.anchor_text}
                        </p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {(s.similarity_score * 100).toFixed(0)}% match
                          </span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(s.created_at!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-bold capitalize rounded-md', statusStyles[s.status ?? 'pending'])}>
                        {s.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-accent/8 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:bg-muted/50 hover:border-border/60 hover:shadow-soft"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/8 transition-colors">
                    <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold group-hover:text-primary transition-colors">{action.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}