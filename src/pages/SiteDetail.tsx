import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PostListSkeleton } from '@/components/shared/Skeletons';
import { ArrowLeft, ExternalLink, RefreshCw, FileText, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  slug: string;
  url: string;
  word_count: number | null;
  status: string | null;
  fetched_at: string | null;
}

function useSite(siteId: string | undefined) {
  return useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const { data } = await supabase.from('sites').select('*').eq('id', siteId!).single();
      return data;
    },
    enabled: !!siteId,
  });
}

function useSitePosts(siteId: string | undefined) {
  return useQuery({
    queryKey: ['site-posts', siteId],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, slug, url, word_count, status, fetched_at')
        .eq('site_id', siteId!)
        .order('fetched_at', { ascending: false });
      return (data ?? []) as Post[];
    },
    enabled: !!siteId,
    staleTime: 15_000,
  });
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const { data: site, isLoading: siteLoading } = useSite(siteId);
  const { data: posts = [], isLoading: postsLoading, refetch } = useSitePosts(siteId);
  const [crawling, setCrawling] = useState(false);
  const [search, setSearch] = useState('');

  const handleCrawl = useCallback(async () => {
    if (!site) return;
    setCrawling(true);
    try {
      const fnName = site.source_type === 'wordpress' ? 'wp-proxy' : 'site-crawl';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { site_id: site.id, url: site.url },
      });
      if (error) throw error;
      const count = data?.posts?.length ?? data?.pages?.length ?? 0;
      toast.success(`Crawled ${count} pages`, { description: 'Pages have been indexed for analysis.' });
      refetch();
    } catch (err: any) {
      toast.error('Crawl failed', { description: err.message || 'Unknown error' });
    } finally {
      setCrawling(false);
    }
  }, [site, refetch]);

  const filtered = search
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase()))
    : posts;

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!site) {
    return (
      <EmptyState
        icon={FileText}
        title="Site not found"
        description="This site doesn't exist or you don't have access."
        action={<Link to="/sites"><Button variant="outline">Back to Sites</Button></Link>}
      />
    );
  }

  const isWP = site.source_type === 'wordpress';
  const totalWords = posts.reduce((sum, p) => sum + (p.word_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link to="/sites" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sites
      </Link>

      <PageHeader
        title={site.name}
        badge={
          <Badge variant="secondary" className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            isWP ? 'bg-primary/8 text-primary' : 'bg-accent/8 text-accent'
          )}>
            {isWP ? 'WordPress' : 'Website'}
          </Badge>
        }
        description={
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            {site.url.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
          </a>
        }
        actions={
          <Button onClick={handleCrawl} disabled={crawling} size="sm">
            {crawling ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            {crawling ? 'Crawling…' : 'Crawl Pages'}
          </Button>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pages', value: posts.length },
          { label: 'Total Words', value: totalWords.toLocaleString() },
          { label: 'Avg Words', value: posts.length > 0 ? Math.round(totalWords / posts.length).toLocaleString() : '0' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-3 px-4 text-center">
              <p className="text-lg font-bold tabular-nums">{stat.value}</p>
              <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Pages
                <Badge variant="secondary" className="text-[10px] font-mono ml-1">{posts.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Indexed content from this site</CardDescription>
            </div>
            {posts.length > 0 && (
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter pages…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <PostListSkeleton />
          ) : !filtered.length ? (
            <EmptyState
              icon={FileText}
              title={search ? 'No matching pages' : 'No pages indexed yet'}
              description={search ? `No pages matching "${search}".` : 'Click "Crawl Pages" to fetch and index content from this site.'}
            />
          ) : (
            <div className="divide-y">
              {filtered.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center justify-between py-3 gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {post.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                      {post.slug || post.url.replace(/^https?:\/\/[^/]+/, '')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {post.word_count != null && (
                      <span className="text-[11px] text-muted-foreground font-mono tabular-nums hidden sm:inline">
                        {post.word_count.toLocaleString()} words
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] font-medium capitalize">
                      {post.status ?? 'draft'}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
