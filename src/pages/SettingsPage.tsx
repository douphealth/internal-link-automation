import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Gauge, Shield, Bell, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState([70]);
  const [maxSuggestions, setMaxSuggestions] = useState([10]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your LinkForge instance."
        actions={
          <Button size="sm" className="rounded-xl gap-1.5" onClick={() => toast.success('Settings saved')}>
            <Save className="h-3.5 w-3.5" /> Save Changes
          </Button>
        }
      />

      <div className="grid gap-4 sm:gap-5 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                  <Gauge className="h-3.5 w-3.5 text-primary" />
                </div>
                Analysis Settings
              </CardTitle>
              <CardDescription className="text-[11px]">Control how link suggestions are generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Similarity Threshold</Label>
                  <span className="text-sm font-mono font-bold text-primary tabular-nums bg-primary/6 px-2 py-0.5 rounded-md">{threshold[0]}%</span>
                </div>
                <Slider value={threshold} onValueChange={setThreshold} min={30} max={95} step={5} />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Minimum semantic similarity score for link suggestions. Higher values = more precise matches.
                </p>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Max Suggestions per Page</Label>
                  <span className="text-sm font-mono font-bold text-primary tabular-nums bg-primary/6 px-2 py-0.5 rounded-md">{maxSuggestions[0]}</span>
                </div>
                <Slider value={maxSuggestions} onValueChange={setMaxSuggestions} min={1} max={25} step={1} />
              </div>

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Auto-detect existing links</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Skip suggesting links that already exist on the page.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-accent/8 flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-accent" />
                </div>
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">New suggestions</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Get notified when new link suggestions are ready.</p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Crawl complete</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Notify when a site crawl finishes.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-success/8 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-success" />
                </div>
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-success/4 border border-success/10 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-success">✓ Secure.</span> All WordPress credentials are stored securely in Supabase Vault.
                  API calls are proxied through authenticated Edge Functions — credentials never reach the client.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}