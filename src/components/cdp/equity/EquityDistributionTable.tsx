import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCDPEquityDistribution, EquityDistribution } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

export function EquityDistributionTable() {
  const { data: buckets, isLoading, error } = useCDPEquityDistribution();

  const formatCount = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('vi-VN');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getBucketLabel = (bucket: string) => {
    switch (bucket) {
      case '0-1M': return 'Thấp (0-1M)';
      case '1-3M': return 'Trung bình (1-3M)';
      case '3-10M': return 'Cao (3-10M)';
      case '10M+': return 'VIP (10M+)';
      case 'unknown': return 'Chưa xác định';
      default: return bucket;
    }
  };

  const getBucketBadge = (bucket: string) => {
    switch (bucket) {
      case '10M+':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">VIP</Badge>;
      case '3-10M':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Cao</Badge>;
      case '1-3M':
        return <Badge variant="outline" className="bg-info/10 text-info border-info/20">TB</Badge>;
      case 'unknown':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">N/A</Badge>;
      default:
        return <Badge variant="outline">{bucket}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Không thể tải dữ liệu phân bổ</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total for percentage
  const totalEquity = buckets?.reduce((sum, b) => sum + (b.equity_sum || 0), 0) || 0;
  const displayBuckets = buckets && buckets.length > 0 ? buckets : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phân bổ Giá trị theo Nhóm LTV</CardTitle>
        <CardDescription>
          Giá trị kỳ vọng được phân bổ theo mức LTV dự kiến 12 tháng
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayBuckets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu phân bổ. Chạy build CDP để tính toán.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhóm LTV</TableHead>
                  <TableHead className="text-right">Tổng Equity</TableHead>
                  <TableHead className="w-[200px]">Tỷ trọng</TableHead>
                  <TableHead className="text-right">Số KH</TableHead>
                  <TableHead className="text-right">LTV TB</TableHead>
                  <TableHead>Ước tính</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayBuckets.map((bucket) => {
                  const sharePercent = totalEquity > 0 ? ((bucket.equity_sum || 0) / totalEquity) * 100 : 0;
                  return (
                    <TableRow key={bucket.bucket}>
                      <TableCell className="font-medium">{getBucketLabel(bucket.bucket)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₫{formatCurrency(bucket.equity_sum)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={sharePercent} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {sharePercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCount(bucket.customer_count)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ₫{formatCurrency(bucket.equity_avg)}
                      </TableCell>
                      <TableCell>
                        {bucket.estimated_count > 0 ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">
                            {bucket.estimated_count} ước tính
                          </Badge>
                        ) : (
                          getBucketBadge(bucket.bucket)
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Ghi chú:</strong> Các con số dựa trên equity tính toán từ dữ liệu thực.
                {displayBuckets.some(b => b.estimated_count > 0) && (
                  <span className="text-warning-foreground"> ⚠️ Một số khách hàng sử dụng ước tính do thiếu COGS.</span>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
