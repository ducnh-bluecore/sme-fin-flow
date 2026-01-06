import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Global Error Boundary with multiple levels of fallback
 * - page: Full page error with navigation options
 * - section: Section-level error with retry
 * - component: Minimal error indicator
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    const { level = 'section' } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      switch (level) {
        case 'page':
          return <PageLevelError 
            error={this.state.error} 
            onRetry={this.handleReset}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
          />;
        case 'section':
          return <SectionLevelError 
            error={this.state.error} 
            onRetry={this.handleReset}
          />;
        case 'component':
          return <ComponentLevelError onRetry={this.handleReset} />;
        default:
          return <SectionLevelError 
            error={this.state.error} 
            onRetry={this.handleReset}
          />;
      }
    }

    return this.props.children;
  }
}

// ============= Page Level Error =============

interface PageLevelErrorProps {
  error?: Error;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

function PageLevelError({ error, onRetry, onReload, onGoHome }: PageLevelErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-full bg-destructive/10 p-6 inline-block">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Đã xảy ra lỗi
          </h1>
          <p className="text-muted-foreground">
            Trang này gặp sự cố. Vui lòng thử lại hoặc quay về trang chủ.
          </p>
        </div>

        {error && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Chi tiết lỗi</span>
            </div>
            <p className="text-sm text-muted-foreground font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
          <Button onClick={onReload} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tải lại trang
          </Button>
          <Button onClick={onGoHome} variant="ghost" className="gap-2">
            <Home className="h-4 w-4" />
            Trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============= Section Level Error =============

interface SectionLevelErrorProps {
  error?: Error;
  onRetry: () => void;
}

function SectionLevelError({ error, onRetry }: SectionLevelErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h3 className="font-semibold text-foreground mb-1">
          Không thể tải nội dung này
        </h3>
        <p className="text-sm text-muted-foreground">
          {error?.message || 'Đã xảy ra lỗi không xác định'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </Button>
    </div>
  );
}

// ============= Component Level Error =============

interface ComponentLevelErrorProps {
  onRetry: () => void;
}

function ComponentLevelError({ onRetry }: ComponentLevelErrorProps) {
  return (
    <div className="flex items-center gap-2 p-2 text-sm text-destructive bg-destructive/10 rounded">
      <AlertTriangle className="h-4 w-4" />
      <span>Lỗi</span>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onRetry}
        className="h-6 px-2 text-xs"
      >
        Thử lại
      </Button>
    </div>
  );
}

// ============= HOC for wrapping components =============

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  level: 'page' | 'section' | 'component' = 'section'
) {
  return function WithErrorBoundary(props: P) {
    return (
      <GlobalErrorBoundary level={level}>
        <WrappedComponent {...props} />
      </GlobalErrorBoundary>
    );
  };
}

// ============= Hook-style error boundary (for functional components) =============

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  level?: 'page' | 'section' | 'component';
  fallback?: ReactNode;
}

export function ErrorBoundaryWrapper({ 
  children, 
  level = 'section',
  fallback 
}: ErrorBoundaryWrapperProps) {
  return (
    <GlobalErrorBoundary level={level} fallback={fallback}>
      {children}
    </GlobalErrorBoundary>
  );
}
