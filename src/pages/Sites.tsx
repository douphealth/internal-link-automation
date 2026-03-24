import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddSiteDialog } from '@/components/sites/AddSiteDialog';
import { SiteCard } from '@/components/sites/SiteCard';
import { SiteCardSkeleton } from '@/components/shared/Skeletons';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StaggerList, StaggerItem } from '@/components/shared/StaggerList';
import { Globe, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface Site {
  id: string;
  name: string;
  url: string;
  source_type: string;
  created_at: string;
}

function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sites')
        .select('id, name, url, source_type, created_at')
        .order('created_at', { ascending: false });
      return (data ?? []) as Site[];
    },
    staleTime: 15_000,
  });
}

function usePostCounts(siteIds: string[]) {
  return useQuery({
    queryKey: ['post-counts', siteIds],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of siteIds) {
        const { count } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', id);
        counts[id] = count ?? 0;
      }
      return counts;
    },
    enabled: siteIds.length > 0,
    staleTime: 30_000,
  });
}

export default function Sites() {
  const [search, setSearch] = useState('');
  const { data: sites = [], isLoading, refetch } = useSites();
  const { data: postCounts = {} } = usePostCounts(sites.map(s => s.id));

  const filtered = search
    ? sites.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()))
    : sites;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites"
        description="Manage your websites for internal link analysis."
        badge={<Badge variant="secondary" className="text-xs font-mono">{sites.length}</Badge>}
        actions={<AddSiteDialog onSiteAdded={() => refetch()} />}
      />

      {sites.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SiteCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState
          icon={Globe}
          title="No sites yet"
          description="Add your first site to start discovering internal linking opportunities across your content."
          action={<AddSiteDialog onSiteAdded={() => refetch()} />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description={`No sites matching "${search}". Try a different search term.`}
        />
      ) : (
        <StaggerList>
          {filtered.map((site) => (
            <StaggerItem key={site.id}>
              <SiteCard site={site} postsCount={postCounts[site.id] ?? 0} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
