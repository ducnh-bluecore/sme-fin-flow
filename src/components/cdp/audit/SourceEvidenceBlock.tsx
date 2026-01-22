import { Database, Check, X, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataSource {
  name: string;
  hasData: boolean;
  orderCount: number;
  totalValue: number;
  lastSync?: string;
}

interface SourceEvidenceBlockProps {
  sources: DataSource[];
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}tr`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function SourceEvidenceBlock({ sources }: SourceEvidenceBlockProps) {
  const totalOrders = sources.reduce((sum, s) => sum + s.orderCount, 0);
  const totalValue = sources.reduce((sum, s) => sum + s.totalValue, 0);
  const sourcesWithData = sources.filter(s => s.hasData).length;

  // Check for potential duplicates or missing data
  const hasWarning = sources.some(s => !s.hasData) || sources.length < 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5" />
              Bằng chứng theo Nguồn
            </CardTitle>
            <CardDescription>
              Xác minh dữ liệu không thiếu, không trùng – hỗ trợ audit
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasWarning && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 font-normal">
                <AlertCircle className="w-3 h-3 mr-1" />
                Cần xem xét
              </Badge>
            )}
            <Badge variant="outline" className="font-normal text-xs">
              {sourcesWithData}/{sources.length} nguồn
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Nguồn dữ liệu</TableHead>
                <TableHead className="text-center w-[100px]">Trạng thái</TableHead>
                <TableHead className="text-right w-[100px]">Số đơn</TableHead>
                <TableHead className="text-right w-[140px]">Tổng giá trị</TableHead>
                <TableHead className="w-[140px]">Đồng bộ gần nhất</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow 
                  key={source.name}
                  className={cn(!source.hasData && "opacity-60")}
                >
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell className="text-center">
                    {source.hasData ? (
                      <div className="flex items-center justify-center gap-1">
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">Có</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <X className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Không</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {source.hasData ? source.orderCount : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {source.hasData ? formatCurrency(source.totalValue) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {source.lastSync || '—'}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Summary Row */}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>Tổng cộng</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right tabular-nums">{totalOrders}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(totalValue)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Audit Note */}
        <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-xs text-muted-foreground text-center">
            Bảng này dùng để xác minh dữ liệu từ các nguồn khác nhau đã được tổng hợp chính xác.
            <br />
            Không có hành động nào được phép thực hiện từ màn hình này.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
