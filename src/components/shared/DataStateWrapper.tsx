import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Database, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DataStateWrapperProps {
  children: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  error?: Error | null;
  onRetry?: () => void;
  
  // Customization
  loadingComponent?: ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  errorMessage?: string;
  className?: string;
  
  // Show skeleton instead of spinner
  skeletonMode?: 'card' | 'table' | 'chart' | 'list';
  skeletonCount?: number;
}

/**
 * Unified component for handling loading, error, and empty states
 * Prevents blank pages by always showing appropriate feedback
 */
export function DataStateWrapper({
  children,
  isLoading,
  isError,
  isEmpty,
  error,
  onRetry,
  loadingComponent,
  emptyMessage = 'Chưa có dữ liệu',
  emptyDescription = 'Dữ liệu sẽ hiển thị khi bạn nhập hoặc đồng bộ từ các nguồn.',
  emptyIcon,
  errorMessage = 'Không thể tải dữ liệu',
  className,
  skeletonMode = 'card',
  skeletonCount = 3,
}: DataStateWrapperProps) {
  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <LoadingSkeleton mode={skeletonMode} count={skeletonCount} className={className} />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        message={errorMessage}
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <EmptyState
        message={emptyMessage}
        description={emptyDescription}
        icon={emptyIcon}
        className={className}
      />
    );
  }

  // Render children when data is available
  return <>{children}</>;
}

// ============= Loading States =============

interface LoadingSkeletonProps {
  mode: 'card' | 'table' | 'chart' | 'list';
  count: number;
  className?: string;
}

function LoadingSkeleton({ mode, count, className }: LoadingSkeletonProps) {
  switch (mode) {
    case 'card':
      return (
        <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      );
    
    case 'table':
      return (
        <div className={cn('space-y-3', className)}>
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    
    case 'chart':
      return (
        <div className={cn('rounded-lg border bg-card p-6', className)}>
          <Skeleton className="h-6 w-1/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    
    case 'list':
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    
    default:
      return (
        <div className={cn('flex items-center justify-center p-8', className)}>
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
  }
}

// ============= Error State =============

interface ErrorStateProps {
  message: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({ message, error, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 text-center space-y-4',
      'border border-destructive/20 rounded-lg bg-destructive/5',
      className
    )}>
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div>
        <h3 className="font-semibold text-foreground mb-1">{message}</h3>
        {error && (
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message || 'Đã xảy ra lỗi không xác định'}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </Button>
      )}
    </div>
  );
}

// ============= Empty State =============

interface EmptyStateProps {
  message: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function EmptyState({ message, description, icon, className, action }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-8 text-center space-y-4',
      'border border-dashed border-border rounded-lg bg-muted/20',
      className
    )}>
      <div className="rounded-full bg-muted p-4">
        {icon || <Database className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{message}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

// ============= Section Wrapper =============

interface SectionWrapperProps {
  title?: string;
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function SectionWrapper({
  title,
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  error,
  onRetry,
  emptyMessage,
  className,
}: SectionWrapperProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      )}
      <DataStateWrapper
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        error={error}
        onRetry={onRetry}
        emptyMessage={emptyMessage}
        skeletonMode="card"
      >
        {children}
      </DataStateWrapper>
    </div>
  );
}
