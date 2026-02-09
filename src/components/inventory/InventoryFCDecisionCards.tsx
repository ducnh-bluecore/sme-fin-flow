import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ChevronRight, Timer, Pause, Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';
import { RebalanceDetailSheet } from './RebalanceDetailSheet';

interface Props {
  suggestions: RebalanceSuggestion[];
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}

interface FCGroup {
  fcId: string;
  fcName: string;
  highestPriority: string;
  suggestions: RebalanceSuggestion[];
  totalQty: number;
  totalRevenue: number;
  totalNetBenefit: number;
  avgWeeksCover: number;
  stockoutCount: number;
  avgVelocity: number;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  P1: { label: 'Khẩn cấp', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-l-red-500' },
  P2: { label: 'Quan trọng', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-l-yellow-500' },
  P3: { label: 'Theo dõi', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-l-blue-500' },
};

const RECOMMENDATION: Record<string, { label: string; icon: typeof Pause; bg: string; text: string }> = {
  P1: { label: 'DỪNG NGAY', icon: Pause, bg: 'bg-red-500/20', text: 'text-red-400' },
  P2: { label: 'CẦN ĐIỀU TRA', icon: Eye, bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  P3: { label: 'TỐI ƯU', icon: TrendingUp, bg: 'bg-green-500/20', text: 'text-green-400' },
};

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
}

function groupByFC(suggestions: RebalanceSuggestion[]): FCGroup[] {
  const map = new Map<string, RebalanceSuggestion[]>();
  suggestions.forEach(s => {
    const key = s.fc_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  const groups: FCGroup[] = [];
  map.forEach((items, fcId) => {
    const priorities = items.map(i => i.priority).sort();
    const highestPriority = priorities[0] || 'P3';
    const stockoutCount = items.filter(i => (i.to_weeks_cover || 0) < 0.5).length;

    groups.push({
      fcId,
      fcName: items[0].fc_name || fcId,
      highestPriority,
      suggestions: items,
      totalQty: items.reduce((s, i) => s + i.qty, 0),
      totalRevenue: items.reduce((s, i) => s + (i.potential_revenue_gain || 0), 0),
      totalNetBenefit: items.reduce((s, i) => s + (i.net_benefit || 0), 0),
      avgWeeksCover: items.reduce((s, i) => s + (i.to_weeks_cover || 0), 0) / items.length,
      stockoutCount,
      avgVelocity: 0, // would need demand data for real velocity
    });
  });

  return groups.sort((a, b) => {
    if (a.highestPriority !== b.highestPriority) return a.highestPriority.localeCompare(b.highestPriority);
    return b.totalNetBenefit - a.totalNetBenefit;
  });
}

export function InventoryFCDecisionCards({ suggestions, onApprove, onReject }: Props) {
  const [selectedFC, setSelectedFC] = useState<FCGroup | null>(null);
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const groups = groupByFC(pendingSuggestions);

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Không có FC nào cần hành động.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => {
          const pConfig = PRIORITY_CONFIG[group.highestPriority] || PRIORITY_CONFIG.P3;
          const rec = RECOMMENDATION[group.highestPriority] || RECOMMENDATION.P3;
          const RecIcon = rec.icon;

          // Cost of delay estimate: revenue at risk / 48h
          const hourlyLoss = group.totalRevenue > 0 ? group.totalRevenue / 48 : 0;

          return (
            <Card
              key={group.fcId}
              className={cn(
                "overflow-hidden border-l-4 hover:shadow-lg transition-shadow cursor-pointer group",
                pConfig.borderColor,
                group.highestPriority === 'P1' && "bg-gradient-to-r from-red-500/5 via-transparent to-transparent",
                group.highestPriority === 'P2' && "bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent",
                group.highestPriority === 'P3' && "bg-gradient-to-r from-blue-500/5 via-transparent to-transparent",
              )}
              onClick={() => setSelectedFC(group)}
            >
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("p-2.5 rounded-xl shrink-0", pConfig.bgColor)}>
                    <Package className={cn("h-5 w-5", pConfig.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={cn("text-xs font-semibold", pConfig.bgColor, pConfig.color)}>
                        {group.highestPriority} - {pConfig.label}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-base leading-tight line-clamp-2">
                      {group.fcName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Đề xuất chuyển {group.totalQty.toLocaleString()} units • {group.suggestions.length} transfers
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-emerald-400">
                      +{formatCurrency(group.totalRevenue)}đ
                    </div>
                    <p className="text-xs text-muted-foreground">Revenue tiềm năng</p>
                  </div>
                </div>

                {/* Key Facts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 p-2 bg-muted/30 rounded-lg">
                  <div className="text-center p-1.5">
                    <span className="text-sm font-semibold">{group.totalQty.toLocaleString()}</span>
                    <p className="text-[10px] text-muted-foreground">Units</p>
                  </div>
                  <div className="text-center p-1.5">
                    <span className="text-sm font-semibold">{group.avgWeeksCover.toFixed(1)}w</span>
                    <p className="text-[10px] text-muted-foreground">Avg Cover đích</p>
                  </div>
                  <div className="text-center p-1.5">
                    <span className={cn("text-sm font-semibold", group.stockoutCount > 0 ? "text-red-400" : "text-foreground")}>
                      {group.stockoutCount}
                    </span>
                    <p className="text-[10px] text-muted-foreground">Stockout risk</p>
                  </div>
                  <div className="text-center p-1.5">
                    <span className="text-sm font-semibold">{group.suggestions.length}</span>
                    <p className="text-[10px] text-muted-foreground">Transfers</p>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", rec.bg)}>
                    <RecIcon className={cn("h-3.5 w-3.5", rec.text)} />
                    <span className={cn("text-xs font-semibold", rec.text)}>{rec.label}</span>
                  </div>

                  {hourlyLoss > 100000 && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <Timer className="h-3 w-3" />
                      <span>~–{formatCurrency(hourlyLoss)}đ/giờ</span>
                    </div>
                  )}

                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 group-hover:bg-primary/10 group-hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); setSelectedFC(group); }}
                  >
                    <span className="text-xs mr-1">Chi tiết</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RebalanceDetailSheet
        open={!!selectedFC}
        onOpenChange={(open) => !open && setSelectedFC(null)}
        fcGroup={selectedFC}
        onApprove={onApprove}
        onReject={onReject}
      />
    </>
  );
}
