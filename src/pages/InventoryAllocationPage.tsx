import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, ArrowRightLeft, Settings2, BarChart3, History, ChevronDown, Layers, Target, Crown, Store, Wand2, ClipboardList, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InventoryHeroHeader } from '@/components/inventory/InventoryHeroHeader';
import { CapacityOptimizationCard } from '@/components/inventory/CapacityOptimizationCard';
import { RebalanceSummaryCards } from '@/components/inventory/RebalanceSummaryCards';
import { DailyTransferOrder } from '@/components/inventory/DailyTransferOrder';
import { RebalanceConfigPanel } from '@/components/inventory/RebalanceConfigPanel';
import { RebalanceSimulationTab } from '@/components/inventory/RebalanceSimulationTab';
import { RebalanceAuditLog } from '@/components/inventory/RebalanceAuditLog';
import { StoreDirectoryTab } from '@/components/inventory/StoreDirectoryTab';
import { RecallOrderPanel } from '@/components/inventory/RecallOrderPanel';
import { StoreIntelligenceTab } from '@/components/inventory/StoreIntelligenceTab';
import { useRebalanceSuggestions, useLatestRebalanceRun } from '@/hooks/inventory/useRebalanceSuggestions';
import { useAllocationRecommendations, useLatestAllocationRun } from '@/hooks/inventory/useAllocationRecommendations';
import { useRunRebalance, useRunAllocate, useRunRecall } from '@/hooks/inventory/useRunRebalance';
import { useApproveRebalance } from '@/hooks/inventory/useApproveRebalance';
import { useInventoryStores } from '@/hooks/inventory/useInventoryStores';
import { useFamilyCodes } from '@/hooks/inventory/useFamilyCodes';
import { buildStoreMap } from '@/lib/inventory-store-map';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useQueryClient } from '@tanstack/react-query';
import type { RebalanceSuggestion } from '@/hooks/inventory/useRebalanceSuggestions';

