import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Globe, Loader2, Wifi } from 'lucide-react';
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

    const row = {
      name,
      url: url.replace(/\/$/, ''),
      source_type: sourceType,
      wp_rest_url: sourceType === 'wordpress' ? (wpRestUrl.replace(/\/$/, '') || null) : null,
      wp_username: sourceType === 'wordpress' ? (wpUsername || null) : null,
      wp_app_password: sourceType === 'wordpress' ? (wpAppPassword || null) : null,
    };

    const { error } = await supabase.from('sites').insert(row);
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
        <Button size="sm" className="rounded-xl gap-1.5">
          <Plus className="h-4 w-4" />
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add a new site</DialogTitle>
          <DialogDescription className="text-[13px]">
            Connect any website or WordPress site for AI-powered link analysis.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="generic" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-10">
            <TabsTrigger value="generic" className="text-xs rounded-lg gap-1.5 font-semibold">
              <Globe className="h-3.5 w-3.5" />
              Any Website
            </TabsTrigger>
            <TabsTrigger value="wordpress" className="text-xs rounded-lg gap-1.5 font-semibold">
              <Wifi className="h-3.5 w-3.5" />
              WordPress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Site Name</Label>
              <Input placeholder="My Blog" value={name} onChange={e => setName(e.target.value)} className="h-10 text-sm rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">URL</Label>
              <Input placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} className="h-10 text-sm rounded-xl" />
            </div>
            <Button className="w-full h-10 rounded-xl font-semibold" onClick={() => handleSubmit('generic')} disabled={loading || !name || !url}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Website
            </Button>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Site Name</Label>
              <Input placeholder="My WordPress Blog" value={name} onChange={e => setName(e.target.value)} className="h-10 text-sm rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Site URL</Label>
              <Input placeholder="https://myblog.com" value={url} onChange={e => setUrl(e.target.value)} className="h-10 text-sm rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">WP REST API URL</Label>
              <Input placeholder="https://myblog.com/wp-json" value={wpRestUrl} onChange={e => setWpRestUrl(e.target.value)} className="h-10 text-sm rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Username</Label>
                <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} className="h-10 text-sm rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">App Password</Label>
                <Input type="password" placeholder="••••••••" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} className="h-10 text-sm rounded-xl" />
              </div>
            </div>
            <Button className="w-full h-10 rounded-xl font-semibold" onClick={() => handleSubmit('wordpress')} disabled={loading || !name || !url}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add WordPress Site
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}