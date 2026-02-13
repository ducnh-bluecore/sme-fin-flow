import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Loader2 } from 'lucide-react';
import { formatVNDCompact } from '@/lib/formatters';
import type { StoreHeatmapRow } from '@/hooks/inventory/useStoreHeatmap';

interface StoreHeatmapProps {
  data: StoreHeatmapRow[];
  isLoading: boolean;
}

type ViewMode = 'store' | 'region';

interface AggregatedRow {
  label: string;
  broken: number;
  risk: number;
  watch: number;
  healthy: number;
  lost_revenue: number;
  cash_locked: number;
}

export default function StoreHeatmap({ data, isLoading }: StoreHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('region');

  const rows: AggregatedRow[] = useMemo(() => {
    if (viewMode === 'store') {
      return data
        .map(s => ({
          label: s.store_name || s.store_id,
          broken: s.broken,
          risk: s.risk,
          watch: s.watch,
          healthy: s.healthy,
          lost_revenue: s.lost_revenue,
          cash_locked: s.cash_locked,
        }))
        .sort((a, b) => b.broken - a.broken);
    }
    // Region aggregation
    const regionMap = new Map<string, AggregatedRow>();
    for (const s of data) {
      const region = s.region || 'Không rõ';
      const existing = regionMap.get(region) || { label: region, broken: 0, risk: 0, watch: 0, healthy: 0, lost_revenue: 0, cash_locked: 0 };
      existing.broken += s.broken;
      existing.risk += s.risk;
      existing.watch += s.watch;
      existing.healthy += s.healthy;
      existing.lost_revenue += s.lost_revenue;
      existing.cash_locked += s.cash_locked;
      regionMap.set(region, existing);
    }
    return Array.from(regionMap.values()).sort((a, b) => b.broken - a.broken);
  }, [data, viewMode]);

  const maxCount = Math.max(...rows.map(r => Math.max(r.broken, r.risk, r.watch, r.healthy)), 1);

  const renderDots = (count: number, color: string) => {
    if (count === 0) return <span className="text-muted-foreground/30 text-xs">—</span>;
    const dotSize = count > 20 ? 'h-2.5 w-2.5' : 'h-3 w-3';
    const displayCount = Math.min(count, 8);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: displayCount }).map((_, i) => (
          <div key={i} className={`${dotSize} rounded-full ${color}`} />
        ))}
        {count > 8 && <span className="text-[10px] font-semibold ml-0.5">+{count - 8}</span>}
      </div>
    );
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Bản Đồ Sức Khỏe
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'region' ? 'default' : 'ghost'}
              className="h-6 text-[10px] px-2"
              onClick={() => setViewMode('region')}
            >
              Khu vực
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'store' ? 'default' : 'ghost'}
              className="h-6 text-[10px] px-2"
              onClick={() => setViewMode('store')}
            >
              Cửa hàng
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">Chưa có dữ liệu store</div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-[1fr_repeat(4,80px)] gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b">
                <div>{viewMode === 'region' ? 'Khu Vực' : 'Cửa Hàng'}</div>
                <div className="text-center">Lẻ Size</div>
                <div className="text-center">Rủi Ro</div>
                <div className="text-center">Theo Dõi</div>
                <div className="text-center">Khỏe</div>
              </div>
              {/* Rows */}
              {rows.map((row) => (
                <Tooltip key={row.label}>
                  <TooltipTrigger asChild>
                    <div className="grid grid-cols-[1fr_repeat(4,80px)] gap-1 py-2 border-b border-border/30 hover:bg-muted/30 cursor-default transition-colors items-center">
                      <div className="text-xs font-medium truncate">{row.label}</div>
                      <div className="flex justify-center">{renderDots(row.broken, 'bg-destructive')}</div>
                      <div className="flex justify-center">{renderDots(row.risk, 'bg-orange-500')}</div>
                      <div className="flex justify-center">{renderDots(row.watch, 'bg-amber-400')}</div>
                      <div className="flex justify-center">{renderDots(row.healthy, 'bg-emerald-500')}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold mb-1">{row.label}</p>
                    <p>Lẻ size: <span className="text-destructive font-bold">{row.broken}</span></p>
                    <p>Rủi ro: <span className="text-orange-600 font-bold">{row.risk}</span></p>
                    <p>Theo dõi: {row.watch} · Khỏe: {row.healthy}</p>
                    {row.lost_revenue > 0 && <p>DT rủi ro: <span className="text-destructive font-semibold">{formatVNDCompact(row.lost_revenue)}</span></p>}
                    {row.cash_locked > 0 && <p>Vốn khóa: <span className="text-orange-600 font-semibold">{formatVNDCompact(row.cash_locked)}</span></p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
