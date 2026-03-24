import { Globe, Link2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  sitesCount: number;
  postsCount: number;
  suggestionsCount: number;
  appliedCount: number;
}

export function StatsCards({ sitesCount, postsCount, suggestionsCount, appliedCount }: StatsCardsProps) {
  const stats = [
    { label: 'Sites', value: sitesCount, icon: Globe, color: 'text-primary' },
    { label: 'Pages Indexed', value: postsCount, icon: FileText, color: 'text-accent' },
    { label: 'Suggestions', value: suggestionsCount, icon: Link2, color: 'text-success' },
    { label: 'Links Applied', value: appliedCount, icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
