import { Globe, Link2, FileText, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: number;
  icon: typeof Globe;
  trend?: number; // percentage change
  className?: string;
}

interface StatsCardsProps {
  sitesCount: number;
  postsCount: number;
  suggestionsCount: number;
  appliedCount: number;
}

export function StatsCards({ sitesCount, postsCount, suggestionsCount, appliedCount }: StatsCardsProps) {
  const stats: StatItem[] = [
    { label: 'Sites', value: sitesCount, icon: Globe, className: 'text-primary bg-primary/8' },
    { label: 'Pages Indexed', value: postsCount, icon: FileText, className: 'text-accent bg-accent/8' },
    { label: 'Suggestions', value: suggestionsCount, icon: Link2, className: 'text-success bg-success/8' },
    { label: 'Links Applied', value: appliedCount, icon: TrendingUp, className: 'text-warning bg-warning/8' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="group transition-shadow duration-200 hover:shadow-card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('rounded-lg p-2', stat.className)}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
