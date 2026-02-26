import React, { useState, useCallback, useMemo } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronRight, Store, CheckCircle2, XCircle, FileDown, Package, TrendingUp, Truck, DollarSign, Info } from 'lucide-react';
import { useDestinationSizeInventory } from '@/hooks/inventory/useDestinationSizeInventory';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Tabs removed — unified view
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApproveTransfer } from '@/hooks/inventory/useApproveTransfer';
import { exportSizeTransferToExcel, type SizeTransferRow } from '@/lib/inventory-export';
import { formatVNDCompact } from '@/lib/formatters';

interface TransferGroup {
  dest_store_id: string;
  transfer_count: number;
  total_qty: number;
  unique_products: number;
  total_net_benefit: number;
}

interface Props {
  transferByDest: TransferGroup[];
  detailRows: Map<string, any[]>;
  storeNames?: Map<string, string>;
  fcNames?: Map<string, string>;
  totalOpportunities: number;
}

const reasonTranslations: Record<string, string> = {
  stockout: 'Kho đích đã hết hàng size này',
  same_region: 'Cùng khu vực, chi phí vận chuyển thấp',
  cross_region: 'Khác khu vực, ưu tiên vì net benefit cao',
  core_size: 'Size core (bán chạy), cần bổ sung gấp',
  low_stock: 'Kho đích sắp hết hàng',
  excess_source: 'Kho nguồn dư nhiều hàng',
  high_velocity: 'Tốc độ bán tại đích cao',
  broken_size: 'Lẻ size, cần bổ sung để hoàn thiện size run',
};

