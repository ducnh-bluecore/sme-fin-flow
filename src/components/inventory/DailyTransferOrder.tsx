import { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, FileSpreadsheet, ChevronRight, ChevronDown, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';
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

export interface StoreInfo {
  id: string;
  store_name: string;
  total_on_hand: number;
  capacity: number;
  total_sold: number;
}

interface Props {
  suggestions: RebalanceSuggestion[];
  storeMap: StoreMap;
  fcNameMap: Record<string, string>;
  stores?: StoreInfo[];
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

export function DailyTransferOrder({ suggestions, storeMap, fcNameMap, stores = [], onApprove, onReject }: Props) {
  const [priorityFilter, setPriorityFilter] = useState<string>('P1');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editedQty, setEditedQty] = useState<Record<string, number>>({});

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleQtyChange = useCallback((id: string, qty: number) => {
    setEditedQty(prev => ({ ...prev, [id]: qty }));
  }, []);

  const getDisplayQty = useCallback((s: RebalanceSuggestion) => {
    return editedQty[s.id] ?? s.qty;
  }, [editedQty]);

  // Build store info map for capacity checks
  const storeInfoMap = useMemo(() => {
    const map = new Map<string, StoreInfo>();
    for (const s of stores) {
      map.set(s.id, s);
    }
    return map;
  }, [stores]);

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
        totalQty: items.reduce((sum, s) => sum + (editedQty[s.id] ?? s.qty), 0),
        fcCount: new Set(items.map(s => s.fc_id)).size,
        highestPriority,
        totalRevenue: items.reduce((sum, s) => sum + s.potential_revenue_gain, 0),
        reasonSummary: summarizeReasons(items),
        suggestions: items,
      });
    }

    return groups.sort((a, b) => priorityRank(a.highestPriority) - priorityRank(b.highestPriority) || b.totalRevenue - a.totalRevenue);
  }, [suggestions, storeMap, editedQty]);

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
    if (p1Ids.length > 0) onApprove(p1Ids, editedQty);
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
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_BADGE_STYLES[pLabel]}`}>
                    {pLabel}
                  </span>
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
                  <span className="text-xs text-muted-foreground truncate max-w-[280px] hidden md:inline">
                    {group.reasonSummary}
                  </span>
                  <div className="flex items-center gap-3 ml-auto mr-4 text-xs text-muted-foreground whitespace-nowrap">
                    <span className="font-mono font-semibold text-foreground">{group.totalQty} units</span>
                    <span>{group.fcCount} SP</span>
                    <span className="text-emerald-400">+{formatNumber(group.totalRevenue)}</span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                {/* Store Summary Card */}
                {(() => {
                  const totalLogistics = group.suggestions.reduce((s, x) => s + (x.logistics_cost_estimate || 0), 0);
                  const totalNet = group.suggestions.reduce((s, x) => s + (x.net_benefit || 0), 0);
                  const sourceSet = new Set(group.suggestions.map(x => x.from_location_name));
                  const pCounts: Record<string, number> = {};
                  group.suggestions.forEach(x => {
                    const p = normalizePriority(x.priority);
                    pCounts[p] = (pCounts[p] || 0) + 1;
                  });
                  const avgFromCover = group.suggestions.reduce((s, x) => s + (x.from_weeks_cover || 0), 0) / (group.suggestions.length || 1);
                  const avgToCover = group.suggestions.reduce((s, x) => s + (x.to_weeks_cover || 0), 0) / (group.suggestions.length || 1);

                  return (
                    <div className="px-5 py-4 bg-muted/20 border-t border-b space-y-3">
                      {/* Store metrics bar */}
                      {(() => {
                        const info = storeInfoMap.get(group.storeId);
                        if (!info) return null;
                        const currentStock = info.total_on_hand;
                        const cap = info.capacity || 0;
                        const afterTransfer = currentStock + group.totalQty;
                        const utilBefore = cap > 0 ? (currentStock / cap) * 100 : 0;
                        const utilAfter = cap > 0 ? (afterTransfer / cap) * 100 : 0;
                        const isOverCapacity = utilAfter > 100;
                        const isWarning = utilAfter > 85 && utilAfter <= 100;
                        const avgPrice = 350000;
                        const inventoryValue = currentStock * avgPrice;

                        return (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 p-3 rounded-md bg-card border border-border/50">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Tồn kho</span>
                              <p className="font-bold text-foreground">{currentStock.toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Giá trị tồn</span>
                              <p className="font-bold text-foreground">{formatNumber(inventoryValue)}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sức chứa</span>
                              <p className="font-bold text-foreground">{cap > 0 ? `${cap.toLocaleString('vi-VN')} (${utilBefore.toFixed(0)}%)` : 'N/A'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Đã bán</span>
                              <p className="font-bold text-foreground">{(info.total_sold || 0).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sau nhận hàng</span>
                              <p className={`font-bold ${isOverCapacity ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {afterTransfer.toLocaleString('vi-VN')} 
                                {cap > 0 && (
                                  <span className="text-xs font-normal ml-1">
                                    ({utilAfter.toFixed(0)}%)
                                    {isOverCapacity && ' ⚠️ VƯỢT'}
                                    {isWarning && ' ⚠️ GẦN ĐẦY'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Tổng units</span>
                          <p className="font-bold text-foreground text-lg">{group.totalQty.toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Nguồn cung</span>
                          <p className="font-bold text-foreground text-lg">{sourceSet.size} <span className="text-sm font-normal text-muted-foreground">kho/CH</span></p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Doanh thu tiềm năng</span>
                          <p className="font-bold text-emerald-400 text-lg">+{formatNumber(group.totalRevenue)}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Net benefit</span>
                          <p className={`font-bold text-lg ${totalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalNet >= 0 ? '+' : ''}{formatNumber(totalNet)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          {group.reasonSummary}
                        </span>
                        <span>Logistics: {formatNumber(totalLogistics)}</span>
                        <span>Weeks cover: {avgToCover.toFixed(1)}w → {((avgFromCover + avgToCover) / 2).toFixed(1)}w</span>
                        {Object.entries(pCounts).map(([p, c]) => (
                          <Badge key={p} variant="outline" className={`text-[11px] ${PRIORITY_BADGE_STYLES[p]}`}>{p}: {c}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Detail table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left px-4 py-2 font-medium w-6"></th>
                        <th className="text-left px-2 py-2 font-medium">Sản phẩm</th>
                        <th className="text-left px-3 py-2 font-medium">Từ</th>
                        <th className="text-right px-3 py-2 font-medium">SL</th>
                        <th className="text-right px-3 py-2 font-medium">Revenue</th>
                        <th className="text-left px-3 py-2 font-medium">Lý do</th>
                        <th className="text-center px-3 py-2 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.suggestions.map(s => {
                        const isExpanded = expandedRows.has(s.id);
                        const cc = (s as any).constraint_checks || {};
                        const sizeBreakdown = (s as any).size_breakdown as any[] | null;
                        const isEdited = s.id in editedQty && editedQty[s.id] !== s.qty;

                        return (
                          <>
                            <tr key={s.id} className={`border-b last:border-b-0 hover:bg-accent/30 cursor-pointer ${isExpanded ? 'bg-accent/20' : ''}`} onClick={() => toggleRow(s.id)}>
                              <td className="px-4 py-2 text-muted-foreground">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-medium text-foreground">{fcNameMap[s.fc_id] || s.fc_name || s.fc_id}</div>
                                {sizeBreakdown && sizeBreakdown.length > 0 && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {(() => {
                                      const agg: Record<string, number> = {};
                                      for (const sz of sizeBreakdown) {
                                        agg[sz.size] = (agg[sz.size] || 0) + (sz.qty || 1);
                                      }
                                      return Object.entries(agg).map(([size, qty]) => (
                                        <span key={size} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                                          {size}×{qty}
                                        </span>
                                      ));
                                    })()}
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
                              <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={getDisplayQty(s)}
                                    onChange={e => handleQtyChange(s.id, parseInt(e.target.value) || 0)}
                                    className="w-16 h-7 text-right font-mono font-semibold text-sm px-1.5"
                                  />
                                  {isEdited && (
                                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] px-1">
                                      Đã chỉnh
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-emerald-400 font-mono">+{formatNumber(s.potential_revenue_gain)}</td>
                              <td className="px-3 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{s.reason}</td>
                              <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                    onClick={() => onApprove([s.id], editedQty)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    onClick={() => onReject([s.id])}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded detail row */}
                            {isExpanded && (
                              <tr key={`${s.id}-detail`} className="bg-muted/10">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="space-y-3">
                                    {/* Key metrics grid */}
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Kho nguồn</span>
                                        <p className="font-semibold text-foreground">{cc.source_on_hand ?? cc.cw_available_before ?? '—'} units</p>
                                        <p className="text-muted-foreground">
                                          {(() => {
                                            const src = cc.source_on_hand ?? cc.cw_available_before;
                                            if (src == null) return '';
                                            const remaining = src - getDisplayQty(s);
                                            return remaining >= 0 ? `Còn ${remaining} sau chuyển` : `Thiếu ${Math.abs(remaining)} sau chuyển`;
                                          })()}
                                        </p>
                                      </div>
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Kho đích</span>
                                        <p className="font-semibold text-foreground">{cc.dest_on_hand ?? cc.current_stock ?? '—'} units</p>
                                        <p className="text-muted-foreground">Sau nhận: {(cc.dest_on_hand ?? cc.current_stock ?? 0) + getDisplayQty(s)}</p>
                                      </div>
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Tốc độ bán</span>
                                        <p className="font-semibold text-foreground">{((s as any).sales_velocity || (s as any).balanced_weeks_cover || 0).toFixed(2)} u/ngày</p>
                                      </div>
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Đã bán 7 ngày</span>
                                        <p className="font-semibold text-foreground">{cc.sold_7d ?? '—'} units</p>
                                      </div>
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Revenue DK</span>
                                        <p className="font-semibold text-emerald-400">+{formatNumber(s.potential_revenue_gain)}</p>
                                      </div>
                                      <div className="p-2 rounded bg-card border border-border/50 space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase">Net Benefit</span>
                                        <p className={`font-semibold ${s.net_benefit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {s.net_benefit >= 0 ? '+' : ''}{formatNumber(s.net_benefit)}
                                        </p>
                                        <p className="text-muted-foreground">VC: {formatNumber(s.logistics_cost_estimate)}</p>
                                      </div>
                                    </div>

                                    {/* Size breakdown table */}
                                    {sizeBreakdown && sizeBreakdown.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Chi tiết theo Size</h4>
                                        <div className="overflow-x-auto border rounded-md">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="border-b bg-muted/30">
                                                <th className="text-left px-3 py-1.5 font-medium">Size</th>
                                                <th className="text-right px-3 py-1.5 font-medium">SL</th>
                                                <th className="text-right px-3 py-1.5 font-medium">Nguồn tồn</th>
                                                <th className="text-right px-3 py-1.5 font-medium">Đích tồn</th>
                                                <th className="text-right px-3 py-1.5 font-medium">Velocity</th>
                                                <th className="text-right px-3 py-1.5 font-medium">Net Benefit</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {sizeBreakdown.map((sz: any, idx: number) => (
                                                <tr key={idx} className="border-b last:border-b-0 hover:bg-accent/20">
                                                  <td className="px-3 py-1.5 font-mono font-semibold">{sz.size || sz.size_code || '—'}</td>
                                                  <td className="px-3 py-1.5 text-right font-mono font-semibold">{sz.qty || 0}</td>
                                                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                                                    {sz.source_on_hand ?? '—'}
                                                    {sz.source_on_hand != null && <span className="text-[10px] ml-1">(còn {(sz.source_on_hand || 0) - (sz.qty || 0)})</span>}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                                                    {sz.dest_on_hand ?? '—'}
                                                    {sz.dest_on_hand != null && <span className="text-[10px] ml-1">(+{sz.qty || 0}→{(sz.dest_on_hand || 0) + (sz.qty || 0)})</span>}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                                                    {sz.dest_velocity != null ? `${sz.dest_velocity.toFixed(2)}u/d` : '—'}
                                                  </td>
                                                  <td className="px-3 py-1.5 text-right">
                                                    <span className={`font-mono ${(sz.net_benefit || sz.estimated_revenue_gain || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                      {formatNumber(sz.net_benefit || sz.estimated_revenue_gain || 0)}
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {(!sizeBreakdown || sizeBreakdown.length === 0) && (
                                      <p className="text-xs text-muted-foreground italic">Chưa có dữ liệu size — chạy "Tách theo Size" hoặc chạy lại Engine.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Group actions */}
                <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {group.suggestions.length} đề xuất · {group.totalQty} units
                    {Object.keys(editedQty).length > 0 && (
                      <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                        {Object.keys(editedQty).filter(id => group.suggestions.some(s => s.id === id)).length} đã chỉnh sửa
                      </Badge>
                    )}
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
                      onClick={() => onApprove(group.suggestions.map(s => s.id), editedQty)}
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
