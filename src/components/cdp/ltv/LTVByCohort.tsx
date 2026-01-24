import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLTVByCohort } from '@/hooks/useCDPLTVEngine';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '0';
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

function safeNumber(value: number | null | undefined): number {
  return value ?? 0;
}

function QualityBadge({ score }: { score: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'Cao', variant: 'default' as const, className: 'bg-green-500' },
    medium: { label: 'TB', variant: 'secondary' as const, className: 'bg-amber-500 text-white' },
    low: { label: 'Thấp', variant: 'destructive' as const, className: '' },
  };
  const c = config[score];
  return (
    <Badge variant={c.variant} className={`text-xs ${c.className}`}>
      {c.label}
    </Badge>
  );
}

function TrendIndicator({ value }: { value: number | null | undefined }) {
  const safeValue = safeNumber(value);
  if (safeValue > 5) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <TrendingUp className="h-3 w-3" />
        +{safeValue.toFixed(1)}%
      </span>
    );
  }
  if (safeValue < -5) {
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm">
        <TrendingDown className="h-3 w-3" />
        {safeValue.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="h-3 w-3" />
      {safeValue.toFixed(1)}%
    </span>
  );
}

export function LTVByCohort() {
  const { data: cohorts, isLoading, error } = useLTVByCohort();

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
          <p className="text-destructive">Lỗi tải dữ liệu cohort: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu Cohort</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Cần có ít nhất 2 tháng dữ liệu đơn hàng để phân tích cohort.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate average metrics for summary (null-safe)
  const avgRetention3m = cohorts.length > 0 
    ? cohorts.reduce((sum, c) => sum + safeNumber(c.retention_rate_3m), 0) / cohorts.length 
    : 0;
  const avgLTV12m = cohorts.length > 0 
    ? cohorts.reduce((sum, c) => sum + safeNumber(c.estimated_ltv_12m), 0) / cohorts.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Số Cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cohorts.length}</div>
            <p className="text-xs text-muted-foreground">tháng có dữ liệu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Retention TB (3 tháng)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRetention3m.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">trung bình các cohort</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>LTV 12m TB</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgLTV12m)}</div>
            <p className="text-xs text-muted-foreground">ước tính từ cohort</p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân tích Cohort</CardTitle>
          <CardDescription>
            LTV và retention theo tháng gia nhập của khách hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead className="text-right">Số KH</TableHead>
                  <TableHead className="text-right">AOV</TableHead>
                  <TableHead className="text-right">Ret. 3m</TableHead>
                  <TableHead className="text-right">Ret. 6m</TableHead>
                  <TableHead className="text-right">LTV 12m</TableHead>
                  <TableHead className="text-right">LTV 24m</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-center">Chất lượng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohorts.slice(0, 12).map((cohort) => (
                  <TableRow key={cohort.cohort_month}>
                    <TableCell className="font-medium">
                      {format(parseISO(cohort.cohort_month), 'MMM yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell className="text-right">
                      {safeNumber(cohort.cohort_size).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cohort.avg_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {safeNumber(cohort.retention_rate_3m).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {safeNumber(cohort.retention_rate_6m).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cohort.estimated_ltv_12m)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(cohort.estimated_ltv_24m)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TrendIndicator value={cohort.ltv_trend_vs_prev} />
                    </TableCell>
                    <TableCell className="text-center">
                      <QualityBadge score={cohort.quality_score} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insight */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Ghi chú:</strong> LTV ước tính dựa trên công thức: 
            <code className="mx-1 px-1 bg-background rounded">Profit × 4 × Retention</code>
            cho 12 tháng. Chất lượng cohort dựa trên retention 3 tháng (&gt;60% = Cao) 
            và số đơn trung bình (&gt;2 = Cao).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
