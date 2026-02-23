import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, FileSpreadsheet, ChevronRight, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { StoreMap, getTierStyle } from '@/lib/inventory-store-map';
import { exportRebalanceToExcel } from '@/lib/inventory-export';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface StoreGroup {
  storeId: string;
  storeName: string;
  tier: string;
  region: string;
  totalQty: number;
  fcCount: number;
  highestPriority: string;
  totalRevenue: number;
  reasonSummary: string;
  suggestions: RebalanceSuggestion[];
}

interface Props {
  suggestions: RebalanceSuggestion[];
  storeMap: StoreMap;
  fcNameMap: Record<string, string>;
  onApprove: (ids: string[], editedQty?: Record<string, number>) => void;
  onReject: (ids: string[]) => void;
}

const PRIORITY_ORDER: Record<string, number> = { P1: 1, high: 1, P2: 2, medium: 2, P3: 3, low: 3 };
const PRIORITY_LABELS: Record<string, string> = { P1: 'P1', high: 'P1', P2: 'P2', medium: 'P2', P3: 'P3', low: 'P3' };

function normalizePriority(p: string): string {
  return PRIORITY_LABELS[p] || 'P3';
}

function priorityRank(p: string): number {
  return PRIORITY_ORDER[p] ?? 3;
}

function summarizeReasons(suggestions: RebalanceSuggestion[]): string {
  const counts: Record<string, number> = {};
  for (const s of suggestions) {
    const reason = s.reason || '';
    let key = 'Khác';
    if (/stockout|hết hàng/i.test(reason)) key = 'Stockout risk';
    else if (/velocity|tốc độ bán/i.test(reason)) key = 'Velocity cao';
    else if (/weeks.?cover|tuần tồn/i.test(reason)) key = 'Weeks cover thấp';
    else if (/V1|phủ nền|BST/i.test(reason)) key = 'Phủ nền BST';
    else if (/V2|nhu cầu/i.test(reason)) key = 'Bổ sung theo nhu cầu';
    else if (/lateral|cân bằng/i.test(reason)) key = 'Cân bằng giữa kho';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');
}

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('vi-VN');
}

const PRIORITY_BADGE_STYLES: Record<string, string> = {
  P1: 'bg-red-500/15 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  P3: 'bg-muted text-muted-foreground border-border',
};

