import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PostListSkeleton } from '@/components/shared/Skeletons';
import { ArrowLeft, ExternalLink, RefreshCw, FileText, Search, Loader2, Hash, Type, Sparkles, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { executeBatchSaga } from '@/contexts/link-automation/services/BatchOrchestrator';

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
        .order('fetched_at', { ascending: false })
        .limit(1000);
      return (data ?? []) as Post[];
    },
    enabled: !!siteId,
    staleTime: 15_000,
  });
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const queryClient = useQueryClient();
  const { data: site, isLoading: siteLoading } = useSite(siteId);
  const { data: posts = [], isLoading: postsLoading, refetch } = useSitePosts(siteId);
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{ progress: number; total: number; phase: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCrawl = useCallback(async () => {
    if (!site) return;
    setCrawling(true);
    setCrawlProgress({ progress: 0, total: 0, phase: 'discovering' });
    try {
      const fnName = site.source_type === 'wordpress' ? 'wp-proxy' : 'site-crawl';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { site_id: site.id, url: site.url },
      });
      if (error) throw error;

      const jobId = data?.jobId;
      if (jobId) {
        // Poll for progress
        pollRef.current = setInterval(async () => {
          const { data: job } = await supabase
            .from('batch_jobs')
            .select('status, phase, progress, total, error')
            .eq('id', jobId)
            .single();

          if (!job) return;

          setCrawlProgress({
            progress: job.progress ?? 0,
            total: job.total ?? 0,
            phase: job.phase ?? 'crawling',
          });

          if (job.status === 'complete' || job.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setCrawling(false);
            setCrawlProgress(null);

            if (job.status === 'complete') {
              toast.success(`Crawled ${job.progress} pages`, {
                description: 'Pages have been indexed. Run analysis to generate suggestions.',
              });
            } else {
              toast.error('Crawl failed', { description: job.error || 'Unknown error' });
            }
            refetch();
          }
        }, 2000);
      } else {
        // Legacy: no jobId returned
        const count = data?.posts?.length ?? data?.pages?.length ?? 0;
        toast.success(`Crawled ${count} pages`);
        setCrawling(false);
        setCrawlProgress(null);
        refetch();
      }
    } catch (err: any) {
      toast.error('Crawl failed', { description: err.message || 'Unknown error' });
      setCrawling(false);
      setCrawlProgress(null);
    }
  }, [site, refetch]);

  const handleAnalyze = useCallback(async () => {
    if (!siteId) return;
    setAnalyzing(true);
    toast.info('Running analysis pipeline…', {
      description: 'Computing embeddings and generating link suggestions. This may take a minute.',
    });

    try {
      const result = await executeBatchSaga(siteId);
      if (result.ok) {
        const ctx = result.value;
        toast.success(`Analysis complete!`, {
          description: `${ctx.metrics.embeddingsComputed} embeddings, ${ctx.metrics.suggestionsGenerated} suggestions generated.`,
        });
        queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      } else {
        toast.error('Analysis failed', {
          description: (result.error as any)?.step ? `Failed at step: ${(result.error as any).step}` : 'Unknown error',
        });
      }
    } catch (err: any) {
      toast.error('Analysis failed', { description: err.message || 'Unknown error' });
    } finally {
      setAnalyzing(false);
    }
  }, [siteId, queryClient]);

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
        action={<Link to="/sites"><Button variant="outline" className="rounded-xl">Back to Sites</Button></Link>}
      />
    );
  }

  const isWP = site.source_type === 'wordpress';
  const totalWords = posts.reduce((sum, p) => sum + (p.word_count ?? 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link to="/sites" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to sites
      </Link>

      <PageHeader
        title={site.name}
        badge={
          <Badge variant="secondary" className={cn(
            'text-[9px] font-bold uppercase tracking-[0.12em] rounded-md',
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
          <div className="flex gap-2">
            <Button onClick={handleCrawl} disabled={crawling || analyzing} size="sm" className="rounded-xl" variant="outline">
              {crawling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              {crawling ? 'Crawling…' : 'Crawl Pages'}
            </Button>
            {posts.length > 0 && (
              <Button onClick={handleAnalyze} disabled={analyzing || crawling} size="sm" className="rounded-xl">
                {analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {analyzing ? 'Analyzing…' : 'Generate Suggestions'}
              </Button>
            )}
          </div>
        }
      />

      {/* Crawl progress bar */}
      {crawlProgress && (
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="capitalize font-medium">{crawlProgress.phase}…</span>
              <span className="font-mono tabular-nums">
                {crawlProgress.progress}/{crawlProgress.total || '?'}
              </span>
            </div>
            <Progress
              value={crawlProgress.total > 0 ? (crawlProgress.progress / crawlProgress.total) * 100 : 0}
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pages', value: posts.length, icon: FileText, color: 'text-primary bg-primary/6 border-primary/10' },
          { label: 'Total Words', value: totalWords.toLocaleString(), icon: Type, color: 'text-accent bg-accent/6 border-accent/10' },
          { label: 'Avg Words', value: posts.length > 0 ? Math.round(totalWords / posts.length).toLocaleString() : '0', icon: Hash, color: 'text-success bg-success/6 border-success/10' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-3 px-4 text-center">
              <div className={cn('inline-flex rounded-lg p-1.5 border mb-2', stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg sm:text-xl font-extrabold tabular-nums leading-none">{stat.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                Pages
                <Badge variant="secondary" className="text-[10px] font-mono font-bold ml-1 rounded-md">{posts.length}</Badge>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Indexed content from this site</CardDescription>
            </div>
            {posts.length > 0 && (
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  placeholder="Filter pages…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {postsLoading ? (
            <div className="p-4"><PostListSkeleton /></div>
          ) : !filtered.length ? (
            <div className="p-4">
              <EmptyState
                icon={FileText}
                title={search ? 'No matching pages' : 'No pages indexed yet'}
                description={search ? `No pages matching "${search}".` : 'Click "Crawl Pages" to fetch and index content from this site.'}
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center justify-between px-4 sm:px-5 py-3 gap-4 group hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
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
                    <Badge variant="outline" className="text-[10px] font-semibold capitalize rounded-md">
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
