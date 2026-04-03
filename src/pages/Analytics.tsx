import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Link2, TrendingUp, Activity, FileText, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics-full'],
    queryFn: async () => {
      const [
        { count: sitesCount },
        { count: postsCount },
        { count: suggestionsCount },
        { data: suggestions },
        { data: sites },
      ] = await Promise.all([
        supabase.from('sites').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('id', { count: 'exact', head: true }),
        supabase.from('link_suggestions').select('status, similarity_score, created_at').limit(500),
        supabase.from('sites').select('id, name, source_type'),
      ]);

      const allSuggestions = suggestions ?? [];

      // Status distribution
      const statusCounts: Record<string, number> = { pending: 0, accepted: 0, applied: 0, rejected: 0 };
      for (const s of allSuggestions) {
        statusCounts[s.status ?? 'pending'] = (statusCounts[s.status ?? 'pending'] ?? 0) + 1;
      }

      // Score distribution
      const scoreBuckets = [
        { range: '90-100%', min: 0.9, max: 1.01, count: 0 },
        { range: '70-89%', min: 0.7, max: 0.9, count: 0 },
        { range: '50-69%', min: 0.5, max: 0.7, count: 0 },
        { range: '30-49%', min: 0.3, max: 0.5, count: 0 },
        { range: '15-29%', min: 0.15, max: 0.3, count: 0 },
      ];
      for (const s of allSuggestions) {
        for (const b of scoreBuckets) {
          if (s.similarity_score >= b.min && s.similarity_score < b.max) {
            b.count++;
            break;
          }
        }
      }

      // Suggestions by day (last 14 days)
      const byDay = new Map<string, number>();
      for (const s of allSuggestions) {
        const d = new Date(s.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        byDay.set(d, (byDay.get(d) ?? 0) + 1);
      }
      const dailyData = [...byDay.entries()].slice(0, 14).reverse().map(([day, count]) => ({ day, count }));

      // Site types
      const wpCount = (sites ?? []).filter(s => s.source_type === 'wordpress').length;
      const webCount = (sites ?? []).filter(s => s.source_type !== 'wordpress').length;

      return {
        sitesCount: sitesCount ?? 0,
        postsCount: postsCount ?? 0,
        suggestionsCount: suggestionsCount ?? 0,
        appliedCount: statusCounts.applied,
        statusCounts,
        scoreBuckets,
        dailyData,
        siteTypes: [
          { name: 'WordPress', value: wpCount },
          { name: 'Generic', value: webCount },
        ].filter(s => s.value > 0),
        acceptRate: allSuggestions.length > 0
          ? ((statusCounts.accepted + statusCounts.applied) / allSuggestions.length * 100).toFixed(0)
          : '0',
      };
    },
    staleTime: 60_000,
  });
}

const PIE_COLORS = [
  'hsl(var(--warning))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
];

export default function Analytics() {
  const { data } = useAnalyticsData();

  const stats = [
    { label: 'Sites', value: data?.sitesCount ?? 0, icon: Globe, color: 'text-primary bg-primary/6 border-primary/10' },
    { label: 'Pages', value: data?.postsCount ?? 0, icon: FileText, color: 'text-accent bg-accent/6 border-accent/10' },
    { label: 'Suggestions', value: data?.suggestionsCount ?? 0, icon: Link2, color: 'text-success bg-success/6 border-success/10' },
    { label: 'Accept Rate', value: `${data?.acceptRate ?? 0}%`, icon: TrendingUp, color: 'text-warning bg-warning/6 border-warning/10' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Analytics"
        description="Track internal linking performance across your sites."
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
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
                  <p className="text-2xl font-extrabold tabular-nums leading-none">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suggestions over time */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                Suggestions Over Time
              </CardTitle>
              <CardDescription className="text-[11px]">Daily suggestion generation</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!data?.dailyData.length ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-muted-foreground">No data yet — generate suggestions first.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status distribution */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-accent/8 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                </div>
                Status Breakdown
              </CardTitle>
              <CardDescription className="text-[11px]">Distribution of suggestion statuses</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!data?.suggestionsCount ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-muted-foreground">No suggestions yet.</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={Object.entries(data.statusCounts).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {Object.keys(data.statusCounts).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2.5">
                    {Object.entries(data.statusCounts).map(([status, count], i) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs font-medium capitalize">{status}</span>
                        </div>
                        <span className="text-xs font-mono font-bold tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Score distribution */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-success/8 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                Similarity Score Distribution
              </CardTitle>
              <CardDescription className="text-[11px]">Quality of suggested links by match score</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!data?.suggestionsCount ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-muted-foreground">No data to visualize.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.scoreBuckets} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="range" type="category" width={70} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
