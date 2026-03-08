import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Package, ArrowLeft, Plus, Loader2, Store, TrendingUp, Warehouse, AlertTriangle } from 'lucide-react';
import { useStoreVelocity, type StoreVelocityRow } from '@/hooks/inventory/useStoreVelocity';
import { useAddManualAllocation } from '@/hooks/inventory/useAddManualAllocation';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { InvCollection } from '@/hooks/inventory/useCollections';
import type { FamilyCode } from '@/hooks/inventory/useFamilyCodes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: InvCollection[];
  familyCodes: FamilyCode[];
  latestRunId: string | null;
  targetStoreId: string;
  targetStoreName: string;
}

// Helper: fallback to fc_code when fc_name is invalid (e.g. "1")
function displayFcName(fc: FamilyCode): string {
  const name = fc.fc_name?.trim();
  if (!name || name.length <= 2 || /^\d+$/.test(name)) return fc.fc_code;
  return name;
}

export function AddProductSheet({ open, onOpenChange, collections, familyCodes, latestRunId, targetStoreId, targetStoreName }: Props) {
  const [search, setSearch] = useState('');
  const [selectedFcId, setSelectedFcId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const { data: velocityData, isLoading: velocityLoading } = useStoreVelocity(selectedFcId || undefined);
  const addManual = useAddManualAllocation();

  const selectedFc = useMemo(() => familyCodes.find(fc => fc.id === selectedFcId), [familyCodes, selectedFcId]);

  // Find target store velocity row
  const targetStoreVelocity = useMemo(() => {
    if (!velocityData) return null;
    return velocityData.find(r => r.store_id === targetStoreId) || null;
  }, [velocityData, targetStoreId]);

  // Group FCs by collection
  const collectionGroups = useMemo(() => {
    const searchLower = search.toLowerCase();
    const groups: { collection: InvCollection; fcs: FamilyCode[] }[] = [];

    for (const c of collections) {
      const fcs = familyCodes.filter(fc => {
        if (fc.collection_id !== c.id) return false;
        if (!search) return true;
        return fc.fc_name.toLowerCase().includes(searchLower) ||
               fc.fc_code.toLowerCase().includes(searchLower);
      });
      if (fcs.length > 0) groups.push({ collection: c, fcs });
    }

    // FCs without collection
    const orphanFcs = familyCodes.filter(fc => {
      if (fc.collection_id) return false;
      if (!search) return true;
      return fc.fc_name.toLowerCase().includes(searchLower) ||
             fc.fc_code.toLowerCase().includes(searchLower);
    });
    if (orphanFcs.length > 0) {
      groups.push({
        collection: { id: '__none__', collection_code: '', collection_name: 'Không thuộc BST', air_date: null, is_new_collection: false, season: null, created_at: '', tenant_id: '' },
        fcs: orphanFcs,
      });
    }

    return groups;
  }, [collections, familyCodes, search]);

  const handleSelectFc = (fcId: string) => {
    setSelectedFcId(fcId);
    setQty(1);
  };

  const handleBack = () => {
    setSelectedFcId(null);
  };

  const handleAdd = () => {
    if (!latestRunId || !selectedFcId || !selectedFc) return;
    addManual.mutate({
      runId: latestRunId,
      fcId: selectedFcId,
      fcName: displayFcName(selectedFc),
      storeId: targetStoreId,
      storeName: targetStoreName,
      qty,
    }, {
      onSuccess: () => {
        setQty(1);
      },
    });
  };

  const cwOnHand = useMemo(() => {
    if (!velocityData) return 0;
    return velocityData.reduce((sum, r) => sum + r.on_hand, 0);
  }, [velocityData]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Thêm SP vào {targetStoreName}
          </SheetTitle>
          <SheetDescription>
            Chọn sản phẩm từ BST, xem tồn kho & velocity, rồi thêm vào lệnh điều chuyển
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {!selectedFcId ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc mã sản phẩm..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Collection list */}
              {collectionGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Không tìm thấy sản phẩm</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-1">
                  {collectionGroups.map(({ collection, fcs }) => (
                    <AccordionItem key={collection.id} value={collection.id} className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-accent/50 text-sm">
                        <div className="flex items-center gap-2 flex-1 text-left">
                          <span className="font-semibold">{collection.collection_name}</span>
                          <Badge variant="secondary" className="text-[10px]">{fcs.length} SP</Badge>
                          {collection.is_new_collection && (
                            <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">Mới</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-2 space-y-1">
                        {fcs.map(fc => (
                          <button
                            key={fc.id}
                            onClick={() => handleSelectFc(fc.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent/60 transition-colors border border-transparent hover:border-border/50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{displayFcName(fc)}</p>
                                <p className="text-xs text-muted-foreground">{fc.fc_code}{fc.category ? ` · ${fc.category}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="text-xs">Xem chi tiết</span>
                                <Package className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </>
          ) : (
            <>
              {/* FC Detail View */}
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>

              <div className="rounded-lg border bg-card p-4 space-y-2">
                <h3 className="font-semibold text-foreground">{selectedFc ? displayFcName(selectedFc) : ''}</h3>
                <p className="text-xs text-muted-foreground">{selectedFc?.fc_code}{selectedFc?.category ? ` · ${selectedFc.category}` : ''}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Tổng tồn hệ thống: <span className="font-semibold text-foreground">{cwOnHand}</span></span>
                </div>
              </div>

              {/* Target store info card */}
              <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Store className="h-4 w-4 text-primary" />
                  Thêm vào: {targetStoreName}
                </div>
                {targetStoreVelocity && (
                  <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                    <div>
                      <span className="text-muted-foreground">Tồn hiện tại</span>
                      <p className="font-bold text-foreground">{targetStoreVelocity.on_hand}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bán/ngày</span>
                      <p className="font-bold text-foreground">{targetStoreVelocity.avg_daily_sales.toFixed(1)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Đã bán</span>
                      <p className="font-bold text-foreground">{targetStoreVelocity.total_sold}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Store velocity table (for comparison) */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  So sánh các cửa hàng khác
                </h4>

                {velocityLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Đang tải dữ liệu...</span>
                  </div>
                ) : !velocityData || velocityData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Không có dữ liệu velocity</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cửa hàng</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tồn</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Bán/ngày</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Đã bán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {velocityData
                          .sort((a, b) => a.on_hand - b.on_hand)
                          .map(row => {
                            const isTarget = row.store_id === targetStoreId;
                            const needsStock = row.on_hand === 0 && row.avg_daily_sales > 0;
                            return (
                              <tr
                                key={row.store_id}
                                className={`border-b last:border-b-0 transition-colors ${isTarget ? 'bg-primary/10 font-semibold' : ''} ${needsStock ? 'bg-red-500/5' : ''}`}
                              >
                                <td className="px-3 py-2">
                                  <span className={isTarget ? 'text-primary' : ''}>{row.store_name}</span>
                                  {isTarget && (
                                    <Badge className="ml-2 text-[10px] py-0 bg-primary/20 text-primary border-primary/40">Đích</Badge>
                                  )}
                                  {needsStock && (
                                    <Badge variant="destructive" className="ml-2 text-[10px] py-0">Hết hàng</Badge>
                                  )}
                                </td>
                                <td className="text-right px-3 py-2 font-mono">{row.on_hand}</td>
                                <td className="text-right px-3 py-2 font-mono">
                                  <span className="flex items-center justify-end gap-1">
                                    {row.avg_daily_sales > 0 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                                    {row.avg_daily_sales.toFixed(1)}
                                  </span>
                                </td>
                                <td className="text-right px-3 py-2 font-mono">{row.total_sold}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add form — no store selection needed */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium">Số lượng phân bổ</h4>
                <div>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32"
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={addManual.isPending || !latestRunId}
                  className="w-full gap-2"
                >
                  {addManual.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Thêm vào {targetStoreName}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
