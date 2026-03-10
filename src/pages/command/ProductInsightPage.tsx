/**
 * ProductInsightPage - Product Lifecycle & Sell-Through Intelligence
 * Grouped by Collection + Paginated
 */

import { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Package, TrendingUp, RefreshCw, AlertTriangle, Clock, Loader2, Play, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ProductDetailDialog from '@/components/inventory/ProductDetailDialog';

interface LifecycleRow {
  fc_id: string;
  fc_name: string | null;
  category: string | null;
  collection_id: string | null;
  collection_name: string | null;
  collection_season: string | null;
  batch_number: number;
  initial_qty: number;
  current_qty: number;
  sold_qty: number;
  sell_through_pct: number;
  age_days: number;
  first_sale_date: string | null;
  batch_start_date: string;
  status: string;
  target_pct: number | null;
  gap_pct: number | null;
  days_behind: number;
  velocity_required: number;
  cash_at_risk: number;
  total_count: number;
}

interface CollectionGroup {
  collection_id: string | null;
  collection_name: string;
  collection_season: string | null;
  rows: LifecycleRow[];
  avgSellThrough: number;
  behindCount: number;
  totalCashAtRisk: number;
}

function StatCard({ icon: Icon, label, value, sub, iconClass }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className={cn('h-5 w-5 text-muted-foreground', iconClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  ahead: { label: 'Ahead', variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  on_track: { label: 'On Track', variant: 'secondary', className: 'bg-primary/10 text-primary border-primary/30' },
  behind: { label: 'Behind', variant: 'outline', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  critical: { label: 'Critical', variant: 'destructive', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  no_data: { label: 'No Data', variant: 'outline', className: '' },
};

const PAGE_SIZE = 50;

export default function ProductInsightPage() {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.id;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [selectedFcId, setSelectedFcId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSearchChange = useCallback((val: string) => {
    setSearchTerm(val);
    setPage(0);
    const timeout = setTimeout(() => setDebouncedSearch(val), 400);
    return () => clearTimeout(timeout);
  }, []);

  const handleStatusChange = useCallback((val: string) => {
    setStatusFilter(val);
    setPage(0);
  }, []);

  const { data: lifecycleData, isLoading, refetch } = useQuery({
    queryKey: ['lifecycle-progress', tenantId, statusFilter, debouncedSearch, page],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.rpc('fn_lifecycle_progress', {
        p_tenant_id: tenantId,
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_search: debouncedSearch || null,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      } as any);
      if (error) throw error;
      return (data || []) as LifecycleRow[];
    },
    enabled: !!tenantId,
  });

  const totalCount = lifecycleData?.[0]?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Group rows by collection
  const collectionGroups = useMemo<CollectionGroup[]>(() => {
    if (!lifecycleData?.length) return [];
    const map = new Map<string, CollectionGroup>();
    
    for (const row of lifecycleData) {
      const key = row.collection_id || '__none__';
      if (!map.has(key)) {
        map.set(key, {
          collection_id: row.collection_id,
          collection_name: row.collection_name || 'Chưa phân loại',
          collection_season: row.collection_season,
          rows: [],
          avgSellThrough: 0,
          behindCount: 0,
          totalCashAtRisk: 0,
        });
      }
      map.get(key)!.rows.push(row);
    }

    return Array.from(map.values()).map(g => ({
      ...g,
      avgSellThrough: Math.round(g.rows.reduce((s, r) => s + r.sell_through_pct, 0) / g.rows.length),
      behindCount: g.rows.filter(r => r.status === 'behind' || r.status === 'critical').length,
      totalCashAtRisk: g.rows.reduce((s, r) => s + Number(r.cash_at_risk), 0),
    }));
  }, [lifecycleData]);

  const summary = useMemo(() => {
    if (!lifecycleData?.length) return { total: totalCount, avgSellThrough: 0, restocked: 0, behind: 0 };
    const restocked = lifecycleData.filter(r => r.batch_number > 1).length;
    const behind = lifecycleData.filter(r => r.status === 'behind' || r.status === 'critical').length;
    const avgSellThrough = lifecycleData.reduce((s, r) => s + r.sell_through_pct, 0) / lifecycleData.length;
    return { total: totalCount, avgSellThrough: Math.round(avgSellThrough), restocked, behind };
  }, [lifecycleData, totalCount]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-lifecycle-batches', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success(`Sync hoàn tất: ${data?.batch1_created || 0} batch mới, ${data?.restocks_detected || 0} restock`);
      refetch();
    } catch (err: any) {
      toast.error(`Sync lỗi: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRowClick = (fcId: string) => {
    setSelectedFcId(fcId);
    setDetailOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Product Insight | Bluecore Command</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader
            title="Product Insight"
            subtitle="Vòng đời sản phẩm, sell-through tracking & restock intelligence"
            icon={<Package className="w-5 h-5" />}
          />
        </div>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Sync Batches
          </Button>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Tổng SP" value={isLoading ? '...' : String(summary.total)} sub="Có batch data" iconClass="text-primary" />
          <StatCard icon={TrendingUp} label="Sell-through TB" value={isLoading ? '...' : `${summary.avgSellThrough}%`} sub="Trang hiện tại" iconClass="text-emerald-500" />
          <StatCard icon={RefreshCw} label="Đã restock" value={isLoading ? '...' : String(summary.restocked)} sub="Trang hiện tại" iconClass="text-primary" />
          <StatCard icon={AlertTriangle} label="Behind / Critical" value={isLoading ? '...' : String(summary.behind)} sub="Cần hành động" iconClass="text-destructive" />
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã SP, tên SP..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="behind">Behind</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="ahead">Ahead</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="lifecycle" className="space-y-4">
          <TabsList>
            <TabsTrigger value="lifecycle" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Vòng Đời
            </TabsTrigger>
            <TabsTrigger value="restock" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Restock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lifecycle">
            <CollectionGroupedView
              groups={collectionGroups}
              isLoading={isLoading}
              onRowClick={handleRowClick}
            />
          </TabsContent>

          <TabsContent value="restock">
            <CollectionGroupedView
              groups={collectionGroups.map(g => ({ ...g, rows: g.rows.filter(r => r.batch_number > 1) })).filter(g => g.rows.length > 0)}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              showBatchCol
            />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Trang {page + 1} / {totalPages} ({totalCount} SP)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProductDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        fcId={selectedFcId}
        tenantId={tenantId ?? null}
      />
    </>
  );
}

/* ─── Collection Grouped View ─── */

function CollectionGroupedView({ groups, isLoading, onRowClick, showBatchCol }: {
  groups: CollectionGroup[];
  isLoading: boolean;
  onRowClick: (fcId: string) => void;
  showBatchCol?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground space-y-3">
          <Package className="h-12 w-12 mx-auto opacity-20" />
          <div>
            <p className="font-medium">Chưa có dữ liệu lifecycle</p>
            <p className="text-sm">Nhấn "Sync Batches" để phát hiện batch từ kho BigQuery</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <CollectionSection
          key={group.collection_id || '__none__'}
          group={group}
          onRowClick={onRowClick}
          showBatchCol={showBatchCol}
        />
      ))}
    </div>
  );
}

/* ─── Collapsible Collection Section ─── */

function CollectionSection({ group, onRowClick, showBatchCol }: {
  group: CollectionGroup;
  onRowClick: (fcId: string) => void;
  showBatchCol?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                <Layers className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{group.collection_name}</span>
                {group.collection_season && (
                  <Badge variant="outline" className="text-[10px]">{group.collection_season}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{group.rows.length} SP</span>
                <span>ST: <strong className="text-foreground">{group.avgSellThrough}%</strong></span>
                {group.behindCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {group.behindCount} cần xử lý
                  </Badge>
                )}
                <span className="font-mono tabular-nums">{(group.totalCashAtRisk / 1_000_000).toFixed(1)}M risk</span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0 border-t">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                    {showBatchCol && <TableHead className="text-center">Batch</TableHead>}
                    <TableHead className="text-center">Tuổi</TableHead>
                    <TableHead className="min-w-[140px]">Sell-through</TableHead>
                    <TableHead className="text-center">Target</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">V/ngày</TableHead>
                    <TableHead className="text-right">Cần/ngày</TableHead>
                    <TableHead className="text-right">Cash (M)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => {
                    const sc = statusConfig[row.status] || statusConfig.no_data;
                    return (
                      <TableRow
                        key={`${row.fc_id}-${row.batch_number}`}
                        className="cursor-pointer"
                        onClick={() => onRowClick(row.fc_id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{row.fc_name || row.fc_id}</p>
                              <p className="text-[11px] text-muted-foreground">{row.category}</p>
                            </div>
                            {row.batch_number > 1 && (
                              <Badge variant="outline" className="text-[10px] shrink-0 gap-0.5">
                                <RefreshCw className="h-2.5 w-2.5" />
                                #{row.batch_number}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {showBatchCol && (
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">#{row.batch_number}</Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="tabular-nums text-sm">{row.age_days}d</div>
                          {row.first_sale_date && (
                            <p className="text-[10px] text-muted-foreground">{row.first_sale_date}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs tabular-nums">
                              <span>{row.sell_through_pct}%</span>
                              <span className="text-muted-foreground">{row.sold_qty}/{row.initial_qty}</span>
                            </div>
                            <Progress value={Math.min(row.sell_through_pct, 100)} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">{row.target_pct ?? '-'}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sc.variant} className={cn('text-[10px]', sc.className)}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {row.age_days > 0 ? (row.sell_through_pct / row.age_days).toFixed(1) : '0'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{row.velocity_required}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {(Number(row.cash_at_risk) / 1_000_000).toFixed(1)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