export default function InventoryAllocationPage() {
  const [activeTab, setActiveTab] = useState('transfer');

  const { data: latestRebalanceRun } = useLatestRebalanceRun();
  const { data: rebalanceSuggestions = [] } = useRebalanceSuggestions(latestRebalanceRun?.id);
  const { data: latestAllocRun } = useLatestAllocationRun();
  const { data: allocRecs = [] } = useAllocationRecommendations(latestAllocRun?.id);

  // Map allocation recommendations to RebalanceSuggestion format for unified display
  const allocAsSuggestions: RebalanceSuggestion[] = useMemo(() => {
    return allocRecs.map((r: any) => ({
      id: r.id,
      run_id: r.run_id,
      transfer_type: 'push' as const,
      fc_id: r.fc_id,
      fc_name: r.fc_name || '',
      from_location: '', // CW
      from_location_name: 'Kho tổng',
      from_location_type: 'central_warehouse',
      to_location: r.store_id,
      to_location_name: r.store_name || '',
      to_location_type: 'retail',
      qty: r.recommended_qty || 0,
      reason: r.reason || '',
      from_weeks_cover: 0,
      to_weeks_cover: r.current_weeks_cover || 0,
      balanced_weeks_cover: r.projected_weeks_cover || 0,
      priority: r.priority || 'medium',
      potential_revenue_gain: r.potential_revenue || 0,
      logistics_cost_estimate: r.logistics_cost_estimate || 0,
      net_benefit: (r.potential_revenue || 0) - (r.logistics_cost_estimate || 0),
      status: r.status || 'pending',
      approved_by: r.approved_by,
      approved_at: r.approved_at,
      created_at: r.created_at,
      size_breakdown: r.size_breakdown,
    }));
  }, [allocRecs]);

  const allSuggestions = useMemo(() => [...allocAsSuggestions, ...rebalanceSuggestions], [allocAsSuggestions, rebalanceSuggestions]);
  const { data: stores = [] } = useInventoryStores();
  const { data: familyCodes = [] } = useFamilyCodes();
  const storeMap = useMemo(() => buildStoreMap(stores), [stores]);
  const fcNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    familyCodes.forEach(fc => { map[fc.id] = fc.fc_name; });
    return map;
  }, [familyCodes]);
  const runRebalance = useRunRebalance();
  const runAllocate = useRunAllocate();
  const runRecall = useRunRecall();
  const approveRebalance = useApproveRebalance();
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  const [isRecalcTier, setIsRecalcTier] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Check if there are records missing size_breakdown
  const hasMissingSize = useMemo(() => {
    return allocRecs.some((r: any) => r.size_breakdown == null) || 
           rebalanceSuggestions.some((s: any) => s.size_breakdown == null);
  }, [allocRecs, rebalanceSuggestions]);

  const handleBackfillSize = useCallback(async () => {
    if (!tenantId) return;
    setIsBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-backfill-size-split', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success(`Đã cập nhật size cho ${data?.updated_count || 0} đề xuất (${data?.skipped_count || 0} bỏ qua)`);
      queryClient.invalidateQueries({ queryKey: ['inv-allocation-recs'] });
      queryClient.invalidateQueries({ queryKey: ['inv-rebalance-suggestions'] });
    } catch (err: any) {
      toast.error(`Lỗi backfill size: ${err.message}`);
    } finally {
      setIsBackfilling(false);
    }
  }, [tenantId, queryClient]);

  const handleRecalcTier = useCallback(async () => {
    if (!tenantId) return;
    setIsRecalcTier(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-tier-stores', {
        body: { tenant_id: tenantId },
      });
      if (error) throw error;
      const changes = data?.tier_changes || 0;
      toast.success(`Đã cập nhật tier cho ${data?.total_stores || 0} cửa hàng (${changes} thay đổi)`);
      queryClient.invalidateQueries({ queryKey: ['inv-stores'] });
    } catch (err: any) {
      toast.error(`Lỗi tính tier: ${err.message}`);
    } finally {
      setIsRecalcTier(false);
    }
  }, [tenantId, queryClient]);

  const handleApprove = (ids: string[], editedQty?: Record<string, number>) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'approved', editedQty });
  };

  const handleReject = (ids: string[]) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'rejected' });
  };

  const isRunning = runRebalance.isPending || runAllocate.isPending || runRecall.isPending;

  return (
    <>
      <Helmet>
        <title>Inventory Allocation Engine | Bluecore FDP</title>
        <meta name="description" content="Phân bổ và cân bằng tồn kho giữa kho tổng và các kho con" />
      </Helmet>

      <div className="space-y-6">
        <InventoryHeroHeader suggestions={allSuggestions} storeCapacityData={stores.map((s: any) => ({ store_name: s.store_name, total_on_hand: s.total_on_hand || 0, capacity: s.capacity || 0 }))} />
        <CapacityOptimizationCard stores={stores.map((s: any) => ({ id: s.id, store_name: s.store_name, tier: s.tier || 'C', total_on_hand: s.total_on_hand || 0, capacity: s.capacity || 0, utilization: s.capacity > 0 ? (s.total_on_hand || 0) / s.capacity : 0 }))} />

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            {latestAllocRun && (
              <p className="text-xs text-muted-foreground">
                Allocation gần nhất: {new Date(latestAllocRun.created_at).toLocaleString('vi-VN')}
                {latestAllocRun.status === 'completed' && ` • ${latestAllocRun.total_recommendations || allocRecs.length} đề xuất`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasMissingSize && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackfillSize}
                disabled={isBackfilling}
                className="gap-2"
              >
                <Wand2 className={`h-4 w-4 ${isBackfilling ? 'animate-spin' : ''}`} />
                {isBackfilling ? 'Đang tách size...' : 'Tách theo Size'}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isRunning} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                  {isRunning ? 'Đang chạy...' : 'Chạy Engine'}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => runAllocate.mutate('V1')} className="gap-2">
                  <Layers className="h-4 w-4" />
                  V1: Phủ nền theo BST
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAllocate.mutate('V2')} className="gap-2">
                  <Target className="h-4 w-4" />
                  V2: Chia theo nhu cầu CH
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runAllocate.mutate('both')} className="gap-2">
                  <Package className="h-4 w-4" />
                  V1 + V2 (đầy đủ)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runRebalance.mutate()} className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Rebalance (cân bằng)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRecalcTier} disabled={isRecalcTier} className="gap-2">
                  <Crown className="h-4 w-4" />
                  {isRecalcTier ? 'Đang tính...' : 'Tính lại Tier (S/A/B/C)'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => runRecall.mutate()} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Thu hồi hàng hóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <RebalanceSummaryCards suggestions={allSuggestions} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transfer" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Lệnh Điều Chuyển
              {allSuggestions.filter(s => s.status === 'pending' && s.transfer_type !== 'recall').length > 0 && (
                <span className="text-xs bg-red-500/15 text-red-400 px-1.5 rounded-full font-semibold">
                  {allSuggestions.filter(s => s.status === 'pending' && s.transfer_type !== 'recall').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="recall" className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Thu hồi
              {allSuggestions.filter(s => s.status === 'pending' && s.transfer_type === 'recall').length > 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 rounded-full font-semibold">
                  {allSuggestions.filter(s => s.status === 'pending' && s.transfer_type === 'recall').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Mô phỏng
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="store-intel" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Store Intel
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfer">
            <DailyTransferOrder
              suggestions={allSuggestions.filter(s => s.transfer_type !== 'recall')}
              storeMap={storeMap}
              fcNameMap={fcNameMap}
              stores={stores.map((s: any) => ({ id: s.id, store_name: s.store_name, total_on_hand: s.total_on_hand || 0, capacity: s.capacity || 0, total_sold: s.total_sold || 0 }))}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>
          <TabsContent value="recall">
            <RecallOrderPanel
              suggestions={allSuggestions}
              storeMap={storeMap}
              fcNameMap={fcNameMap}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>
          <TabsContent value="simulation">
            <RebalanceSimulationTab suggestions={allSuggestions} />
          </TabsContent>
          <TabsContent value="audit">
            <RebalanceAuditLog />
          </TabsContent>
          <TabsContent value="store-intel">
            <StoreIntelligenceTab />
          </TabsContent>
          <TabsContent value="config">
            <div className="space-y-6">
              <RebalanceConfigPanel />
              <StoreDirectoryTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
