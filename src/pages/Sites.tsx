import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AddSiteDialog } from '@/components/sites/AddSiteDialog';
import { SiteCard } from '@/components/sites/SiteCard';
import { motion } from 'framer-motion';

interface Site {
  id: string;
  name: string;
  url: string;
  source_type: string;
  created_at: string;
}

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  const loadSites = useCallback(async () => {
    const { data } = await supabase
      .from('sites')
      .select('id, name, url, source_type, created_at')
      .order('created_at', { ascending: false });
    const sitesData = (data ?? []) as Site[];
    setSites(sitesData);

    // Get post counts per site
    if (sitesData.length > 0) {
      const counts: Record<string, number> = {};
      for (const site of sitesData) {
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', site.id);
        counts[site.id] = count ?? 0;
      }
      setPostCounts(counts);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="text-muted-foreground mt-1">Manage your websites for internal link analysis.</p>
        </div>
        <AddSiteDialog onSiteAdded={loadSites} />
      </motion.div>

      {sites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16"
        >
          <p className="text-lg font-medium">No sites yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first site to start analyzing internal links.</p>
          <AddSiteDialog onSiteAdded={loadSites} />
        </motion.div>
      ) : (
        <div className="space-y-3">
          {sites.map((site, i) => (
            <SiteCard key={site.id} site={site} postsCount={postCounts[site.id] ?? 0} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
