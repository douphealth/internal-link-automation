import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PostListSkeleton } from '@/components/shared/Skeletons';
import { ArrowLeft, ExternalLink, RefreshCw, FileText, Search, Loader2, Hash, Type, Sparkles, Link2, CheckCircle2, Circle, Play } from 'lucide-react';
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

function useSiteSuggestionCount(siteId: string | undefined, postIds: string[]) {
  return useQuery({
    queryKey: ['site-suggestion-count', siteId, postIds.length],
    queryFn: async () => {
      if (postIds.length === 0) return 0;
      const { count } = await supabase
        .from('link_suggestions')
        .select('id', { count: 'exact', head: true })
        .in('source_post_id', postIds);
      return count ?? 0;
    },
    enabled: !!siteId && postIds.length > 0,
    staleTime: 15_000,
  });
}

function useEmbeddingCount(siteId: string | undefined, postIds: string[]) {
  return useQuery({
    queryKey: ['site-embedding-count', siteId, postIds.length],
    queryFn: async () => {
      if (postIds.length === 0) return 0;
      const { count } = await supabase
        .from('embeddings')
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds);
      return count ?? 0;
    },
    enabled: !!siteId && postIds.length > 0,
    staleTime: 15_000,
  });
}

type PipelinePhase = 'idle' | 'crawling' | 'embedding' | 'suggesting' | 'done' | 'error';

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const queryClient = useQueryClient();
  const { data: site, isLoading: siteLoading } = useSite(siteId);
  const { data: posts = [], isLoading: postsLoading, refetch } = useSitePosts(siteId);
  const { data: suggestionCount = 0, refetch: refetchSuggestions } = useSiteSuggestionCount(siteId, posts.map(p => p.id));
  const { data: embeddingCount = 0, refetch: refetchEmbeddings } = useEmbeddingCount(siteId, posts.map(p => p.id));
  
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle');
  const [crawlProgress, setCrawlProgress] = useState<{ progress: number; total: number; phase: string } | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [search, setSearch] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleCrawl = useCallback(async () => {
    if (!site) return;
    setPipelinePhase('crawling');
    setCrawlProgress({ progress: 0, total: 0, phase: 'discovering' });
    try {
      const fnName = site.source_type === 'wordpress' ? 'wp-proxy' : 'site-crawl';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { site_id: site.id, url: site.url },
      });
      if (error) throw error;

      const jobId = data?.jobId;
      if (jobId) {
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
            setCrawlProgress(null);

            if (job.status === 'complete') {
              toast.success(`Crawled ${job.progress} pages`, {
                description: 'Click "Generate Suggestions" to analyze content.',
              });
              setPipelinePhase('idle');
            } else {
              toast.error('Crawl failed', { description: job.error || 'Unknown error' });
              setPipelinePhase('error');
            }
            refetch();
          }
        }, 2000);
      } else {
        toast.success('Crawl complete');
        setPipelinePhase('idle');
        setCrawlProgress(null);
        refetch();
      }
    } catch (err: any) {
      toast.error('Crawl failed', { description: err.message || 'Unknown error' });
      setPipelinePhase('error');
      setCrawlProgress(null);
    }
  }, [site, refetch]);

  const handleAnalyze = useCallback(async () => {
    if (!siteId) return;
    setPipelinePhase('embedding');
    setAnalysisProgress('Computing embeddings…');

    try {
      const result = await executeBatchSaga(siteId);
      if (result.ok === true) {
        const ctx = result.value;
        setPipelinePhase('done');
        setAnalysisProgress('');
        toast.success('Analysis complete!', {
          description: `${ctx.metrics.embeddingsComputed} embeddings, ${ctx.metrics.suggestionsGenerated} suggestions.`,
        });
        queryClient.invalidateQueries({ queryKey: ['suggestions'] });
        refetchSuggestions();
        refetchEmbeddings();
      } else {
        setPipelinePhase('error');
        setAnalysisProgress('');
        const err = result.error as any;
        toast.error('Analysis failed', {
          description: err?.cause ? String(err.cause) : err?.step ? `Failed at: ${err.step}` : 'Unknown error',
        });
      }
    } catch (err: any) {
      setPipelinePhase('error');
      setAnalysisProgress('');
      toast.error('Analysis failed', { description: err.message || 'Unknown error' });
    }
  }, [siteId, queryClient, refetchSuggestions, refetchEmbeddings]);

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
  const isBusy = pipelinePhase !== 'idle' && pipelinePhase !== 'done' && pipelinePhase !== 'error';

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
      />

      {/* Pipeline Actions */}
      <Card className="overflow-hidden border-primary/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Pipeline steps indicator */}
            <div className="flex items-center gap-3 flex-1">
              <PipelineStep 
                step={1} 
                label="Crawl" 
                active={pipelinePhase === 'crawling'} 
                done={posts.length > 0} 
              />
              <div className="h-px w-4 bg-border" />
              <PipelineStep 
                step={2} 
                label="Embed" 
                active={pipelinePhase === 'embedding'} 
                done={embeddingCount > 0} 
              />
              <div className="h-px w-4 bg-border" />
              <PipelineStep 
                step={3} 
                label="Suggest" 
                active={pipelinePhase === 'suggesting'} 
                done={suggestionCount > 0} 
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Button 
                onClick={handleCrawl} 
                disabled={isBusy} 
                size="sm" 
                className="rounded-xl" 
                variant="outline"
              >
                {pipelinePhase === 'crawling' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                {pipelinePhase === 'crawling' ? 'Crawling…' : posts.length > 0 ? 'Re-crawl' : 'Crawl Pages'}
              </Button>
              {posts.length > 0 && (
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isBusy} 
                  size="sm" 
                  className="rounded-xl shadow-soft"
                >
                  {pipelinePhase === 'embedding' || pipelinePhase === 'suggesting' 
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> 
                    : <Sparkles className="mr-1.5 h-4 w-4" />
                  }
                  {pipelinePhase === 'embedding' ? 'Computing…' : pipelinePhase === 'suggesting' ? 'Analyzing…' : 'Generate Suggestions'}
                </Button>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {crawlProgress && (
            <div className="mt-4 pt-4 border-t border-border/50">
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
            </div>
          )}

          {analysisProgress && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="font-medium">{analysisProgress}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pages', value: posts.length, icon: FileText, color: 'text-primary bg-primary/6 border-primary/10' },
          { label: 'Total Words', value: totalWords.toLocaleString(), icon: Type, color: 'text-accent bg-accent/6 border-accent/10' },
          { label: 'Embeddings', value: embeddingCount, icon: Hash, color: 'text-info bg-info/6 border-info/10' },
          { label: 'Suggestions', value: suggestionCount, icon: Link2, color: 'text-success bg-success/6 border-success/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Card>
              <CardContent className="py-3 px-4 text-center">
                <div className={cn('inline-flex rounded-lg p-1.5 border mb-2', stat.color)}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg sm:text-xl font-extrabold tabular-nums leading-none">{stat.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Suggestions CTA */}
      {suggestionCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Link to="/suggestions">
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 border-success/15 bg-success/3">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl p-2.5 bg-success/10 border border-success/15 group-hover:scale-105 transition-transform">
                  <Link2 className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold group-hover:text-success transition-colors">
                    {suggestionCount} Link Suggestions Ready
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Review and approve AI-generated internal linking opportunities →
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* Posts list */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                Indexed Pages
                <Badge variant="secondary" className="text-[10px] font-mono font-bold ml-1 rounded-md">{posts.length}</Badge>
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">Content discovered from this site</CardDescription>
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
            <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto scrollbar-thin">
              {filtered.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.2) }}
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

// ─── Pipeline Step Indicator ────────────────────────────────────

function PipelineStep({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <div className="relative">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : done ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/30" />
      )}
      <span className={cn(
        'text-xs font-medium',
        active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground/50'
      )}>
        {label}
      </span>
    </div>
  );
}
