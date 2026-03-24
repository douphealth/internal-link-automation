import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Link2, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_type, created_at, payload')
        .order('created_at', { ascending: false })
        .limit(100);

      const applied = (events ?? []).filter(e => e.event_type === 'link_applied');
      const byDay = new Map<string, number>();
      applied.forEach(e => {
        const day = new Date(e.created_at!).toLocaleDateString();
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      });

      return { events: events ?? [], applied, byDay: [...byDay.entries()].slice(0, 7) };
    },
    staleTime: 60_000,
  });
}

export default function Analytics() {
  const { data, isLoading } = useAnalyticsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track internal linking performance across your sites."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Total Events', value: data?.events.length ?? 0, icon: Activity, color: 'text-primary bg-primary/8' },
          { label: 'Links Applied', value: data?.applied.length ?? 0, icon: Link2, color: 'text-success bg-success/8' },
          { label: 'Active Days', value: data?.byDay.length ?? 0, icon: TrendingUp, color: 'text-accent bg-accent/8' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn('rounded-lg p-2', stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">Latest events across all sites</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.events.length ? (
              <div className="py-12 text-center">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1">Apply some links to see analytics data.</p>
              </div>
            ) : (
              <div className="divide-y">
                {data.events.slice(0, 10).map((event, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
                      <span className="text-sm font-medium capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(event.created_at!).toLocaleString()}
                    </span>
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
