import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, ArrowRightLeft, Settings2, BarChart3, History, LayoutGrid, Table2, ChevronDown, Layers, Target, Crown, Store } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InventoryHeroHeader } from '@/components/inventory/InventoryHeroHeader';
import { CapacityOptimizationCard } from '@/components/inventory/CapacityOptimizationCard';
import { RebalanceSummaryCards } from '@/components/inventory/RebalanceSummaryCards';
import { RebalanceBoardTable } from '@/components/inventory/RebalanceBoardTable';
import { InventoryFCDecisionCards } from '@/components/inventory/InventoryFCDecisionCards';
import { RebalanceConfigPanel } from '@/components/inventory/RebalanceConfigPanel';
import { RebalanceSimulationTab } from '@/components/inventory/RebalanceSimulationTab';
import { RebalanceAuditLog } from '@/components/inventory/RebalanceAuditLog';
import { StoreDirectoryTab } from '@/components/inventory/StoreDirectoryTab';
import { useRebalanceSuggestions, useLatestRebalanceRun } from '@/hooks/inventory/useRebalanceSuggestions';
import { useAllocationRecommendations, useLatestAllocationRun } from '@/hooks/inventory/useAllocationRecommendations';
import { useRunRebalance, useRunAllocate } from '@/hooks/inventory/useRunRebalance';
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
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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
    }));
  }, [allocRecs]);

  // Combined suggestions for "all" tab
  const allSuggestions = useMemo(() => [...allocAsSuggestions, ...rebalanceSuggestions], [allocAsSuggestions, rebalanceSuggestions]);

  // V1/V2 filtered from allocation recs
  const v1Suggestions = useMemo(() => allocAsSuggestions.filter(s => s.reason?.startsWith('V1:')), [allocAsSuggestions]);
  const v2Suggestions = useMemo(() => allocAsSuggestions.filter(s => s.reason?.startsWith('V2:')), [allocAsSuggestions]);
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
  const approveRebalance = useApproveRebalance();
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();
  const [isRecalcTier, setIsRecalcTier] = useState(false);

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

  const isRunning = runRebalance.isPending || runAllocate.isPending;

  const showViewToggle = ['all', 'v1', 'v2', 'push', 'lateral'].includes(activeTab);

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
            {showViewToggle && (
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Run Dropdown: V1, V2, V1+V2, Rebalance */}
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <RebalanceSummaryCards suggestions={allSuggestions} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Tất cả
              {allSuggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{allSuggestions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="v1" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              V1: Phủ nền
              {v1Suggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{v1Suggestions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="v2" className="gap-1.5">
              <Target className="h-3.5 w-3.5" />
              V2: Nhu cầu
              {v2Suggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{v2Suggestions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="push" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Từ kho tổng
            </TabsTrigger>
            <TabsTrigger value="lateral" className="gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Giữa các kho
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Mô phỏng
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Cửa hàng
            </TabsTrigger>
          </TabsList>

          {/* All suggestions */}
          <TabsContent value="all">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={allSuggestions} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={allSuggestions} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* V1: Phủ nền */}
          <TabsContent value="v1">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={v1Suggestions} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={v1Suggestions} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* V2: Nhu cầu */}
          <TabsContent value="v2">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={v2Suggestions} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={v2Suggestions} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* Push from CW — uses allocAsSuggestions (allocation recommendations) */}
          <TabsContent value="push">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={allocAsSuggestions} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={allocAsSuggestions} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* Lateral */}
          <TabsContent value="lateral">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={rebalanceSuggestions.filter(s => s.transfer_type === 'lateral')} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={rebalanceSuggestions} onApprove={handleApprove} onReject={handleReject} transferType="lateral" storeMap={storeMap} />
            )}
          </TabsContent>

          <TabsContent value="simulation">
            <RebalanceSimulationTab suggestions={allSuggestions} />
          </TabsContent>
          <TabsContent value="audit">
            <RebalanceAuditLog />
          </TabsContent>
          <TabsContent value="config">
            <RebalanceConfigPanel />
          </TabsContent>
          <TabsContent value="stores">
            <StoreDirectoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
