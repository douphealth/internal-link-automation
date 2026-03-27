import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/shared/kernel/Logger';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const uiLogger = logger.child(this.props.context || 'UI');
    uiLogger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack || 'N/A',
    });
    this.setState({ errorInfo });

    // Report to Supabase analytics_events for production monitoring
    this.reportError(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('analytics_events').insert({
        event_type: 'error:boundary',
        payload: {
          message: error.message,
          stack: error.stack?.slice(0, 2000),
          componentStack: errorInfo.componentStack?.slice(0, 2000),
          context: this.props.context || 'UI',
          url: window.location.href,
          timestamp: new Date().toISOString(),
        } as any,
      });
    } catch (_reportErr) {
      // Silently fail — don't cascade errors from error reporting
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
