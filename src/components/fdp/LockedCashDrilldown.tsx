/**
 * LockedCashDrilldown - Detailed breakdown of locked cash by type
 * 
 * FDP Manifesto Principle #4: Real Cash
 * Shows exactly where cash is locked:
 * - Tồn kho (Inventory)
 * - Ads Float (Marketing pending)
 * - Ops Float (Logistics/shipping)
 * - Platform Hold (eCommerce T+14)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Megaphone, Truck, Store, AlertTriangle, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { useLockedCashDetail, LockedCashItem, LockType } from '@/hooks/useLockedCashDetail';
import { cn } from '@/lib/utils';

const lockTypeConfig: Record<LockType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  description: string;
}> = {
  inventory: {
    icon: Package,
    label: 'Tồn kho',
    color: 'text-amber-500',
    description: 'Giá trị hàng tồn đang chiếm vốn',
  },
  ads: {
    icon: Megaphone,
    label: 'Ads Float',
    color: 'text-blue-500',
    description: 'Chi phí quảng cáo 14 ngày gần nhất chưa convert',
  },
  ops: {
    icon: Truck,
    label: 'Ops Float',
    color: 'text-purple-500',
    description: 'Hóa đơn logistics/shipping chưa thanh toán',
  },
  platform: {
    icon: Store,
    label: 'Platform Hold',
    color: 'text-green-500',
    description: 'Doanh thu eCommerce chờ giải ngân (T+14)',
  },
};

interface DrilldownTableProps {
  items: LockedCashItem[];
  lockType: LockType;
  total: number;
}

function DrilldownTable({ items, lockType, total }: DrilldownTableProps) {
  const config = lockTypeConfig[lockType];
  
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <config.icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Không có dữ liệu {config.label}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <config.icon className={cn("h-5 w-5", config.color)} />
          <span className="font-medium">{config.label}</span>
          <Badge variant="secondary" className="text-xs">
            {items.length} items
          </Badge>
        </div>
        <span className={cn("font-bold text-lg", config.color)}>
          {formatVNDCompact(total)}
        </span>
      </div>
      
      {/* Table */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {items.map((item, idx) => (
            <motion.div
              key={`${item.sku}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                item.status === 'slow_moving' && 'border-amber-500/50',
                item.status === 'pending' && 'border-blue-500/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {item.productName || item.sku || 'N/A'}
                    </span>
                    {item.status === 'slow_moving' && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Chậm luân chuyển
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {item.sku && <span>SKU: {item.sku}</span>}
                    {item.quantity !== null && (
                      <span>SL: {item.quantity.toLocaleString()}</span>
                    )}
                    {item.referenceDate && (
                      <span>
                        {new Date(item.referenceDate).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-right whitespace-nowrap">
                  {formatVNDCompact(item.lockedAmount)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function LockedCashDrilldown() {
  const { data, isLoading, error } = useLockedCashDetail();
  const [activeTab, setActiveTab] = useState<LockType>('inventory');
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Không thể tải dữ liệu locked cash</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const tabs = [
    { type: 'inventory' as LockType, items: data.inventory, total: data.totals.inventory },
    { type: 'ads' as LockType, items: data.ads, total: data.totals.ads },
    { type: 'ops' as LockType, items: data.ops, total: data.totals.ops },
    { type: 'platform' as LockType, items: data.platform, total: data.totals.platform },
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chi tiết Cash bị khóa</CardTitle>
          <Badge variant="secondary" className="text-sm font-semibold">
            Tổng: {formatVNDCompact(data.totals.total)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LockType)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            {tabs.map(({ type, total }) => {
              const config = lockTypeConfig[type];
              const Icon = config.icon;
              return (
                <TabsTrigger 
                  key={type} 
                  value={type}
                  className="flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  {total > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {formatVNDCompact(total)}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <AnimatePresence mode="wait">
            {tabs.map(({ type, items, total }) => (
              <TabsContent key={type} value={type} className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm text-muted-foreground mb-4">
                    {lockTypeConfig[type].description}
                  </p>
                  <DrilldownTable items={items} lockType={type} total={total} />
                </motion.div>
              </TabsContent>
            ))}
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LockedCashDrilldown;
