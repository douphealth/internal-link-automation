import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  const { data } = useAnalyticsData();

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Analytics"
        description="Track internal linking performance across your sites."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Total Events', value: data?.events.length ?? 0, icon: Activity, color: 'text-primary bg-primary/6 border-primary/10' },
          { label: 'Links Applied', value: data?.applied.length ?? 0, icon: Link2, color: 'text-success bg-success/6 border-success/10' },
          { label: 'Active Days', value: data?.byDay.length ?? 0, icon: TrendingUp, color: 'text-accent bg-accent/6 border-accent/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={cn('rounded-xl p-2.5 border transition-transform duration-300 group-hover:scale-105', stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold tabular-nums leading-none">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              Recent Activity
            </CardTitle>
            <CardDescription className="text-[11px]">Latest events across all sites</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.events.length ? (
              <div className="py-16 text-center px-6">
                <div className="inline-flex rounded-2xl bg-muted/80 p-4 mb-4 ring-1 ring-border/40">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Apply some links to see analytics data.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {data.events.slice(0, 10).map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
                      <span className="text-sm font-semibold capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                      {new Date(event.created_at!).toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}