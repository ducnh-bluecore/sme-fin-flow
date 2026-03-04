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

export default function StoreTransferDialog({ open, onOpenChange, fcId, fcName, storeName, storeId, currentOnHand, sizeOrder, sizeEntries }: Props) {
  const { data: allStores, isLoading } = useStoreVelocity(open ? fcId : undefined);
  const createTransfer = useCreateManualTransfer();
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [tab, setTab] = useState<'pull' | 'push'>('pull');

  const currentStore = useMemo(() => allStores?.find(s => s.store_name === storeName), [allStores, storeName]);
  const currentVelocity = currentStore?.avg_daily_sales ?? 0;

  // Build per-store, per-size map from sizeEntries
  const storeSizeMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of sizeEntries) {
      if (!map.has(e.store_name)) map.set(e.store_name, new Map());
      const sizeMap = map.get(e.store_name)!;
      sizeMap.set(e.size_code, (sizeMap.get(e.size_code) || 0) + e.on_hand);
    }
    return map;
  }, [sizeEntries]);

  // Current store's sizes (for Push tab header)
  const currentSizes = storeSizeMap.get(storeName) || new Map<string, number>();

  // Pull: other stores with stock, sorted by slowest velocity
  const pullStores = useMemo(() => {
    if (!allStores) return [];
    return allStores
      .filter(s => s.store_name !== storeName && s.on_hand > 0)
      .sort((a, b) => a.avg_daily_sales - b.avg_daily_sales);
  }, [allStores, storeName]);

  // Push: other stores sorted by fastest velocity
  const pushStores = useMemo(() => {
    if (!allStores) return [];
    return allStores
      .filter(s => s.store_name !== storeName)
      .sort((a, b) => b.avg_daily_sales - a.avg_daily_sales);
  }, [allStores, storeName]);

  const toggleStore = (storeKey: string) => {
    setSelected(prev => {
      const next = new Map(prev);
      next.has(storeKey) ? next.delete(storeKey) : next.set(storeKey, 1);
      return next;
    });
  };

  const updateQty = (storeKey: string, qty: number) => {
    setSelected(prev => {
      const next = new Map(prev);
      next.set(storeKey, Math.max(0, qty));
      return next;
    });
  };

  const handleSubmit = () => {
    const lines = Array.from(selected.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const store = allStores?.find(s => s.store_id === key);
        if (tab === 'pull') {
          return {
            fcId, fcName,
            fromStoreId: store?.store_id || key,
            fromStoreName: store?.store_name || key,
            toStoreId: storeId,
            toStoreName: storeName,
            qty,
          };
        } else {
          return {
            fcId, fcName,
            fromStoreId: storeId,
            fromStoreName: storeName,
            toStoreId: store?.store_id || key,
            toStoreName: store?.store_name || key,
            qty,
          };
        }
      });

    if (lines.length === 0) return;
    createTransfer.mutate(lines, {
      onSuccess: () => {
        setSelected(new Map());
        onOpenChange(false);
      },
    });
  };

  const stores = tab === 'pull' ? pullStores : pushStores;
  const totalSelected = Array.from(selected.values()).reduce((a, b) => a + b, 0);
  const hasSizes = sizeOrder.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
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

        <Tabs value={tab} onValueChange={v => { setTab(v as 'pull' | 'push'); setSelected(new Map()); }} className="flex-1 flex flex-col min-h-0">
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
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs sticky left-0 bg-background z-10">Cửa hàng</TableHead>
                      {hasSizes && sizeOrder.map(size => (
                        <TableHead key={size} className="text-[10px] text-center min-w-[36px] px-1">{size}</TableHead>
                      ))}
                      <TableHead className="text-xs text-center">Tổng</TableHead>
                      <TableHead className="text-xs text-center">
                        <span className="flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> Vel.</span>
                      </TableHead>
                      <TableHead className="text-xs text-center">Đã bán</TableHead>
                      <TableHead className="text-xs text-center w-20">SL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map(store => {
                      const key = store.store_id;
                      const isChecked = selected.has(key);
                      const qty = selected.get(key) || 1;
                      const sizes = storeSizeMap.get(store.store_name) || new Map<string, number>();
                      return (
                        <TableRow key={key} className={isChecked ? 'bg-primary/5' : ''}>
                          <TableCell className="p-2">
                            <Checkbox checked={isChecked} onCheckedChange={() => toggleStore(key)} />
                          </TableCell>
                          <TableCell className="text-xs font-medium sticky left-0 bg-background z-10 whitespace-nowrap">{store.store_name}</TableCell>
                          {hasSizes && sizeOrder.map(size => {
                            const sQty = sizes.get(size) || 0;
                            return (
                              <TableCell key={size} className={`text-center text-[10px] font-mono px-1 ${sQty === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {sQty === 0 ? '-' : sQty}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-xs font-mono font-semibold">{store.on_hand}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] font-mono ${store.avg_daily_sales >= 1 ? 'text-emerald-600' : store.avg_daily_sales > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {store.avg_daily_sales.toFixed(1)}/d
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono">{store.total_sold}</TableCell>
                          <TableCell className="text-center p-1">
                            {isChecked && (
                              <Input
                                type="number"
                                min={1}
                                max={tab === 'pull' ? store.on_hand : currentOnHand}
                                value={qty}
                                onChange={e => updateQty(key, parseInt(e.target.value) || 0)}
                                className="h-7 w-16 text-xs text-center mx-auto"
                              />
                            )}
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
            {selected.size > 0 && (
              <span>Đã chọn {selected.size} kho · Tổng: {totalSelected} sp</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={selected.size === 0 || totalSelected === 0 || createTransfer.isPending}
          >
            {createTransfer.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Tạo lệnh ({totalSelected} sp)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
