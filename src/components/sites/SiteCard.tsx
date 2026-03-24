import { Globe, Wordpress, ExternalLink, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SiteCardProps {
  site: {
    id: string;
    name: string;
    url: string;
    source_type: string;
    created_at: string;
  };
  postsCount: number;
  index: number;
}

export function SiteCard({ site, postsCount, index }: SiteCardProps) {
  const isWP = site.source_type === 'wordpress';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={`/sites/${site.id}`}>
        <Card className="group cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-muted p-2.5">
              {isWP ? (
                <Wordpress className="h-5 w-5 text-primary" />
              ) : (
                <Globe className="h-5 w-5 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{site.name}</h3>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {isWP ? 'WordPress' : 'Generic'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <ExternalLink className="h-3 w-3" />
                <span className="truncate">{site.url}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold">{postsCount}</p>
              <p className="text-xs text-muted-foreground">pages</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
