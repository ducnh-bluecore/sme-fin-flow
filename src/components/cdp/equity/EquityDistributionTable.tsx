import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCDPEquityDistribution } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';

export function EquityDistributionTable() {
  const { data: segments, isLoading } = useCDPEquityDistribution();

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Bình thường</Badge>;
      case 'at_risk':
        return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">Rủi ro</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Không hoạt động</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const displaySegments = segments && segments.length > 0 ? segments : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phân bổ Giá trị theo Tập khách hàng</CardTitle>
        <CardDescription>
          Giá trị kỳ vọng được phân bổ theo nhóm giá trị và trạng thái hành vi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tập khách hàng</TableHead>
              <TableHead className="text-right">Giá trị Kỳ vọng</TableHead>
              <TableHead className="w-[200px]">Tỷ trọng</TableHead>
              <TableHead className="text-right">Số KH</TableHead>
              <TableHead className="text-right">LTV TB</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displaySegments.map((segment) => (
              <TableRow key={segment.segment_id}>
                <TableCell className="font-medium">{segment.segment_name}</TableCell>
                <TableCell className="text-right font-medium">
                  ₫{formatCurrency(segment.equity)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={segment.share_percent} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {segment.share_percent}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {segment.customer_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ₫{formatCurrency(segment.avg_ltv)}
                </TableCell>
                <TableCell>{getStatusBadge(segment.display_status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Ghi chú:</strong> Các con số trên dựa trên mô hình LTV Cơ sở. 
            Giá trị kỳ vọng có thể thay đổi khi điều chỉnh giả định trong mô hình.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
