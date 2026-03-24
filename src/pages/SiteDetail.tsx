import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Post {
  id: string;
  title: string;
  slug: string;
  url: string;
  word_count: number | null;
  status: string | null;
  fetched_at: string | null;
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [crawling, setCrawling] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    async function load() {
      const { data: siteData } = await supabase.from('sites').select('*').eq('id', siteId).single();
      setSite(siteData);

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, slug, url, word_count, status, fetched_at')
        .eq('site_id', siteId)
        .order('fetched_at', { ascending: false });
      setPosts((postsData ?? []) as Post[]);
    }
    load();
  }, [siteId]);

  const handleCrawl = async () => {
    if (!site) return;
    setCrawling(true);
    try {
      const fnName = site.source_type === 'wordpress' ? 'wp-proxy' : 'site-crawl';
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { site_id: site.id, url: site.url },
      });
      if (error) throw error;
      toast.success(`Crawled ${data?.posts?.length ?? data?.pages?.length ?? 0} pages`);
      // Reload posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, slug, url, word_count, status, fetched_at')
        .eq('site_id', siteId)
        .order('fetched_at', { ascending: false });
      setPosts((postsData ?? []) as Post[]);
    } catch (err: any) {
      toast.error('Crawl failed: ' + (err.message || 'Unknown error'));
    } finally {
      setCrawling(false);
    }
  };

  if (!site) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link to="/sites" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to sites
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{site.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{site.source_type === 'wordpress' ? 'WordPress' : 'Generic'}</Badge>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                {site.url} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Button onClick={handleCrawl} disabled={crawling}>
            <RefreshCw className={`mr-2 h-4 w-4 ${crawling ? 'animate-spin' : ''}`} />
            {crawling ? 'Crawling…' : 'Crawl Pages'}
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages ({posts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No pages indexed yet. Click "Crawl Pages" to fetch content from this site.
            </p>
          ) : (
            <div className="divide-y">
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{post.url}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {post.word_count && (
                      <span className="text-xs text-muted-foreground">{post.word_count} words</span>
                    )}
                    <Badge variant="outline" className="text-xs">{post.status ?? 'draft'}</Badge>
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
