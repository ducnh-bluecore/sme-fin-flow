import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useStoreProfile } from '@/hooks/inventory/useStoreProfile';
import { Store, TrendingUp, Package, Palette, Ruler, ShoppingBag } from 'lucide-react';

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const TIER_COLORS: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-muted text-muted-foreground border-border',
};

const DS_COLORS: Record<string, string> = {
  EverydayComfort: 'bg-emerald-500',
  Travel: 'bg-sky-500',
  FastTrendFashion: 'bg-pink-500',
  LuxuryParty: 'bg-purple-500',
  FestiveCultural: 'bg-amber-500',
  SportActive: 'bg-orange-500',
  WorkProfessional: 'bg-slate-500',
  'Không phân loại': 'bg-muted-foreground',
};

function getBarColor(label: string, type: 'ds' | 'size' | 'color') {
  if (type === 'ds') return DS_COLORS[label] || 'bg-primary';
  if (type === 'size') return 'bg-blue-500';
  return 'bg-violet-500';
}

interface BreakdownItem { label: string; units: number; pct: number; }

function HorizontalBarChart({ items, type, maxItems = 8 }: { items: BreakdownItem[]; type: 'ds' | 'size' | 'color'; maxItems?: number }) {
  const display = items.slice(0, maxItems);
  if (display.length === 0) return <p className="text-sm text-muted-foreground">Không có dữ liệu</p>;

  return (
    <div className="space-y-2">
      {display.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[60%]">{item.label}</span>
            <span className="text-muted-foreground">{item.units.toLocaleString('vi-VN')} ({item.pct.toFixed(1)}%)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getBarColor(item.label, type)}`}
              style={{ width: `${Math.max(item.pct, 1)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StoreIntelligenceTab() {
  const { data: stores = [], isLoading: storesLoading } = useInventoryStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const { data: profile, isLoading: profileLoading } = useStoreProfile(selectedStoreId);

  const sortedStores = useMemo(() => {
    return [...stores].sort((a: any, b: any) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 4) - (TIER_ORDER[b.tier] ?? 4);
      if (tierDiff !== 0) return tierDiff;
      return (b.total_on_hand || 0) - (a.total_on_hand || 0);
    });
  }, [stores]);

  if (storesLoading) {
    return <div className="py-12 text-center text-muted-foreground">Đang tải dữ liệu cửa hàng...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Store overview table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Danh sách cửa hàng ({sortedStores.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên CH</TableHead>
                <TableHead className="w-16 text-center">Tier</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Sử dụng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStores.map((s: any) => {
                const util = s.capacity > 0 ? ((s.total_on_hand || 0) / s.capacity * 100) : 0;
                const isSelected = selectedStoreId === s.id;
                return (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                    onClick={() => setSelectedStoreId(isSelected ? null : s.id)}
                  >
                    <TableCell className="font-medium text-sm">{s.store_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${TIER_COLORS[s.tier] || TIER_COLORS.C}`}>
                        {s.tier || 'C'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{(s.total_on_hand || 0).toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{(s.capacity || 0).toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={util > 90 ? 'text-red-400' : util > 70 ? 'text-amber-400' : 'text-emerald-400'}>
                        {util.toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selectedStoreId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                Demand Space
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : (
                <HorizontalBarChart items={profile?.demandSpace || []} type="ds" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4 text-blue-400" />
                Size Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : (
                <HorizontalBarChart items={profile?.sizeBreakdown || []} type="size" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-400" />
                Color Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : profile?.hasColorData ? (
                <HorizontalBarChart items={profile.colorBreakdown} type="color" />
              ) : (
                <div className="py-4 text-center">
                  <Palette className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Chưa có dữ liệu màu sắc</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Sẽ hiển thị khi dữ liệu color được nhập</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
