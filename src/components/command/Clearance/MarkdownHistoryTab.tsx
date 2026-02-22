import { useState, useMemo } from 'react';
import { Search, TrendingDown, ArrowRight, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarkdownLadder } from '@/hooks/inventory/useMarkdownLadder';
import { useClearanceHistory, type ClearanceHistoryItem } from '@/hooks/inventory/useClearanceIntelligence';
import { formatCurrency, formatNumber } from '@/lib/format';

const LADDER_STEPS = [10, 20, 30, 40, 50];

function LadderVisualization({ fcId }: { fcId?: string }) {
  const { data, isLoading } = useMarkdownLadder(fcId);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (!data || data.steps.length === 0) {
    return (
      <Alert>
        <AlertDescription>Chưa có dữ liệu Markdown Ladder. Dữ liệu sẽ tích lũy khi có sự kiện giảm giá.</AlertDescription>
      </Alert>
    );
  }

  const channels = [...new Set(data.steps.map(s => s.channel))];

  return (
    <div className="space-y-4">
      {/* Ladder Steps Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Clearability theo bậc giảm giá</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-24">Kênh</TableHead>
                  {LADDER_STEPS.map(step => (
                    <TableHead key={step} className="text-center">{step}%</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map(ch => {
                  const chSteps = data.steps.filter(s => s.channel === ch);
                  return (
                    <TableRow key={ch}>
                      <TableCell className="font-medium text-sm">{ch}</TableCell>
                      {LADDER_STEPS.map(step => {
                        const found = chSteps.find(s => s.discount_step === step);
                        if (!found) return <TableCell key={step} className="text-center text-muted-foreground text-xs">—</TableCell>;
                        const score = found.clearability_score;
                        const color = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';
                        const progressColor = score >= 70 ? '[&>div]:bg-emerald-500' : score >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500';
                        return (
                          <TableCell key={step} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="space-y-1">
                                    <span className={`text-xs font-mono font-bold ${color}`}>{score}</span>
                                    <Progress value={score} className={`h-1.5 ${progressColor}`} />
                                    <span className="text-[10px] text-muted-foreground block">{formatNumber(found.total_units_cleared)} units</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div>Clearability: {score}/100</div>
                                    <div>Avg days: {found.avg_days_to_clear ?? '—'}</div>
                                    <div>Revenue: {formatCurrency(found.total_revenue)}</div>
                                    <div>Samples: {found.sample_count}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Channel Comparison */}
      {data.channels.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">So sánh kênh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.channels.map(ch => {
                const clearabilityColor = ch.avgClearability >= 70 ? 'text-green-400' : ch.avgClearability >= 40 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={ch.channel} className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm capitalize">{ch.channel}</div>
                      <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">
                        Giảm tốt nhất: {ch.bestStep}%
                      </Badge>
                    </div>

                    {/* Clearability bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Điểm thoát hàng TB</span>
                        <span className={`font-mono font-semibold ${clearabilityColor}`}>
                          {ch.avgClearability.toFixed(1)}/100
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ch.avgClearability >= 70 ? 'bg-green-500' : ch.avgClearability >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(ch.avgClearability, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Đã thoát</div>
                        <div className="text-xs font-mono font-medium">{formatNumber(ch.totalUnitsCleared)} sp</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Doanh thu</div>
                        <div className="text-xs font-mono font-medium">{formatCurrency(ch.totalRevenue)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Step Recommendations */}
      {data.recommendations.length > 0 && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-600">
              <Zap className="h-4 w-4" />Đề xuất bước tiếp theo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 bg-blue-500/5 rounded-lg p-3">
                  <Badge variant="outline">{rec.channel}</Badge>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono">{rec.currentStep}%</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono font-bold text-blue-600">{rec.nextStep}%</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Clearability: {rec.expectedClearability} {rec.expectedDays ? `· ~${rec.expectedDays} ngày` : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MarkdownHistoryTabProps {
  initialFcId?: string;
}

export default function MarkdownHistoryTab({ initialFcId }: MarkdownHistoryTabProps) {
  const [searchSku, setSearchSku] = useState(initialFcId || '');
  const { data: history, isLoading } = useClearanceHistory(searchSku || undefined);

  const grouped = useMemo(() => {
    if (!history) return [];
    const map = new Map<string, { band: string; channel: string; units: number; revenue: number; discount: number; months: string[] }>();
    history.forEach(h => {
      const key = `${h.discount_band}|${h.channel}`;
      const existing = map.get(key);
      if (existing) { existing.units += h.units_sold; existing.revenue += h.revenue_collected; existing.discount += h.total_discount_given; if (!existing.months.includes(h.sale_month)) existing.months.push(h.sale_month); }
      else { map.set(key, { band: h.discount_band, channel: h.channel, units: h.units_sold, revenue: h.revenue_collected, discount: h.total_discount_given, months: [h.sale_month] }); }
    });
    const bandOrder = ['0-20%', '20-30%', '30-50%', '>50%'];
    return Array.from(map.values()).sort((a, b) => bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band));
  }, [history]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Nhập tên sản phẩm để xem lịch sử..." value={searchSku} onChange={e => setSearchSku(e.target.value)} className="pl-9" />
      </div>

      {/* Markdown Ladder Section */}
      <LadderVisualization fcId={searchSku || undefined} />

      {!searchSku && <Alert><TrendingDown className="h-4 w-4" /><AlertDescription>Nhập tên sản phẩm để xem lịch sử markdown theo thời gian và kênh.</AlertDescription></Alert>}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : searchSku && grouped.length === 0 ? (
        <Alert><AlertDescription>Không tìm thấy lịch sử giảm giá cho sản phẩm này.</AlertDescription></Alert>
      ) : searchSku ? (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead>Mức giảm</TableHead><TableHead>Kênh</TableHead><TableHead className="text-right">Số lượng clear</TableHead><TableHead className="text-right">Doanh thu thu về</TableHead><TableHead className="text-right">Tổng discount</TableHead><TableHead className="text-right">Số tháng</TableHead></TableRow></TableHeader>
            <TableBody>
              {grouped.map((g, i) => (
                <TableRow key={i}>
                  <TableCell><Badge variant={g.band === '>50%' ? 'destructive' : 'secondary'}>{g.band}</Badge></TableCell>
                  <TableCell className="font-medium">{g.channel}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(g.units)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(g.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(g.discount)}</TableCell>
                  <TableCell className="text-right">{g.months.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
