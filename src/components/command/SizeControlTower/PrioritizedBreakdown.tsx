import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Loader2, FileText } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { SizeHealthDetailRow } from '@/hooks/inventory/useSizeHealthGroups';

interface PrioritizedBreakdownProps {
  details: SizeHealthDetailRow[];
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onViewEvidence?: (productId: string) => void;
}

function getFixability(row: SizeHealthDetailRow): { label: string; stars: number; className: string } {
  if (row.markdown_risk_score >= 80) return { label: 'Sẽ giảm giá', stars: 1, className: 'text-destructive bg-destructive/10' };
  if (row.lost_revenue_est > 0 && row.cash_locked_value < row.lost_revenue_est * 0.3) return { label: 'Dễ', stars: 4, className: 'text-emerald-700 bg-emerald-500/10' };
  if (row.markdown_risk_score >= 40 && row.markdown_risk_score < 80) return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
  if (row.cash_locked_value > 0) return { label: 'Khó', stars: 2, className: 'text-orange-700 bg-orange-500/10' };
  return { label: 'Trung bình', stars: 3, className: 'text-amber-700 bg-amber-500/10' };
}

export default function PrioritizedBreakdown({
  details, isLoading, hasMore, totalCount, onLoadMore, onViewEvidence,
}: PrioritizedBreakdownProps) {
  // Sort by financial damage score
  const sorted = useMemo(() => {
    return [...details].sort((a, b) => {
      const damageA = (a.lost_revenue_est || 0) + (a.cash_locked_value || 0) + (a.margin_leak_value || 0);
      const damageB = (b.lost_revenue_est || 0) + (b.cash_locked_value || 0) + (b.margin_leak_value || 0);
      return damageB - damageA;
    });
  }, [details]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Mẫu Lẻ Size — Ưu Tiên Theo Thiệt Hại
            <Badge variant="destructive" className="text-[10px]">{totalCount} mẫu</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">Không có mẫu lẻ size</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[200px]">Mẫu SP</TableHead>
                    <TableHead className="text-center text-xs">Sức Khỏe</TableHead>
                    <TableHead className="text-right text-xs">DT Mất</TableHead>
                    <TableHead className="text-right text-xs">Vốn Khóa</TableHead>
                    <TableHead className="text-right text-xs">Rò Biên</TableHead>
                    <TableHead className="text-center text-xs">Khả Năng Fix</TableHead>
                    <TableHead className="text-center text-xs">MD ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((row, i) => {
                    const fix = getFixability(row);
                    const totalDamage = (row.lost_revenue_est || 0) + (row.cash_locked_value || 0) + (row.margin_leak_value || 0);
                    return (
                      <TableRow
                        key={row.product_id}
                        className={`cursor-pointer hover:bg-muted/50 ${i < 3 ? 'bg-destructive/5' : ''}`}
                        onClick={() => onViewEvidence?.(row.product_id)}
                      >
                        <TableCell className="text-xs font-medium max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground font-bold text-[10px] w-4">{i + 1}</span>
                            <span className="truncate">{row.product_name}</span>
                            {row.core_size_missing && (
                              <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 shrink-0">core</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${
                            row.size_health_score >= 80 ? 'text-emerald-600' :
                            row.size_health_score >= 60 ? 'text-amber-600' :
                            row.size_health_score >= 40 ? 'text-orange-600' : 'text-destructive'
                          }`}>
                            {Math.round(row.size_health_score)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.lost_revenue_est > 0 ? <span className="text-destructive">{formatVNDCompact(row.lost_revenue_est)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.cash_locked_value > 0 ? <span className="text-orange-600">{formatVNDCompact(row.cash_locked_value)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {row.margin_leak_value > 0 ? <span className="text-red-600">{formatVNDCompact(row.margin_leak_value)}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[10px] ${fix.className}`}>
                            {fix.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {row.markdown_eta_days ? `${row.markdown_eta_days}d` : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {(hasMore || isLoading) && (
              <div className="flex justify-center py-3 border-t">
                <Button variant="ghost" size="sm" disabled={isLoading} onClick={onLoadMore}>
                  {isLoading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Đang tải...</> : <>Tải thêm ({sorted.length}/{totalCount})</>}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
