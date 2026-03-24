import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Gauge, Shield, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState([70]);
  const [maxSuggestions, setMaxSuggestions] = useState([10]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your LinkForge instance."
      />

      <div className="grid gap-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Analysis Settings
              </CardTitle>
              <CardDescription className="text-xs">Control how link suggestions are generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Similarity Threshold</Label>
                  <span className="text-sm font-mono font-semibold text-primary tabular-nums">{threshold[0]}%</span>
                </div>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={30}
                  max={95}
                  step={5}
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum semantic similarity score for link suggestions.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Suggestions per Page</Label>
                  <span className="text-sm font-mono font-semibold text-primary tabular-nums">{maxSuggestions[0]}</span>
                </div>
                <Slider
                  value={maxSuggestions}
                  onValueChange={setMaxSuggestions}
                  min={1}
                  max={25}
                  step={1}
                  className="w-full"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Auto-detect existing links</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Skip suggesting links that already exist.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">New suggestions</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Get notified when new link suggestions are ready.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Crawl complete</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Notify when a site crawl finishes.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All WordPress credentials are stored securely in Supabase Vault.
                API calls are proxied through authenticated Edge Functions — credentials never reach the client.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
