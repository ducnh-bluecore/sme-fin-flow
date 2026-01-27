import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, DollarSign, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSalesProjection, SalesProjection } from '@/hooks/useSalesProjection';
import { Skeleton } from '@/components/ui/skeleton';

const formatVND = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
};

const confidenceConfig = {
  high: { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Cao' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Trung bình' },
  low: { color: 'text-red-600', bg: 'bg-red-500/10', label: 'Thấp' },
};

export function SalesProjectionPanel() {
  const { projection, isLoading, hasData } = useSalesProjection();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const config = confidenceConfig[projection.confidenceLevel];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Dự báo doanh thu
          </CardTitle>
          <Badge variant="outline" className={config.color}>
            Độ tin cậy: {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Chưa có dữ liệu doanh thu trong 90 ngày qua.
            <br />
            Dự báo sẽ tự động cập nhật khi có đơn hàng.
          </div>
        ) : (
          <>
            {/* Main projection metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Doanh thu TB/ngày (90d)</p>
                <p className="font-semibold">{formatVND(projection.dailyBaseRevenue)} ₫</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Dự báo doanh thu/ngày</p>
                <p className="font-semibold text-emerald-600">
                  {formatVND(projection.projectedDailyRevenue)} ₫
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  Tỷ lệ tăng trưởng
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Nguồn: {projection.growthSource === 'manual' ? 'Cài đặt thủ công' : 'Lịch sử'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </p>
                <p className="font-semibold">{projection.growthRate.toFixed(1)}%/tháng</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Settlement delay
                </p>
                <p className="font-semibold">T+{projection.settlementDelay} ngày</p>
              </div>
            </div>
            
            {/* Cash flow projection */}
            <div className={`rounded-lg p-3 ${config.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tiền vào dự kiến/ngày</p>
                  <p className="text-lg font-bold text-emerald-600">
                    +{formatVND(projection.dailyNetCashInflow)} ₫
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sau phí nền tảng</p>
                  <p className="text-sm font-medium">
                    {projection.netRevenueRate.toFixed(0)}% doanh thu
                  </p>
                </div>
              </div>
            </div>
            
            {/* Confidence explanation */}
            <p className="text-xs text-muted-foreground">
              {projection.confidenceDescription}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
