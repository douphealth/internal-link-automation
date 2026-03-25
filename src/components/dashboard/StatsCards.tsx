import { Globe, FileText, Link2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  sitesCount: number;
  postsCount: number;
  suggestionsCount: number;
  appliedCount: number;
}

export function StatsCards({ sitesCount, postsCount, suggestionsCount, appliedCount }: StatsCardsProps) {
  const stats = [
    { label: 'Sites', value: sitesCount, icon: Globe, color: 'text-primary', bg: 'bg-primary/8 border-primary/10' },
    { label: 'Pages Indexed', value: postsCount, icon: FileText, color: 'text-accent', bg: 'bg-accent/8 border-accent/10' },
    { label: 'Suggestions', value: suggestionsCount, icon: Link2, color: 'text-success', bg: 'bg-success/8 border-success/10' },
    { label: 'Applied', value: appliedCount, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/8 border-warning/10' },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="relative p-4 sm:p-5">
              <div className={cn('inline-flex rounded-xl p-2.5 border mb-3', stat.bg)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums leading-none">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-1.5">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}