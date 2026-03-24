import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddSiteDialogProps {
  onSiteAdded: () => void;
}

export function AddSiteDialog({ onSiteAdded }: AddSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generic site fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  // WordPress fields
  const [wpRestUrl, setWpRestUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');

  const handleSubmitGeneric = async () => {
    if (!name || !url) return;
    setLoading(true);
    const { error } = await supabase.from('sites').insert({
      name,
      url: url.replace(/\/$/, ''),
      source_type: 'generic',
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to add site: ' + error.message);
    } else {
      toast.success('Site added');
      setOpen(false);
      resetForm();
      onSiteAdded();
    }
  };

  const handleSubmitWordPress = async () => {
    if (!name || !url || !wpRestUrl) return;
    setLoading(true);
    const { error } = await supabase.from('sites').insert({
      name,
      url: url.replace(/\/$/, ''),
      source_type: 'wordpress',
      wp_rest_url: wpRestUrl.replace(/\/$/, ''),
      wp_username: wpUsername || null,
      wp_app_password: wpAppPassword || null,
    });
    setLoading(false);
    if (error) {
      toast.error('Failed to add site: ' + error.message);
    } else {
      toast.success('WordPress site added');
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new site</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="generic" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generic">Any Website</TabsTrigger>
            <TabsTrigger value="wordpress">WordPress</TabsTrigger>
          </TabsList>

          <TabsContent value="generic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input placeholder="My Blog" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSubmitGeneric} disabled={loading || !name || !url}>
              {loading ? 'Adding…' : 'Add Site'}
            </Button>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input placeholder="My WordPress Blog" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Site URL</Label>
              <Input placeholder="https://myblog.com" value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WP REST API URL</Label>
              <Input placeholder="https://myblog.com/wp-json" value={wpRestUrl} onChange={e => setWpRestUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Username (optional)</Label>
              <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>App Password (optional)</Label>
              <Input type="password" placeholder="xxxx xxxx xxxx" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSubmitWordPress} disabled={loading || !name || !url || !wpRestUrl}>
              {loading ? 'Adding…' : 'Add WordPress Site'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
