/**
 * ProductInsightPage - Product Lifecycle & Sell-Through Intelligence
 * 
 * Tracks product lifecycle batches (initial + restock), sell-through progress,
 * and surfaces products that are behind schedule or need action.
 */

import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Package, TrendingUp, RefreshCw, AlertTriangle, Clock, BarChart3, Loader2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LifecycleRow {
  fc_id: string;
  fc_code: string;
  fc_name: string;
  category: string | null;
  batch_number: number;
  batch_qty: number;
  batch_start_date: string;
  age_days: number;
  current_on_hand: number;
  batch_sold: number;
  sell_through_pct: number;
  target_pct: number;
  gap_pct: number;
  status: string;
  velocity_current: number;
  velocity_required: number;
  is_restocked: boolean;
  total_batches: number;
  cash_at_risk: number;
  source: string;
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

export default function ProductInsightPage() {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.id;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  const { data: lifecycleData, isLoading, refetch } = useQuery({
    queryKey: ['lifecycle-progress', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.rpc('fn_lifecycle_progress', { p_tenant_id: tenantId });
      if (error) throw error;
      return (data || []) as LifecycleRow[];
    },
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => {
    if (!lifecycleData) return [];
    if (statusFilter === 'all') return lifecycleData;
    if (statusFilter === 'restock') return lifecycleData.filter(r => r.is_restocked);
    return lifecycleData.filter(r => r.status === statusFilter);
  }, [lifecycleData, statusFilter]);

  const summary = useMemo(() => {
    if (!lifecycleData?.length) return { total: 0, avgSellThrough: 0, restocked: 0, behind: 0 };
    const restocked = lifecycleData.filter(r => r.is_restocked).length;
    const behind = lifecycleData.filter(r => r.status === 'behind' || r.status === 'critical').length;
    const avgSellThrough = lifecycleData.reduce((s, r) => s + r.sell_through_pct, 0) / lifecycleData.length;
    return { total: lifecycleData.length, avgSellThrough: Math.round(avgSellThrough), restocked, behind };
  }, [lifecycleData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-lifecycle-batches');
      if (error) throw error;
      toast.success(`Sync hoàn tất: ${data?.batch1_created || 0} batch mới, ${data?.restocks_detected || 0} restock`);
      refetch();
    } catch (err: any) {
      toast.error(`Sync lỗi: ${err.message}`);
    } finally {
      setSyncing(false);
    }
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
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Sync Batches
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Tổng SP theo dõi" value={isLoading ? '...' : String(summary.total)} sub="Có batch data" iconClass="text-primary" />
          <StatCard icon={TrendingUp} label="Sell-through TB" value={isLoading ? '...' : `${summary.avgSellThrough}%`} sub="Trung bình toàn bộ" iconClass="text-emerald-500" />
          <StatCard icon={RefreshCw} label="Đã restock" value={isLoading ? '...' : String(summary.restocked)} sub="SP có ≥2 batch" iconClass="text-primary" />
          <StatCard icon={AlertTriangle} label="Behind / Critical" value={isLoading ? '...' : String(summary.behind)} sub="Cần hành động" iconClass="text-destructive" />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="lifecycle" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="behind">Behind</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="ahead">Ahead</SelectItem>
                <SelectItem value="restock">Restock only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="lifecycle">
            <LifecycleTable rows={filtered} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="restock">
            <LifecycleTable rows={filtered.filter(r => r.is_restocked)} isLoading={isLoading} showBatchCol />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function LifecycleTable({ rows, isLoading, showBatchCol }: { rows: LifecycleRow[]; isLoading: boolean; showBatchCol?: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
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
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{rows.length} sản phẩm</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                {showBatchCol && <TableHead className="text-center">Batch</TableHead>}
                <TableHead className="text-center">Tuổi</TableHead>
                <TableHead className="min-w-[160px]">Sell-through</TableHead>
                <TableHead className="text-center">Target</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Velocity</TableHead>
                <TableHead className="text-right">Cần/ngày</TableHead>
                <TableHead className="text-right">Cash (M)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const sc = statusConfig[row.status] || statusConfig.no_data;
                return (
                  <TableRow key={`${row.fc_id}-${row.batch_number}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{row.fc_name || row.fc_code}</p>
                          <p className="text-xs text-muted-foreground">{row.fc_code}</p>
                        </div>
                        {row.is_restocked && (
                          <Badge variant="outline" className="text-[10px] shrink-0 gap-0.5">
                            <RefreshCw className="h-2.5 w-2.5" />
                            #{row.total_batches}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {showBatchCol && (
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">#{row.batch_number}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-center tabular-nums text-sm">{row.age_days}d</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs tabular-nums">
                          <span>{row.sell_through_pct}%</span>
                          <span className="text-muted-foreground">{row.batch_sold}/{row.batch_qty}</span>
                        </div>
                        <Progress value={Math.min(row.sell_through_pct, 100)} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{row.target_pct}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={sc.variant} className={cn('text-[10px]', sc.className)}>
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{row.velocity_current}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{row.velocity_required}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">{row.cash_at_risk}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
