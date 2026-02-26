import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, FileSpreadsheet, Package, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { StoreMap, getTierStyle } from '@/lib/inventory-store-map';
import { exportRebalanceToExcel } from '@/lib/inventory-export';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

interface StoreRecallGroup {
  storeId: string;
  storeName: string;
  tier: string;
  region: string;
  totalQty: number;
  fcCount: number;
  totalValue: number;
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

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('vi-VN');
}

function summarizeRecallReasons(suggestions: RebalanceSuggestion[]): string {
  const counts: Record<string, number> = {};
  for (const s of suggestions) {
    const reason = s.reason || '';
    let key = 'Khác';
    if (/DOC|days.?of.?cover|ngày tồn/i.test(reason)) key = 'DOC cao';
    else if (/velocity|tốc độ bán/i.test(reason)) key = 'Velocity thấp';
    else if (/season|mùa|hết mùa/i.test(reason)) key = 'Hết mùa';
    else if (/WOC|weeks.?cover|tuần tồn/i.test(reason)) key = 'WOC cao';
    else if (/dead.?stock|hàng chết/i.test(reason)) key = 'Dead stock';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');
}

export function RecallOrderPanel({ suggestions, storeMap, fcNameMap, onApprove, onReject }: Props) {
  const recallSuggestions = useMemo(() => suggestions.filter(s => s.transfer_type === 'recall' && s.status === 'pending'), [suggestions]);

  // Group by source store (from_location)
  const storeGroups = useMemo((): StoreRecallGroup[] => {
    const map = new Map<string, RebalanceSuggestion[]>();
    for (const s of recallSuggestions) {
      const key = s.from_location || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const groups: StoreRecallGroup[] = [];
    for (const [storeId, items] of map) {
      const meta = storeMap[storeId];
      const avgPrice = 350000;
      groups.push({
        storeId,
        storeName: items[0]?.from_location_name || meta?.region || storeId,
        tier: meta?.tier || '',
        region: meta?.region || '',
        totalQty: items.reduce((sum, s) => sum + s.qty, 0),
        fcCount: new Set(items.map(s => s.fc_id)).size,
        totalValue: items.reduce((sum, s) => sum + s.qty * avgPrice, 0),
        reasonSummary: summarizeRecallReasons(items),
        suggestions: items,
      });
    }

    return groups.sort((a, b) => b.totalValue - a.totalValue);
  }, [recallSuggestions, storeMap]);

  const totalUnits = storeGroups.reduce((s, g) => s + g.totalQty, 0);
  const totalValue = storeGroups.reduce((s, g) => s + g.totalValue, 0);

  const handleApproveAll = () => {
    const allIds = recallSuggestions.map(s => s.id);
    if (allIds.length > 0) onApprove(allIds);
  };

  const handleExportExcel = () => {
    exportRebalanceToExcel(recallSuggestions);
  };

  if (recallSuggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <RotateCcw className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Không có đề xuất thu hồi</p>
        <p className="text-sm">Chạy Engine Thu hồi để phát hiện hàng cần thu về kho tổng</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              ĐỀ XUẤT THU HỒI HÀNG HÓA
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tổng: <span className="font-semibold text-foreground">{formatNumber(totalUnits)}</span> units
              {' · '}<span className="font-semibold text-foreground">{storeGroups.length}</span> cửa hàng
              {' · '}Giá trị: <span className="font-semibold text-amber-400">{formatNumber(totalValue)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApproveAll} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Duyệt tất cả
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Store list */}
      <Accordion type="multiple" className="space-y-2">
        {storeGroups.map(group => {
          const tierStyle = getTierStyle(group.tier);
          return (
            <AccordionItem key={group.storeId} value={group.storeId} className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50">
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{group.storeName}</span>
                    {group.tier && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                        {group.tier.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[280px] hidden md:inline">
                    {group.reasonSummary}
                  </span>
                  <div className="flex items-center gap-3 ml-auto mr-4 text-xs text-muted-foreground whitespace-nowrap">
                    <span className="font-mono font-semibold text-foreground">{group.totalQty} units</span>
                    <span>{group.fcCount} SP</span>
                    <span className="text-amber-400">{formatNumber(group.totalValue)}</span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                {/* Detail table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-t">
                        <th className="text-left px-4 py-2 font-medium">Sản phẩm</th>
                        <th className="text-right px-3 py-2 font-medium">SL thu hồi</th>
                        <th className="text-right px-3 py-2 font-medium">WOC hiện tại</th>
                        <th className="text-left px-3 py-2 font-medium">Lý do</th>
                        <th className="text-right px-3 py-2 font-medium">Giá trị</th>
                        <th className="text-center px-3 py-2 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.suggestions.map(s => {
                        const avgPrice = 350000;
                        const value = s.qty * avgPrice;
                        const wocDisplay = (s.from_weeks_cover || 0) >= 999 ? '∞' : `${(s.from_weeks_cover || 0).toFixed(1)}w`;
                        return (
                          <tr key={s.id} className="border-b last:border-b-0 hover:bg-accent/30">
                            <td className="px-4 py-2">
                              <div className="font-medium text-foreground">{fcNameMap[s.fc_id] || s.fc_name || s.fc_id}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">{s.qty}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-mono ${(s.from_weeks_cover || 0) > 12 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {wocDisplay}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="max-w-[320px]" title={s.reason}>{s.reason}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-amber-400 font-mono">{formatNumber(value)}</td>
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
                        );
                      })}
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
    </div>
  );
}
