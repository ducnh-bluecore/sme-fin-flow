import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SegmentEquity {
  name: string;
  equity: number;
  share: number;
  customerCount: number;
  avgLTV: number;
  status: 'normal' | 'at_risk' | 'inactive';
}

interface EquityDistributionTableProps {
  segments?: SegmentEquity[];
}

const defaultSegments: SegmentEquity[] = [
  { name: 'TOP10 (Cao nhất)', equity: 22500000000, share: 50, customerCount: 1200, avgLTV: 18750000, status: 'normal' },
  { name: 'TOP20', equity: 9000000000, share: 20, customerCount: 1200, avgLTV: 7500000, status: 'normal' },
  { name: 'TOP30', equity: 6750000000, share: 15, customerCount: 1200, avgLTV: 5625000, status: 'at_risk' },
  { name: 'Trung bình', equity: 4500000000, share: 10, customerCount: 3600, avgLTV: 1250000, status: 'at_risk' },
  { name: 'Thấp / Không hoạt động', equity: 2250000000, share: 5, customerCount: 4800, avgLTV: 468750, status: 'inactive' },
];

export function EquityDistributionTable({ segments = defaultSegments }: EquityDistributionTableProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: SegmentEquity['status']) => {
    switch (status) {
      case 'normal':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Bình thường</Badge>;
      case 'at_risk':
        return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/20">Rủi ro</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Không hoạt động</Badge>;
    }
  };

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
            {segments.map((segment) => (
              <TableRow key={segment.name}>
                <TableCell className="font-medium">{segment.name}</TableCell>
                <TableCell className="text-right font-medium">
                  ₫{formatCurrency(segment.equity)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={segment.share} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {segment.share}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {segment.customerCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ₫{formatCurrency(segment.avgLTV)}
                </TableCell>
                <TableCell>{getStatusBadge(segment.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Ghi chú:</strong> Các con số trên dựa trên mô hình LTV Cơ sở, cập nhật ngày 20/01/2026. 
            Giá trị kỳ vọng có thể thay đổi khi điều chỉnh giả định trong mô hình.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
