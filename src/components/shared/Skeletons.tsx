import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SiteCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="text-right space-y-2 shrink-0">
          <Skeleton className="h-6 w-8 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SuggestionCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function PostListSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3.5 gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-4 w-52 max-w-full" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-3 w-14 hidden sm:block" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}