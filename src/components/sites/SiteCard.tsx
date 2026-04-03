import { useState } from 'react';
import { Globe, ExternalLink, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    url: string;
    source_type: string;
    created_at: string;
  };
  postsCount: number;
  onDeleted?: () => void;
}

export function SiteCard({ site, postsCount, onDeleted }: SiteCardProps) {
  const [deleting, setDeleting] = useState(false);
  const isWP = site.source_type === 'wordpress';

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${site.name}" and all its data? This cannot be undone.`)) return;
    
    setDeleting(true);
    // Delete posts & related data first, then the site
    await supabase.from('posts').delete().eq('site_id', site.id);
    const { error } = await supabase.from('sites').delete().eq('id', site.id);
    setDeleting(false);

    if (error) {
      toast.error('Failed to delete site', { description: error.message });
    } else {
      toast.success('Site deleted');
      onDeleted?.();
    }
  }

  return (
    <Link to={`/sites/${site.id}`}>
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary/15 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="relative flex items-center gap-4 p-4 sm:p-5">
          <div className={cn(
            'rounded-xl p-2.5 border transition-all duration-300 group-hover:scale-105',
            isWP ? 'bg-primary/6 text-primary border-primary/10' : 'bg-accent/6 text-accent border-accent/10'
          )}>
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{site.name}</h3>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[9px] font-bold uppercase tracking-[0.1em] shrink-0 px-1.5 py-0 rounded-md',
                  isWP ? 'bg-primary/8 text-primary' : 'bg-accent/8 text-accent'
                )}
              >
                {isWP ? 'WP' : 'Web'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
          <div className="text-right shrink-0 mr-1">
            <p className="text-xl font-extrabold tabular-nums leading-none">{postsCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">pages</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/8"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
