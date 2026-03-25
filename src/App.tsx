import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Index"));
const Sites = lazy(() => import("./pages/Sites"));
const SiteDetail = lazy(() => import("./pages/SiteDetail"));
const LinkSuggestions = lazy(() => import("./pages/LinkSuggestions"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Loading…</span>
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary context="App">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner position="bottom-right" richColors closeButton />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sites" element={<Sites />} />
                <Route path="/sites/:siteId" element={<SiteDetail />} />
                <Route path="/suggestions" element={<LinkSuggestions />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;