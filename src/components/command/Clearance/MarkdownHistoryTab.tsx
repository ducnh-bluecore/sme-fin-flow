import { useState, useMemo, useEffect } from 'react';
import { Search, TrendingDown, ArrowRight, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMarkdownLadder } from '@/hooks/inventory/useMarkdownLadder';
import { useClearanceHistory, type ClearanceHistoryItem } from '@/hooks/inventory/useClearanceIntelligence';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatNumber } from '@/lib/format';

const LADDER_STEPS = [10, 20, 30, 40, 50];

/** Search inv_family_codes by name, return id + fc_name */
function useFcSearch(searchTerm: string) {
  const { buildQuery, tenantId, isReady } = useTenantQueryBuilder();
  const trimmed = searchTerm.trim();

  return useQuery({
    queryKey: ['fc-search', tenantId, trimmed],
    queryFn: async () => {
      const { data, error } = await buildQuery('inv_family_codes' as any)
        .select('id, fc_code, fc_name')
        .ilike('fc_name', `%${trimmed}%`)
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as { id: string; fc_code: string; fc_name: string }[];
    },
    enabled: isReady && !!tenantId && trimmed.length >= 2,
    staleTime: 30 * 1000,
  });
}

/** Autocomplete input that searches FC by name and returns UUID */
function FcSearchInput({ value, onChange, selectedName, onClear }: {
  value: string;
  onChange: (id: string, name: string) => void;
  selectedName: string;
  onClear: () => void;
}) {
  const [inputText, setInputText] = useState(selectedName);
  const [open, setOpen] = useState(false);
  const { data: results, isLoading } = useFcSearch(inputText);

  useEffect(() => {
    setInputText(selectedName);
  }, [selectedName]);

  return (
    <Popover open={open && inputText.length >= 2 && !value} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nhập tên sản phẩm để xem lịch sử..."
            value={inputText}
            onChange={e => {
              setInputText(e.target.value);
              if (value) onClear();
              setOpen(true);
            }}
            className="pl-9"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 max-h-60 overflow-y-auto" align="start" onOpenAutoFocus={e => e.preventDefault()}>
        {isLoading ? (
          <div className="p-2 text-xs text-muted-foreground">Đang tìm...</div>
        ) : results && results.length > 0 ? (
          results.map(r => (
            <button
              key={r.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-sm flex justify-between items-center"
              onClick={() => {
                onChange(r.id, r.fc_name);
                setInputText(r.fc_name);
                setOpen(false);
              }}
            >
              <span>{r.fc_name}</span>
              <span className="text-xs text-muted-foreground font-mono">{r.fc_code}</span>
            </button>
          ))
        ) : inputText.length >= 2 ? (
          <div className="p-2 text-xs text-muted-foreground">Không tìm thấy sản phẩm nào.</div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function LadderVisualization({ fcId }: { fcId?: string }) {
  const { data, isLoading } = useMarkdownLadder(fcId);

  const channels = useMemo(() => data ? [...new Set(data.steps.map(s => s.channel))] : [], [data]);
  const aggregatedSteps = useMemo(() => {
    const map = new Map<string, { score: number; units: number; revenue: number; days: number | null; samples: number; weightSum: number }>();
    if (!data) return map;
    data.steps.forEach(s => {
      const key = `${s.channel}|${s.discount_step}`;
      const existing = map.get(key);
      if (existing) {
        existing.weightSum += s.clearability_score * s.total_units_cleared;
        existing.units += s.total_units_cleared;
        existing.revenue += s.total_revenue;
        existing.samples += s.sample_count;
        existing.score = existing.units > 0 ? existing.weightSum / existing.units : 0;
      } else {
        map.set(key, {
          score: s.clearability_score,
          units: s.total_units_cleared,
          revenue: s.total_revenue,
          days: s.avg_days_to_clear,
          samples: s.sample_count,
          weightSum: s.clearability_score * s.total_units_cleared,
        });
      }
    });
    return map;
  }, [data]);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (!data || data.steps.length === 0) {
    return (
      <Alert>
        <AlertDescription>Chưa có dữ liệu Markdown Ladder. Dữ liệu sẽ tích lũy khi có sự kiện giảm giá.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
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
                {channels.map(ch => (
                  <TableRow key={ch}>
                    <TableCell className="font-medium text-sm">{ch}</TableCell>
                    {LADDER_STEPS.map(step => {
                      const agg = aggregatedSteps.get(`${ch}|${step}`);
                      if (!agg) return <TableCell key={step} className="text-center text-muted-foreground text-xs">—</TableCell>;
                      const score = Math.round(agg.score * 10) / 10;
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
                                  <span className="text-[10px] text-muted-foreground block">{formatNumber(agg.units)} sp</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div>Clearability: {score}/100</div>
                                  <div>Avg days: {agg.days ?? '—'}</div>
                                  <div>Revenue: {formatCurrency(agg.revenue)}</div>
                                  <div>Samples: {agg.samples} FC</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
  const [selectedFcId, setSelectedFcId] = useState(initialFcId || '');
  const [selectedName, setSelectedName] = useState('');
  const { data: history, isLoading } = useClearanceHistory(selectedFcId || undefined);

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
      <FcSearchInput
        value={selectedFcId}
        onChange={(id, name) => {
          setSelectedFcId(id);
          setSelectedName(name);
        }}
        selectedName={selectedName}
        onClear={() => {
          setSelectedFcId('');
          setSelectedName('');
        }}
      />

      <LadderVisualization fcId={selectedFcId || undefined} />

      {!selectedFcId && <Alert><TrendingDown className="h-4 w-4" /><AlertDescription>Nhập tên sản phẩm để xem lịch sử markdown theo thời gian và kênh.</AlertDescription></Alert>}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : selectedFcId && grouped.length === 0 ? (
        <Alert><AlertDescription>Không tìm thấy lịch sử giảm giá cho sản phẩm này.</AlertDescription></Alert>
      ) : selectedFcId ? (
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
