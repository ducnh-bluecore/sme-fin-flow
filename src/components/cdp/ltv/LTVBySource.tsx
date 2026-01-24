import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Megaphone, Users, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { useLTVBySource } from '@/hooks/useCDPLTVEngine';

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
}

function getSourceIcon(source: string) {
  const lowered = source.toLowerCase();
  if (lowered.includes('facebook') || lowered.includes('fb')) return '📘';
  if (lowered.includes('google')) return '🔍';
  if (lowered.includes('tiktok')) return '🎵';
  if (lowered.includes('shopee')) return '🛒';
  if (lowered.includes('lazada')) return '🏪';
  if (lowered.includes('organic')) return '🌱';
  if (lowered.includes('referral')) return '👥';
  if (lowered.includes('email')) return '📧';
  return '📊';
}

function LTVCACRatioBadge({ ratio }: { ratio: number | null }) {
  if (ratio === null) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }
  
  const getColor = () => {
    if (ratio >= 3) return 'bg-green-500';
    if (ratio >= 2) return 'bg-amber-500';
    if (ratio >= 1) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Badge className={`${getColor()} text-white`}>
      {ratio.toFixed(1)}x
    </Badge>
  );
}

export function LTVBySource() {
  const { data: sources, isLoading, error } = useLTVBySource();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Lỗi tải dữ liệu nguồn: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu Nguồn khách hàng</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Cần có thông tin nguồn (source) trong đơn hàng để phân tích LTV theo kênh.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalCustomers = sources.reduce((sum, s) => sum + s.customer_count, 0);
  const avgLTV = sources.reduce((sum, s) => sum + s.avg_ltv_24m * s.customer_count, 0) / totalCustomers;

  // Find best source
  const bestSource = sources.reduce((best, s) => 
    s.avg_ltv_24m > (best?.avg_ltv_24m || 0) ? s : best
  , sources[0]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Số nguồn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sources.length}</div>
            <p className="text-xs text-muted-foreground">kênh có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tổng KH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">có thông tin nguồn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              LTV TB (24m)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgLTV)}</div>
            <p className="text-xs text-muted-foreground">weighted average</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Nguồn tốt nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold flex items-center gap-2">
              {getSourceIcon(bestSource.acquisition_source)}
              {bestSource.acquisition_source}
            </div>
            <p className="text-xs text-muted-foreground">
              LTV: {formatCurrency(bestSource.avg_ltv_24m)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Source Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LTV theo Nguồn khách hàng</CardTitle>
          <CardDescription>
            So sánh giá trị vòng đời theo kênh acquisition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">Số KH</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">AOV</TableHead>
                  <TableHead className="text-right">Đơn TB</TableHead>
                  <TableHead className="text-right">LTV 12m</TableHead>
                  <TableHead className="text-right">LTV 24m</TableHead>
                  <TableHead className="text-right">CAC</TableHead>
                  <TableHead className="text-center">LTV:CAC</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => {
                  const percent = (source.customer_count / totalCustomers) * 100;
                  return (
                    <TableRow key={source.acquisition_source}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {getSourceIcon(source.acquisition_source)}
                          {source.acquisition_source}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {source.customer_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={percent} className="w-12 h-2" />
                          <span className="text-xs text-muted-foreground w-10">
                            {percent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(source.avg_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.avg_orders.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(source.avg_ltv_12m)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(source.avg_ltv_24m)}
                      </TableCell>
                      <TableCell className="text-right">
                        {source.estimated_cac > 0 
                          ? formatCurrency(source.estimated_cac) 
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <LTVCACRatioBadge ratio={source.ltv_cac_ratio} />
                      </TableCell>
                      <TableCell className="text-right">
                        {source.payback_months !== null ? (
                          <span className="flex items-center gap-1 justify-end">
                            <Clock className="h-3 w-3" />
                            {source.payback_months.toFixed(1)}m
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CAC Note */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Lưu ý về CAC:</strong> Chi phí thu hút khách hàng (CAC) được ước tính từ dữ liệu marketing.
            Nếu chưa có dữ liệu chi phí, CAC và LTV:CAC ratio sẽ hiển thị "-".
            Để có số liệu chính xác, hãy kết nối dữ liệu chi phí quảng cáo từ MDP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