export function DailyTransferOrder({ suggestions, storeMap, fcNameMap, onApprove, onReject }: Props) {
  const [priorityFilter, setPriorityFilter] = useState<string>('P1');

  // Group by destination store
  const storeGroups = useMemo((): StoreGroup[] => {
    const map = new Map<string, RebalanceSuggestion[]>();
    for (const s of suggestions) {
      if (s.status !== 'pending') continue;
      const key = s.to_location || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const groups: StoreGroup[] = [];
    for (const [storeId, items] of map) {
      const meta = storeMap[storeId];
      const highestPriority = items.reduce((best, s) => priorityRank(s.priority) < priorityRank(best) ? s.priority : best, 'low');
      groups.push({
        storeId,
        storeName: items[0]?.to_location_name || meta?.region || storeId,
        tier: meta?.tier || '',
        region: meta?.region || '',
        totalQty: items.reduce((sum, s) => sum + s.qty, 0),
        fcCount: new Set(items.map(s => s.fc_id)).size,
        highestPriority,
        totalRevenue: items.reduce((sum, s) => sum + s.potential_revenue_gain, 0),
        reasonSummary: summarizeReasons(items),
        suggestions: items,
      });
    }

    return groups.sort((a, b) => priorityRank(a.highestPriority) - priorityRank(b.highestPriority) || b.totalRevenue - a.totalRevenue);
  }, [suggestions, storeMap]);

  // Priority counts
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { P1: 0, P2: 0, P3: 0 };
    for (const g of storeGroups) {
      const p = normalizePriority(g.highestPriority);
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [storeGroups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (priorityFilter === 'all') return storeGroups;
    return storeGroups.filter(g => normalizePriority(g.highestPriority) === priorityFilter);
  }, [storeGroups, priorityFilter]);

  // Totals
  const totalUnits = storeGroups.reduce((s, g) => s + g.totalQty, 0);
  const totalRevenue = storeGroups.reduce((s, g) => s + g.totalRevenue, 0);
  const totalStores = storeGroups.length;

  // Actions
  const handleApproveP1 = () => {
    const p1Ids = storeGroups
      .filter(g => normalizePriority(g.highestPriority) === 'P1')
      .flatMap(g => g.suggestions.map(s => s.id));
    if (p1Ids.length > 0) onApprove(p1Ids);
  };

  const handleExportExcel = () => {
    const toExport = filteredGroups.flatMap(g => g.suggestions);
    exportRebalanceToExcel(toExport);
  };

  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (storeGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Package className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Không có đề xuất điều chuyển</p>
        <p className="text-sm">Chạy Engine để tạo đề xuất phân bổ mới</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">LỆNH ĐIỀU CHUYỂN — {today}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tổng: <span className="font-semibold text-foreground">{formatNumber(totalUnits)}</span> units
              {' · '}<span className="font-semibold text-foreground">{totalStores}</span> cửa hàng
              {' · '}+<span className="font-semibold text-emerald-400">{formatNumber(totalRevenue)}</span> revenue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApproveP1} disabled={priorityCounts.P1 === 0} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Duyệt tất cả P1
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Priority filter buttons */}
        <div className="flex items-center gap-2">
          {(['P1', 'P2', 'P3', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                priorityFilter === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : p === 'all'
                    ? 'bg-muted text-muted-foreground border-border hover:bg-accent'
                    : `${PRIORITY_BADGE_STYLES[p]} hover:opacity-80`
              }`}
            >
              {p === 'all' ? `Tất cả (${totalStores})` : `${p}: ${priorityCounts[p] || 0}`}
            </button>
          ))}
        </div>
      </div>

      {/* Store List */}
      <Accordion type="multiple" className="space-y-2">
        {filteredGroups.map(group => {
          const pLabel = normalizePriority(group.highestPriority);
          const tierStyle = getTierStyle(group.tier);
          return (
            <AccordionItem key={group.storeId} value={group.storeId} className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50">
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  {/* Priority badge */}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_BADGE_STYLES[pLabel]}`}>
                    {pLabel}
                  </span>

                  {/* Store name + tier */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{group.storeName}</span>
                    {group.tier && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                        {group.tier.toUpperCase()}
                      </span>
                    )}
                    {group.region && (
                      <span className="text-xs text-muted-foreground">{group.region}</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 ml-auto mr-4 text-xs text-muted-foreground whitespace-nowrap">
                    <span className="font-mono font-semibold text-foreground">{group.totalQty} units</span>
                    <span>{group.fcCount} SP</span>
                    <span className="text-emerald-400">+{formatNumber(group.totalRevenue)}</span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                {/* Reason summary */}
                <div className="px-4 py-2 bg-primary/5 border-t border-b text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{group.reasonSummary}</span>
                </div>

                {/* Detail table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left px-4 py-2 font-medium">Sản phẩm</th>
                        <th className="text-left px-3 py-2 font-medium">Từ</th>
                        <th className="text-right px-3 py-2 font-medium">SL</th>
                        <th className="text-right px-3 py-2 font-medium">Revenue</th>
                        <th className="text-left px-3 py-2 font-medium">Lý do</th>
                        <th className="text-center px-3 py-2 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.suggestions.map(s => (
                        <tr key={s.id} className="border-b last:border-b-0 hover:bg-accent/30">
                          <td className="px-4 py-2">
                            <div className="font-medium text-foreground">{fcNameMap[s.fc_id] || s.fc_name || s.fc_id}</div>
                            {(s as any).size_breakdown && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {((s as any).size_breakdown as any[]).map((sz: any, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                                    {sz.size}×{sz.qty}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {s.transfer_type === 'lateral' ? (
                                <ArrowRightLeft className="h-3 w-3" />
                              ) : (
                                <Package className="h-3 w-3" />
                              )}
                              <span className="truncate max-w-[120px]">{s.from_location_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">{s.qty}</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-mono">+{formatNumber(s.potential_revenue_gain)}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{s.reason}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={(e) => { e.stopPropagation(); onApprove([s.id]); }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={(e) => { e.stopPropagation(); onReject([s.id]); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Group actions */}
                <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {group.suggestions.length} đề xuất · {group.totalQty} units
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-red-400 hover:text-red-300"
                      onClick={() => onReject(group.suggestions.map(s => s.id))}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Từ chối nhóm
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onApprove(group.suggestions.map(s => s.id))}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Duyệt nhóm
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {filteredGroups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Không có cửa hàng nào ở mức {priorityFilter}
        </div>
      )}
    </div>
  );
}
