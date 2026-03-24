import { Globe, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    url: string;
    source_type: string;
    created_at: string;
  };
  postsCount: number;
}

export function SiteCard({ site, postsCount }: SiteCardProps) {
  const isWP = site.source_type === 'wordpress';

  return (
    <Link to={`/sites/${site.id}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:border-primary/20">
        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
          <div className={cn(
            'rounded-lg p-2.5 transition-colors',
            isWP ? 'bg-primary/8 text-primary' : 'bg-accent/8 text-accent'
          )}>
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{site.name}</h3>
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider shrink-0 px-1.5 py-0',
                  isWP ? 'bg-primary/8 text-primary border-primary/20' : 'bg-accent/8 text-accent border-accent/20'
                )}
              >
                {isWP ? 'WP' : 'Web'}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
            </div>
          </div>
          <div className="text-right shrink-0 mr-1">
            <p className="text-lg font-bold tabular-nums">{postsCount}</p>
            <p className="text-[11px] text-muted-foreground font-medium">pages</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
