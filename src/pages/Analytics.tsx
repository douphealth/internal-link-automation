import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track internal linking performance across your sites.</p>
      </motion.div>

      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Analytics coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">
            Once you have applied some links, analytics data will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