function translateReason(reason: string): string[] {
  if (!reason) return [];
  const tags = reason.split(/[\s+,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
  return tags.map(tag => reasonTranslations[tag] || tag);
}

type PurposeKey = 'broken_size' | 'stockout' | 'high_velocity' | 'rebalance';

function getPurposeKey(reason: string): PurposeKey {
  const r = (reason || '').toLowerCase();
  if (r.includes('core_size') || r.includes('broken_size')) return 'broken_size';
  if (r.includes('stockout')) return 'stockout';
  if (r.includes('high_velocity')) return 'high_velocity';
  return 'rebalance';
}

function getPurposeBadge(reason: string): { label: string; className: string } {
  const key = getPurposeKey(reason);
  const config = PURPOSE_CONFIG[key];
  return { label: config.label, className: config.className };
}

const PURPOSE_CONFIG: Record<PurposeKey, { label: string; icon: string; className: string }> = {
  broken_size: { label: 'Lẻ size', icon: '🟣', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  stockout: { label: 'Hết hàng', icon: '🔴', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high_velocity: { label: 'Bán nhanh', icon: '🟠', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  rebalance: { label: 'Cân bằng kho', icon: '🔵', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const PURPOSE_ORDER: PurposeKey[] = ['broken_size', 'stockout', 'high_velocity', 'rebalance'];

export default function TransferSuggestionsCard({ transferByDest, detailRows, storeNames, fcNames, totalOpportunities }: Props) {
  const [expandedDest, setExpandedDest] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedQty, setEditedQty] = useState<Record<string, number>>({});
  const [confirmAction, setConfirmAction] = useState<{ action: 'approved' | 'rejected'; ids: string[]; destId?: string } | null>(null);
  const approveTransfer = useApproveTransfer();

  // Unified groups — all purposes merged, each row keeps its purpose badge
  const { unifiedGroups, unifiedDetailRows, purposeCounts } = useMemo(() => {
    const groups: TransferGroup[] = [];
    const unified = new Map<string, any[]>();
    const counts: Record<PurposeKey, { count: number; benefit: number }> = {
      broken_size: { count: 0, benefit: 0 },
      stockout: { count: 0, benefit: 0 },
      high_velocity: { count: 0, benefit: 0 },
      rebalance: { count: 0, benefit: 0 },
    };

    // Merge all detail rows by dest, regardless of purpose
    for (const [destId, rows] of detailRows) {
      if (!unified.has(destId)) unified.set(destId, []);
      unified.get(destId)!.push(...rows);
      for (const row of rows) {
        const pk = getPurposeKey(row.reason);
        counts[pk].count++;
        counts[pk].benefit += row.net_benefit || 0;
      }
    }

    // Build groups per dest
    for (const [destId, rows] of unified) {
      const totalQty = rows.reduce((s: number, r: any) => s + (r.transfer_qty || 0), 0);
      const totalBenefit = rows.reduce((s: number, r: any) => s + (r.net_benefit || 0), 0);
      const uniqueProducts = new Set(rows.map((r: any) => r.product_id)).size;
      groups.push({
        dest_store_id: destId,
        transfer_count: rows.length,
        total_qty: totalQty,
        unique_products: uniqueProducts,
        total_net_benefit: totalBenefit,
      });
    }

    // Include groups with no detail rows
    for (const group of transferByDest) {
      if (!unified.has(group.dest_store_id)) {
        groups.push(group);
      }
    }

    // Sort by net benefit desc
    groups.sort((a, b) => (b.total_net_benefit || 0) - (a.total_net_benefit || 0));

    return { unifiedGroups: groups, unifiedDetailRows: unified, purposeCounts: counts };
  }, [transferByDest, detailRows]);

  // Build lookups for destination size inventory — only for the expanded row
  const sizeLookups = useMemo(() => {
    if (!expandedRowId) return [];
    // Find the expanded row's product_id and dest_store_id
    for (const [destId, rows] of detailRows) {
      const row = rows.find((r: any) => r.id === expandedRowId);
      if (row) {
        return [{ product_id: row.product_id, dest_store_id: destId }];
      }
    }
    return [];
  }, [expandedRowId, detailRows]);

  const { data: destSizeMap } = useDestinationSizeInventory(sizeLookups);

  const toggleDest = (destId: string) => {
    setExpandedDest(prev => {
      const next = new Set(prev);
      next.has(destId) ? next.delete(destId) : next.add(destId);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getTransferRows = (ids: string[]): SizeTransferRow[] => {
    const rows: SizeTransferRow[] = [];
    for (const [, items] of detailRows) {
      for (const t of items) {
        if (ids.includes(t.id)) {
          rows.push({
            id: t.id,
            product_id: t.product_id,
            product_name: fcNames?.get(t.product_id),
            size_code: t.size_code,
            source_store_id: t.source_store_id,
            source_store_name: storeNames?.get(t.source_store_id),
            dest_store_id: t.dest_store_id,
            dest_store_name: storeNames?.get(t.dest_store_id),
            transfer_qty: editedQty[t.id] ?? t.transfer_qty,
            net_benefit: t.net_benefit,
            reason: t.reason,
            status: t.status,
          });
        }
      }
    }
    return rows;
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { action, ids } = confirmAction;
    await approveTransfer.mutateAsync({ transferIds: ids, action });
    if (action === 'approved') {
      const rows = getTransferRows(ids);
      exportSizeTransferToExcel(rows);
    }
    setSelectedIds(new Set());
    setConfirmAction(null);
  };

  const getAllPendingIds = (): string[] => {
    const ids: string[] = [];
    for (const [, items] of detailRows) {
      for (const t of items) {
        if (t.status !== 'approved' && t.status !== 'rejected') ids.push(t.id);
      }
    }
    return ids;
  };

  const confirmSummary = confirmAction ? (() => {
    const rows = getTransferRows(confirmAction.ids);
    const totalQty = rows.reduce((s, r) => s + r.transfer_qty, 0);
    const totalBenefit = rows.reduce((s, r) => s + r.net_benefit, 0);
    return { count: rows.length, totalQty, totalBenefit };
  })() : null;

  const renderDestGroup = (group: TransferGroup, rows: any[]) => {
    const destName = storeNames?.get(group.dest_store_id) || group.dest_store_id?.slice(0, 12);
    const isOpen = expandedDest.has(group.dest_store_id);
    const pendingIds = rows.filter((t: any) => t.status !== 'approved' && t.status !== 'rejected').map((t: any) => t.id);

    return (
      <Collapsible key={group.dest_store_id} open={isOpen} onOpenChange={() => toggleDest(group.dest_store_id)}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger className="flex-1">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <Store className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{destName}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground"><strong>{group.transfer_count}</strong> chuyển</span>
                <span className="text-muted-foreground"><strong>{group.total_qty?.toLocaleString()}</strong> đơn vị</span>
                <span className="text-muted-foreground">{group.unique_products} mẫu</span>
                <span className="font-semibold text-emerald-600">+{formatVNDCompact(group.total_net_benefit || 0)}</span>
              </div>
            </div>
          </CollapsibleTrigger>
          {pendingIds.length > 0 && (
            <Button size="sm" variant="outline" className="shrink-0" onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: 'approved', ids: pendingIds, destId: group.dest_store_id }); }}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Duyệt & Xuất
            </Button>
          )}
        </div>
        <CollapsibleContent>
          {rows.length > 0 ? (
            <div className="ml-7 mt-1 border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><span className="sr-only">Chọn</span></TableHead>
                    <TableHead className="text-xs">Mẫu SP</TableHead>
                    <TableHead className="text-xs">Size</TableHead>
                    <TableHead className="text-xs">Từ Kho</TableHead>
                    <TableHead className="text-xs text-center">SL</TableHead>
                    <TableHead className="text-xs text-right">Lợi Ích Ròng</TableHead>
                    <TableHead className="text-xs">Mục đích</TableHead>
                    <TableHead className="text-xs text-center">Trạng Thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t: any) => {
                    const name = fcNames?.get(t.product_id) || (t.product_id?.slice(0, 8) + '…');
                    const srcName = storeNames?.get(t.source_store_id) || t.source_store_id?.slice(0, 8);
                    const isApproved = t.status === 'approved';
                    const isRejected = t.status === 'rejected';
                    const isPending = !isApproved && !isRejected;
                    const isExpanded = expandedRowId === t.id;
                    return (
                      <React.Fragment key={t.id}>
                        <TableRow
                          className={`cursor-pointer ${isExpanded ? 'border-l-2 border-l-primary bg-muted/30' : ''} ${isApproved ? 'bg-emerald-500/5' : isRejected ? 'opacity-50' : ''}`}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('input, button, [role="checkbox"]')) return;
                            setExpandedRowId(prev => prev === t.id ? null : t.id);
                          }}
                        >
                          <TableCell className="w-8">
                            {isPending && (
                              <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium max-w-[160px] truncate">{name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{t.size_code}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{srcName}</TableCell>
                          <TableCell className="text-center">
                            {isPending ? (
                              <Input
                                type="number"
                                min={1}
                                className="w-16 h-7 text-center text-sm font-semibold mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={editedQty[t.id] ?? t.transfer_qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0) setEditedQty(prev => ({ ...prev, [t.id]: val }));
                                }}
                              />
                            ) : (
                              <span className="font-semibold text-sm">{t.transfer_qty}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-emerald-600">{formatVNDCompact(t.net_benefit)}</TableCell>
                          <TableCell>
                            {(() => {
                              const purpose = getPurposeBadge(t.reason);
                              return <Badge variant="outline" className={`text-[10px] font-medium border ${purpose.className}`}>{purpose.label}</Badge>;
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            {isApproved && <Badge className="text-[10px] bg-emerald-600">Đã duyệt</Badge>}
                            {isRejected && <Badge variant="secondary" className="text-[10px]">Từ chối</Badge>}
                            {isPending && (
                              <div className="flex items-center justify-center gap-1">
                                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setConfirmAction({ action: 'approved', ids: [t.id] })}>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setConfirmAction({ action: 'rejected', ids: [t.id] })}>
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/40 border-t border-dashed border-l-2 border-l-primary">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div className="flex items-start gap-2">
                                  <Package className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Kho nguồn</p>
                                    <p className="font-semibold">{t.source_on_hand ?? '—'} units</p>
                                    <p className="text-muted-foreground text-[10px]">
                                      {(() => {
                                        const remaining = (t.source_on_hand ?? 0) - (editedQty[t.id] ?? t.transfer_qty);
                                        return remaining > 0 ? `Còn lại ${remaining} units sau chuyển` : 'Vừa đủ chuyển';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Package className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Kho đích</p>
                                    <p className="font-semibold">{t.dest_on_hand ?? '—'} units</p>
                                    <p className="text-muted-foreground text-[10px]">{(t.dest_on_hand ?? 0) === 0 ? 'Hết hàng — stockout' : `Còn ${t.dest_on_hand} units`}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <TrendingUp className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Tốc độ bán đích</p>
                                    <p className="font-semibold">{t.dest_velocity ?? '—'} units/ngày</p>
                                    <p className="text-muted-foreground text-[10px]">
                                      {t.dest_velocity > 0 && t.dest_on_hand != null
                                        ? `Hết hàng trong ~${Math.ceil((t.dest_on_hand || 0) / t.dest_velocity)} ngày`
                                        : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Revenue dự kiến</p>
                                    <p className="font-semibold text-emerald-600">{formatVNDCompact(t.estimated_revenue_gain ?? 0)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Truck className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Chi phí vận chuyển</p>
                                    <p className="font-semibold text-orange-500">{formatVNDCompact(t.estimated_transfer_cost ?? 0)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-muted-foreground">Net Benefit</p>
                                    <p className="font-bold text-emerald-600">{formatVNDCompact(t.net_benefit ?? 0)}</p>
                                  </div>
                                </div>
                                {/* Size breakdown at destination */}
                                <div className="col-span-2 md:col-span-3 border-t border-dashed pt-2 mt-1">
                                  <div className="flex items-start gap-2">
                                    <Store className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <div className="w-full">
                                      <p className="text-muted-foreground mb-1">Tồn kho size tại kho đích</p>
                                      {(() => {
                                        const lookupKey = `${t.product_id}__${t.dest_store_id}`;
                                        const sizeEntries = destSizeMap?.get(lookupKey) || [];
                                        const transfersForProduct = rows.filter((r: any) => r.product_id === t.product_id);
                                        const transferMap = new Map<string, number>();
                                        transfersForProduct.forEach((r: any) => {
                                          transferMap.set(r.size_code, editedQty[r.id] ?? r.transfer_qty);
                                        });
                                        const allSizes = new Map<string, number>();
                                        sizeEntries.forEach((e: any) => allSizes.set(e.size, e.on_hand));
                                        transferMap.forEach((_, size) => {
                                          if (!allSizes.has(size)) allSizes.set(size, 0);
                                        });
                                        const sizeOrder = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL','FS'];
                                        const sorted = Array.from(allSizes.entries()).sort((a, b) => {
                                          const ia = sizeOrder.indexOf(a[0]), ib = sizeOrder.indexOf(b[0]);
                                          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                                        });
                                        const totalSizes = sorted.length;
                                        const sizesWithStock = sorted.filter(([, qty]) => qty > 0).length;
                                        const missingSizes = sorted.filter(([size, qty]) => qty === 0 && transferMap.has(size)).map(([s]) => s);
                                        if (sizeEntries.length === 0) {
                                          return <p className="text-muted-foreground text-[10px] italic">Đang tải dữ liệu size...</p>;
                                        }
                                        return (
                                          <>
                                            <div className="flex flex-wrap gap-1.5">
                                              {sorted.map(([size, qty]) => {
                                                const isTransferring = transferMap.has(size);
                                                const transferQty = transferMap.get(size) || 0;
                                                const isCurrentSize = size === t.size_code;
                                                return (
                                                  <Badge
                                                    key={size}
                                                    variant="outline"
                                                    className={`text-[10px] font-medium ${
                                                      isCurrentSize
                                                        ? 'border-primary bg-primary/10 text-primary font-bold'
                                                        : qty === 0
                                                        ? 'border-destructive/50 bg-destructive/10 text-destructive'
                                                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                    }`}
                                                  >
                                                    {size}: {qty}
                                                    {isTransferring && ` ← chuyển ${transferQty}đv`}
                                                  </Badge>
                                                );
                                              })}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                              Cửa hàng có {sizesWithStock}/{totalSizes} size
                                              {missingSizes.length > 0 && (
                                                <> · Thiếu <strong>{missingSizes.join(', ')}</strong> — chuyển để hoàn thiện size run</>
                                              )}
                                            </p>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-2 md:col-span-3 border-t border-dashed pt-2 mt-1">
                                  <div className="flex items-start gap-2">
                                    <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-muted-foreground mb-1">Lý do chi tiết</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {translateReason(t.reason || '').map((text, i) => (
                                          <Badge key={i} variant="secondary" className="text-[10px] font-normal">{text}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="ml-7 mt-2 text-xs text-muted-foreground">Click "Run Engine" để load chi tiết</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Đề Xuất Điều Chuyển
              <Badge variant="secondary" className="text-xs ml-2">{totalOpportunities} cơ hội</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmAction({ action: 'rejected', ids: Array.from(selectedIds) })}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Từ chối {selectedIds.size}
                  </Button>
                  <Button size="sm" onClick={() => setConfirmAction({ action: 'approved', ids: Array.from(selectedIds) })}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Duyệt & Xuất {selectedIds.size}
                  </Button>
                </>
              )}
              {getAllPendingIds().length > 0 && selectedIds.size === 0 && (
                <Button size="sm" onClick={() => setConfirmAction({ action: 'approved', ids: getAllPendingIds() })}>
                  <FileDown className="h-3.5 w-3.5 mr-1" /> Duyệt tất cả & Xuất Excel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalOpportunities === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <ArrowRightLeft className="h-6 w-6 mx-auto mb-2 opacity-30" />
              Chưa có đề xuất điều chuyển
            </div>
          ) : (
            <div className="space-y-3">
              {/* Purpose summary bar */}
              <div className="flex flex-wrap gap-2">
                {PURPOSE_ORDER.map(key => {
                  const config = PURPOSE_CONFIG[key];
                  const data = purposeCounts[key];
                  if (data.count === 0) return null;
                  return (
                    <Badge key={key} variant="outline" className={`text-xs gap-1 ${config.className}`}>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                      <strong>{data.count}</strong>
                      {data.benefit > 0 && <span className="opacity-70">{formatVNDCompact(data.benefit)}</span>}
                    </Badge>
                  );
                })}
              </div>

              {/* Unified list of destination groups */}
              <div className="space-y-2">
                {unifiedGroups.map(group => {
                  const rows = unifiedDetailRows.get(group.dest_store_id) || [];
                  return renderDestGroup(group, rows);
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'approved' ? 'Xác nhận duyệt & xuất Excel' : 'Xác nhận từ chối'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirmSummary && (
                  <>
                    <p><strong>{confirmSummary.count}</strong> đề xuất · <strong>{confirmSummary.totalQty}</strong> units</p>
                    {confirmAction?.action === 'approved' && (
                      <p>Net Benefit: <strong className="text-emerald-600">{formatVNDCompact(confirmSummary.totalBenefit)}</strong></p>
                    )}
                    {confirmAction?.action === 'approved' && (
                      <p className="text-xs text-muted-foreground">File Excel sẽ tự động download sau khi duyệt.</p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={approveTransfer.isPending}>
              {approveTransfer.isPending ? 'Đang xử lý...' : confirmAction?.action === 'approved' ? 'Duyệt & Xuất Excel' : 'Từ chối'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
