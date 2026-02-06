/**
 * ContextualAIPanel - AI Analysis Panel Component
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for Edge Function invocation with tenant context
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, RefreshCw, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export type AnalysisContext = 
  | 'general' 
  | 'profitability' 
  | 'pl_report' 
  | 'analytics' 
  | 'financial_analysis'
  | 'revenue'
  | 'expenses'
  | 'scenario'
  | 'budget_vs_actual';

interface ContextualAIPanelProps {
  context: AnalysisContext;
  title?: string;
  className?: string;
  compact?: boolean;
}

const contextTitles: Record<AnalysisContext, string> = {
  general: 'Phân tích AI Tổng quan',
  profitability: 'AI Phân tích Lợi nhuận',
  pl_report: 'AI Phân tích Báo cáo P&L',
  analytics: 'AI Phân tích Báo cáo',
  financial_analysis: 'AI Phân tích Tài chính',
  revenue: 'AI Phân tích Doanh thu',
  expenses: 'AI Phân tích Chi phí',
  scenario: 'AI Phân tích Kịch bản',
  budget_vs_actual: 'AI Đề xuất Hành động',
};

export function ContextualAIPanel({ 
  context, 
  title,
  className,
  compact = false,
  autoLoad = false, // Default to manual load for better performance
}: ContextualAIPanelProps & { autoLoad?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [hasTriggeredLoad, setHasTriggeredLoad] = useState(autoLoad);
  const queryClient = useQueryClient();
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  // Local fetch function using tenant-aware client
  const fetchContextualAnalysis = async (ctx: AnalysisContext) => {
    const { data, error } = await client.functions.invoke('analyze-contextual', {
      body: { context: ctx, tenant_id: tenantId },
    });

    if (error) {
      const message = (error as any)?.message || 'Lỗi phân tích';
      throw new Error(message);
    }

    return data;
  };

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['contextual-analysis', context, tenantId],
    queryFn: () => fetchContextualAnalysis(context),
    staleTime: 10 * 60 * 1000, // 10 minutes - increased for better caching
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 1,
    enabled: hasTriggeredLoad && !!tenantId && isReady, // Only fetch when triggered and ready
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchContextualAnalysis(context),
    onSuccess: (newData) => {
      queryClient.setQueryData(['contextual-analysis', context, tenantId], newData);
    },
  });

  const handleRefresh = () => {
    setHasTriggeredLoad(true);
    if (data) {
      refreshMutation.mutate();
    }
  };

  const handleStartAnalysis = () => {
    setHasTriggeredLoad(true);
  };

  const displayTitle = title || contextTitles[context];
  const isRefreshing = isFetching || refreshMutation.isPending;

  // Show "Start Analysis" button if not yet triggered
  if (!hasTriggeredLoad) {
    return (
      <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Nhấn nút bên dưới để bắt đầu phân tích AI
          </p>
          <Button onClick={handleStartAnalysis} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Bắt đầu phân tích
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Đang phân tích...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{(error as Error).message}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {displayTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}
            </Button>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Summary Stats */}
          {data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {data.summary.totalRevenue !== undefined && (
                <QuickStat label="Doanh thu" value={formatCurrency(data.summary.totalRevenue)} />
              )}
              {data.summary.totalExpenses !== undefined && (
                <QuickStat label="Chi phí" value={formatCurrency(data.summary.totalExpenses)} />
              )}
              {data.summary.netIncome !== undefined && (
                <QuickStat 
                  label="Lợi nhuận" 
                  value={formatCurrency(data.summary.netIncome)} 
                  highlight={data.summary.netIncome < 0}
                />
              )}
              {data.summary.profitMargin !== undefined && (
                <QuickStat label="Biên LN" value={`${data.summary.profitMargin.toFixed(1)}%`} />
              )}
            </div>
          )}

          {/* AI Analysis */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                h2: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
                h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>,
                p: ({ children }) => <p className="text-sm text-muted-foreground mb-2">{children}</p>,
                ul: ({ children }) => <ul className="text-sm space-y-1 mb-2 list-disc pl-4">{children}</ul>,
                li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
              }}
            >
              {data?.analysis || 'Không có dữ liệu phân tích.'}
            </ReactMarkdown>
          </div>

          {/* Usage info */}
          {data?.usage && (
            <div className="mt-4 pt-3 border-t border-primary/10 flex items-center justify-between text-xs text-muted-foreground">
              <span>Model: {data.model}</span>
              <span>{data.usage.totalTokens} tokens</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function QuickStat({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded-lg",
      highlight ? "bg-destructive/10" : "bg-background/50"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-sm font-semibold",
        highlight && "text-destructive"
      )}>{value}</p>
    </div>
  );
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(0)} tr`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}${absValue.toFixed(0)}`;
}
