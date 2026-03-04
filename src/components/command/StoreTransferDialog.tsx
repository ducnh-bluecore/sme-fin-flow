import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Package, Loader2 } from 'lucide-react';
import { useStoreVelocity, type StoreVelocityRow } from '@/hooks/inventory/useStoreVelocity';
import { useCreateManualTransfer } from '@/hooks/inventory/useCreateManualTransfer';

export interface SizeStoreEntry {
  sku: string;
  size_code: string;
  store_name: string;
  on_hand: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fcId: string;
  fcName: string;
  storeName: string;
  storeId: string;
  currentOnHand: number;
  sizeOrder: string[];
  sizeEntries: SizeStoreEntry[];
}

// Per-store, per-size qty map: storeId -> { size -> qty }
type SizeQtyMap = Map<string, Record<string, number>>;

export default function StoreTransferDialog({ open, onOpenChange, fcId, fcName, storeName, storeId, currentOnHand, sizeOrder, sizeEntries }: Props) {
  const { data: allStores, isLoading } = useStoreVelocity(open ? fcId : undefined);
  const createTransfer = useCreateManualTransfer();
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [sizeQtyMap, setSizeQtyMap] = useState<SizeQtyMap>(new Map());
  const [tab, setTab] = useState<'pull' | 'push'>('pull');

  const currentStore = useMemo(() => allStores?.find(s => s.store_name === storeName), [allStores, storeName]);
  const currentVelocity = currentStore?.avg_daily_sales ?? 0;
  const hasSizes = sizeOrder.length > 0;

  // Build per-store, per-size on_hand map from sizeEntries
  const storeSizeMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of sizeEntries) {
      if (!map.has(e.store_name)) map.set(e.store_name, new Map());
      const sizeMap = map.get(e.store_name)!;
      sizeMap.set(e.size_code, (sizeMap.get(e.size_code) || 0) + e.on_hand);
    }
    return map;
  }, [sizeEntries]);

  const currentSizes = storeSizeMap.get(storeName) || new Map<string, number>();

  const pullStores = useMemo(() => {
    if (!allStores) return [];
    return allStores
      .filter(s => s.store_name !== storeName && s.on_hand > 0)
      .sort((a, b) => a.avg_daily_sales - b.avg_daily_sales);
  }, [allStores, storeName]);

  const pushStores = useMemo(() => {
    if (!allStores) return [];
    return allStores
      .filter(s => s.store_name !== storeName)
      .sort((a, b) => b.avg_daily_sales - a.avg_daily_sales);
  }, [allStores, storeName]);

  const toggleStore = (storeKey: string) => {
    setSelectedStores(prev => {
      const next = new Set(prev);
      if (next.has(storeKey)) {
        next.delete(storeKey);
        // Also clear qty
        setSizeQtyMap(m => { const n = new Map(m); n.delete(storeKey); return n; });
      } else {
        next.add(storeKey);
      }
      return next;
    });
  };

  const updateSizeQty = (storeKey: string, size: string, qty: number) => {
    setSizeQtyMap(prev => {
      const next = new Map(prev);
      const existing = next.get(storeKey) || {};
      next.set(storeKey, { ...existing, [size]: Math.max(0, qty) });
      return next;
    });
  };

  const getStoreTotal = (storeKey: string) => {
    const sizes = sizeQtyMap.get(storeKey);
    if (!sizes) return 0;
    return Object.values(sizes).reduce((a, b) => a + b, 0);
  };

  const grandTotal = useMemo(() => {
    let total = 0;
    for (const storeKey of selectedStores) {
      total += getStoreTotal(storeKey);
    }
    return total;
  }, [selectedStores, sizeQtyMap]);

  const handleSubmit = () => {
    const lines: { fcId: string; fcName: string; fromStoreId: string; fromStoreName: string; toStoreId: string; toStoreName: string; qty: number }[] = [];
    
    for (const storeKey of selectedStores) {
      const total = getStoreTotal(storeKey);
      if (total <= 0) continue;
      const store = allStores?.find(s => s.store_id === storeKey);
      if (tab === 'pull') {
        lines.push({
          fcId, fcName,
          fromStoreId: store?.store_id || storeKey,
          fromStoreName: store?.store_name || storeKey,
          toStoreId: storeId,
          toStoreName: storeName,
          qty: total,
        });
      } else {
        lines.push({
          fcId, fcName,
          fromStoreId: storeId,
          fromStoreName: storeName,
          toStoreId: store?.store_id || storeKey,
          toStoreName: store?.store_name || storeKey,
          qty: total,
        });
      }
    }

    if (lines.length === 0) return;
    createTransfer.mutate(lines, {
      onSuccess: () => {
        setSelectedStores(new Set());
        setSizeQtyMap(new Map());
        onOpenChange(false);
      },
    });
  };

  const resetState = () => {
    setSelectedStores(new Set());
    setSizeQtyMap(new Map());
  };

  const stores = tab === 'pull' ? pullStores : pushStores;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Điều chuyển: {fcName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cửa hàng: <strong>{storeName}</strong> · Tồn kho: <strong>{currentOnHand}</strong> · Velocity: <strong>{currentVelocity.toFixed(1)}</strong> sp/ngày
          </DialogDescription>
        </DialogHeader>

        {/* Current store size breakdown (for Push tab context) */}
        {tab === 'push' && hasSizes && (
          <div className="rounded-md border bg-muted/30 p-2.5">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Tồn hiện tại tại {storeName}:</p>
            <div className="flex gap-2 flex-wrap">
              {sizeOrder.map(size => {
                const qty = currentSizes.get(size) || 0;
                return (
                  <div key={size} className="text-center">
                    <div className="text-[10px] text-muted-foreground">{size}</div>
                    <div className={`text-xs font-mono font-semibold ${qty === 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {qty === 0 ? '✗' : qty}
                    </div>
                  </div>
                );
              })}
              <div className="text-center border-l pl-2 ml-1">
                <div className="text-[10px] text-muted-foreground">Tổng</div>
                <div className="text-xs font-mono font-bold">{currentOnHand}</div>
              </div>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={v => { setTab(v as 'pull' | 'push'); resetState(); }} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="pull" className="flex-1 gap-1.5 text-xs">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Nhận hàng về ({pullStores.length})
            </TabsTrigger>
            <TabsTrigger value="push" className="flex-1 gap-1.5 text-xs">
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              Chuyển hàng đi ({pushStores.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 min-h-0 mt-2">
            {isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : stores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {tab === 'pull' ? 'Không có kho nào còn hàng.' : 'Không có kho nào khả dụng.'}
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs sticky left-0 bg-background z-10 min-w-[120px]">Cửa hàng</TableHead>
                      <TableHead className="text-xs text-center">
                        <span className="flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> Vel.</span>
                      </TableHead>
                      {/* Size columns: show on_hand on top, input below when checked */}
                      {hasSizes && sizeOrder.map(size => (
                        <TableHead key={size} className="text-[10px] text-center min-w-[52px] px-0.5">{size}</TableHead>
                      ))}
                      <TableHead className="text-xs text-center min-w-[50px]">Tổng tồn</TableHead>
                      <TableHead className="text-xs text-center min-w-[50px]">Chuyển</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map(store => {
                      const key = store.store_id;
                      const isChecked = selectedStores.has(key);
                      const sizes = storeSizeMap.get(store.store_name) || new Map<string, number>();
                      const storeQty = sizeQtyMap.get(key) || {};
                      const storeTotal = getStoreTotal(key);

                      return (
                        <TableRow key={key} className={isChecked ? 'bg-primary/5' : ''}>
                          <TableCell className="p-2">
                            <Checkbox checked={isChecked} onCheckedChange={() => toggleStore(key)} />
                          </TableCell>
                          <TableCell className="text-xs font-medium sticky left-0 bg-background z-10 whitespace-nowrap">{store.store_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] font-mono ${store.avg_daily_sales >= 1 ? 'text-emerald-600' : store.avg_daily_sales > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {store.avg_daily_sales.toFixed(1)}/d
                            </Badge>
                          </TableCell>
                          {hasSizes && sizeOrder.map(size => {
                            // Pull: show SOURCE store's stock; Push: show CURRENT store's stock (what we can send)
                            const destOnHand = sizes.get(size) || 0;
                            const myOnHand = currentSizes.get(size) || 0;
                            const displayOnHand = tab === 'pull' ? destOnHand : myOnHand;
                            const maxQty = tab === 'pull' ? destOnHand : myOnHand;
                            const canInput = displayOnHand > 0;
                            const inputVal = storeQty[size] || 0;

                            return (
                              <TableCell key={size} className="text-center px-0.5 py-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`text-[10px] font-mono ${displayOnHand === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {displayOnHand === 0 ? '-' : displayOnHand}
                                  </span>
                                  {isChecked && canInput && (
                                    <Input
                                      type="number"
                                      min={0}
                                      max={maxQty}
                                      value={inputVal || ''}
                                      placeholder="0"
                                      onChange={e => updateSizeQty(key, size, parseInt(e.target.value) || 0)}
                                      className="h-6 w-11 text-[10px] text-center p-0 font-mono"
                                    />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-xs font-mono font-semibold">{store.on_hand}</TableCell>
                          <TableCell className="text-center text-xs font-mono font-bold text-primary">
                            {isChecked && storeTotal > 0 ? storeTotal : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <div className="flex-1 text-xs text-muted-foreground">
            {selectedStores.size > 0 && grandTotal > 0 && (
              <span>Đã chọn {selectedStores.size} kho · Tổng: {grandTotal} sp</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={selectedStores.size === 0 || grandTotal === 0 || createTransfer.isPending}
          >
            {createTransfer.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Tạo lệnh ({grandTotal} sp)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
