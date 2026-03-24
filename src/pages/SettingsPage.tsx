import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your LinkForge instance.</p>
      </motion.div>

      <Card>
        <CardContent className="py-16 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Settings coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration options for similarity thresholds, crawling frequency, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
