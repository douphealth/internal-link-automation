import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddSiteDialogProps {
  onSiteAdded: () => void;
}

export function AddSiteDialog({ onSiteAdded }: AddSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [wpRestUrl, setWpRestUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');

  const handleSubmit = async (sourceType: 'generic' | 'wordpress') => {
    if (!name || !url) return;
    setLoading(true);

    const payload: Record<string, any> = {
      name,
      url: url.replace(/\/$/, ''),
      source_type: sourceType,
    };

    if (sourceType === 'wordpress') {
      payload.wp_rest_url = wpRestUrl.replace(/\/$/, '') || null;
      payload.wp_username = wpUsername || null;
      payload.wp_app_password = wpAppPassword || null;
    }

    const { error } = await supabase.from('sites').insert(payload);
    setLoading(false);

    if (error) {
      toast.error('Failed to add site', { description: error.message });
    } else {
      toast.success('Site added successfully', { description: `${name} is ready for crawling.` });
      setOpen(false);
      resetForm();
      onSiteAdded();
    }
  };

  const resetForm = () => {
    setName('');
    setUrl('');
    setWpRestUrl('');
    setWpUsername('');
    setWpAppPassword('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add a new site</DialogTitle>
          <DialogDescription>
            Connect any website or WordPress site for internal link analysis.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="generic" className="mt-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generic" className="text-xs">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Any Website
            </TabsTrigger>
            <TabsTrigger value="wordpress" className="text-xs">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              WordPress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generic" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Site Name</Label>
              <Input placeholder="My Blog" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL</Label>
              <Input placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} className="h-9 text-sm" />
            </div>
            <Button className="w-full" onClick={() => handleSubmit('generic')} disabled={loading || !name || !url}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Website
            </Button>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Site Name</Label>
              <Input placeholder="My WordPress Blog" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Site URL</Label>
              <Input placeholder="https://myblog.com" value={url} onChange={e => setUrl(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WP REST API URL</Label>
              <Input placeholder="https://myblog.com/wp-json" value={wpRestUrl} onChange={e => setWpRestUrl(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Username</Label>
                <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">App Password</Label>
                <Input type="password" placeholder="••••••••" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <Button className="w-full" onClick={() => handleSubmit('wordpress')} disabled={loading || !name || !url}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add WordPress Site
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
