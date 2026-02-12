import React, { useState, useCallback } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronRight, Store, CheckCircle2, XCircle, FileDown, Package, TrendingUp, Truck, DollarSign, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function TransferSuggestionsCard({ transferByDest, detailRows, storeNames, fcNames, totalOpportunities }: Props) {
  const [expandedDest, setExpandedDest] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedQty, setEditedQty] = useState<Record<string, number>>({});
  const [confirmAction, setConfirmAction] = useState<{ action: 'approved' | 'rejected'; ids: string[]; destId?: string } | null>(null);
  const approveTransfer = useApproveTransfer();

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

  const getDestIds = (destId: string): string[] => {
    return (detailRows.get(destId) || []).filter((t: any) => t.status !== 'approved' && t.status !== 'rejected').map((t: any) => t.id);
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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Smart Transfer Suggestions
              <Badge variant="secondary" className="text-xs ml-2">{totalOpportunities} opportunities</Badge>
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
        <CardContent className="space-y-2">
          {transferByDest.map((group) => {
            const destName = storeNames?.get(group.dest_store_id) || group.dest_store_id?.slice(0, 12);
            const isOpen = expandedDest.has(group.dest_store_id);
            const rows = detailRows.get(group.dest_store_id) || [];
            const pendingIds = getDestIds(group.dest_store_id);

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
                        <span className="text-muted-foreground"><strong>{group.transfer_count}</strong> transfers</span>
                        <span className="text-muted-foreground"><strong>{group.total_qty?.toLocaleString()}</strong> units</span>
                        <span className="text-muted-foreground">{group.unique_products} styles</span>
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
                            <TableHead className="w-8"><span className="sr-only">Select</span></TableHead>
                            <TableHead className="text-xs">Style</TableHead>
                            <TableHead className="text-xs">Size</TableHead>
                            <TableHead className="text-xs">From</TableHead>
                            <TableHead className="text-xs text-center">Qty</TableHead>
                            <TableHead className="text-xs text-right">Net Benefit</TableHead>
                            <TableHead className="text-xs">Reason</TableHead>
                            <TableHead className="text-xs text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((t: any) => {
                            const name = fcNames?.get(t.product_id) || t.product_id;
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
                                    <Checkbox
                                      checked={selectedIds.has(t.id)}
                                      onCheckedChange={() => toggleSelect(t.id)}
                                    />
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
                                        if (!isNaN(val) && val > 0) {
                                          setEditedQty(prev => ({ ...prev, [t.id]: val }));
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="font-semibold text-sm">{t.transfer_qty}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium text-emerald-600">{formatVNDCompact(t.net_benefit)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{t.reason}</TableCell>
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
                                          <p className="text-muted-foreground text-[10px]">{(t.source_on_hand ?? 0) > (editedQty[t.id] ?? t.transfer_qty) ? 'Dư hàng' : 'Vừa đủ chuyển'}</p>
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
          })}
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
