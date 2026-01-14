import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSource {
  name: string;
  table: string;
  hasData: boolean;
  recordCount: number;
  isEstimated: boolean;
  lastSyncAt?: string;
}

interface DataQualityIndicatorProps {
  dataSources: DataSource[];
  compact?: boolean;
}

export function DataQualityIndicator({ dataSources, compact = false }: DataQualityIndicatorProps) {
  const qualityMetrics = useMemo(() => {
    const total = dataSources.length;
    const withRealData = dataSources.filter(d => d.hasData && !d.isEstimated).length;
    const withEstimatedData = dataSources.filter(d => d.hasData && d.isEstimated).length;
    const noData = dataSources.filter(d => !d.hasData).length;
    
    const qualityScore = total > 0 
      ? ((withRealData * 100) + (withEstimatedData * 50)) / total 
      : 0;
    
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (qualityScore >= 80) status = 'excellent';
    else if (qualityScore >= 60) status = 'good';
    else if (qualityScore >= 40) status = 'fair';
    else status = 'poor';
    
    return {
      total,
      withRealData,
      withEstimatedData,
      noData,
      qualityScore,
      status,
      realDataPercent: total > 0 ? (withRealData / total) * 100 : 0,
    };
  }, [dataSources]);

  const statusConfig = {
    excellent: {
      label: 'Xuất sắc',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: CheckCircle2,
    },
    good: {
      label: 'Tốt',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: CheckCircle2,
    },
    fair: {
      label: 'Trung bình',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: AlertTriangle,
    },
    poor: {
      label: 'Yếu',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: XCircle,
    },
  };

  const config = statusConfig[qualityMetrics.status];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn("gap-1 cursor-help", config.bgColor, config.color, config.borderColor)}
          >
            <Database className="h-3 w-3" />
            {qualityMetrics.realDataPercent.toFixed(0)}% Real
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1">
              <StatusIcon className={cn("h-4 w-4", config.color)} />
              Chất lượng dữ liệu: {config.label}
            </p>
            <div className="text-xs space-y-1">
              <p className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                {qualityMetrics.withRealData} nguồn dữ liệu thật
              </p>
              <p className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-400" />
                {qualityMetrics.withEstimatedData} nguồn ước lượng
              </p>
              {qualityMetrics.noData > 0 && (
                <p className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-400" />
                  {qualityMetrics.noData} nguồn thiếu
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card className={cn("border", config.borderColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Chất lượng dữ liệu MDP</CardTitle>
          </div>
          <Badge className={cn("gap-1", config.bgColor, config.color, config.borderColor)}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Điểm chất lượng</span>
            <span className={cn("font-bold", config.color)}>
              {qualityMetrics.qualityScore.toFixed(0)}/100
            </span>
          </div>
          <Progress value={qualityMetrics.qualityScore} className="h-2" />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-xs text-muted-foreground">Real</span>
            </div>
            <p className="text-lg font-bold text-green-400">{qualityMetrics.withRealData}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Estimated</span>
            </div>
            <p className="text-lg font-bold text-yellow-400">{qualityMetrics.withEstimatedData}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-red-400" />
              <span className="text-xs text-muted-foreground">Missing</span>
            </div>
            <p className="text-lg font-bold text-red-400">{qualityMetrics.noData}</p>
          </div>
        </div>

        {/* Data Sources List */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Chi tiết nguồn dữ liệu</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {dataSources.map((source) => (
              <div 
                key={source.table} 
                className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {source.hasData && !source.isEstimated ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : source.hasData ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-xs text-muted-foreground">{source.table}</p>
                  </div>
                </div>
                <div className="text-right">
                  {source.hasData ? (
                    <>
                      <p className="text-xs">
                        {source.recordCount.toLocaleString()} records
                      </p>
                      {source.isEstimated && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400">
                          Estimated
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">
                      Không có dữ liệu
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Improvement Tips */}
        {qualityMetrics.status !== 'excellent' && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs">
                <span className="font-medium text-primary">Cải thiện chất lượng:</span>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {qualityMetrics.noData > 0 && (
                    <li>• Import dữ liệu cho {qualityMetrics.noData} nguồn còn thiếu</li>
                  )}
                  {qualityMetrics.withEstimatedData > 0 && (
                    <li>• Thay thế {qualityMetrics.withEstimatedData} nguồn estimate bằng dữ liệu thật</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to calculate data quality from MDP data
export function useMDPDataQuality(queryResults: {
  campaigns: any[] | undefined;
  expenses: any[] | undefined;
  channelAnalytics: any[] | undefined;
  orders: any[] | undefined;
  channelFees: any[] | undefined;
  orderItems: any[] | undefined;
  settlements: any[] | undefined;
  products: any[] | undefined;
}) {
  return useMemo<DataSource[]>(() => {
    return [
      {
        name: 'Campaigns',
        table: 'promotion_campaigns',
        hasData: (queryResults.campaigns?.length || 0) > 0,
        recordCount: queryResults.campaigns?.length || 0,
        isEstimated: false,
      },
      {
        name: 'Marketing Expenses',
        table: 'marketing_expenses',
        hasData: (queryResults.expenses?.length || 0) > 0,
        recordCount: queryResults.expenses?.length || 0,
        isEstimated: false,
      },
      {
        name: 'Channel Analytics',
        table: 'channel_analytics',
        hasData: (queryResults.channelAnalytics?.length || 0) > 0,
        recordCount: queryResults.channelAnalytics?.length || 0,
        isEstimated: (queryResults.channelAnalytics?.length || 0) === 0,
      },
      {
        name: 'Orders',
        table: 'external_orders',
        hasData: (queryResults.orders?.length || 0) > 0,
        recordCount: queryResults.orders?.length || 0,
        isEstimated: false,
      },
      {
        name: 'Channel Fees',
        table: 'channel_fees',
        hasData: (queryResults.channelFees?.length || 0) > 0,
        recordCount: queryResults.channelFees?.length || 0,
        isEstimated: (queryResults.channelFees?.length || 0) === 0,
      },
      {
        name: 'Order Items (COGS)',
        table: 'external_order_items',
        hasData: (queryResults.orderItems?.length || 0) > 0,
        recordCount: queryResults.orderItems?.length || 0,
        isEstimated: (queryResults.orderItems?.length || 0) === 0,
      },
      {
        name: 'Settlements',
        table: 'channel_settlements',
        hasData: (queryResults.settlements?.length || 0) > 0,
        recordCount: queryResults.settlements?.length || 0,
        isEstimated: (queryResults.settlements?.length || 0) === 0,
      },
      {
        name: 'Products',
        table: 'external_products',
        hasData: (queryResults.products?.length || 0) > 0,
        recordCount: queryResults.products?.length || 0,
        isEstimated: false,
      },
    ];
  }, [queryResults]);
}
