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

export default function InventoryAllocationPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data: latestRun } = useLatestRebalanceRun();
  const { data: suggestions = [], isLoading } = useRebalanceSuggestions(latestRun?.id);
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
        <InventoryHeroHeader suggestions={suggestions} storeCapacityData={stores.map((s: any) => ({ store_name: s.store_name, total_on_hand: s.total_on_hand || 0, capacity: s.capacity || 0 }))} />
        <CapacityOptimizationCard stores={stores.map((s: any) => ({ id: s.id, store_name: s.store_name, tier: s.tier || 'C', total_on_hand: s.total_on_hand || 0, capacity: s.capacity || 0, utilization: s.capacity > 0 ? (s.total_on_hand || 0) / s.capacity : 0 }))} />

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            {latestRun && (
              <p className="text-xs text-muted-foreground">
                Lần quét gần nhất: {new Date(latestRun.created_at).toLocaleString('vi-VN')}
                {latestRun.status === 'completed' && ` • ${latestRun.total_suggestions} đề xuất`}
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

        <RebalanceSummaryCards suggestions={suggestions} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Tất cả
              {suggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{suggestions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="v1" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              V1: Phủ nền
            </TabsTrigger>
            <TabsTrigger value="v2" className="gap-1.5">
              <Target className="h-3.5 w-3.5" />
              V2: Nhu cầu
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
              <InventoryFCDecisionCards suggestions={suggestions} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={suggestions} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* V1: Phủ nền — filter by reason starting with "V1:" */}
          <TabsContent value="v1">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={suggestions.filter(s => s.reason?.startsWith('V1:'))} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={suggestions.filter(s => s.reason?.startsWith('V1:'))} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* V2: Nhu cầu — filter by reason starting with "V2:" */}
          <TabsContent value="v2">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={suggestions.filter(s => s.reason?.startsWith('V2:'))} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={suggestions.filter(s => s.reason?.startsWith('V2:'))} onApprove={handleApprove} onReject={handleReject} transferType="all" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* Push from CW */}
          <TabsContent value="push">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={suggestions.filter(s => s.transfer_type === 'push')} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={suggestions} onApprove={handleApprove} onReject={handleReject} transferType="push" storeMap={storeMap} />
            )}
          </TabsContent>

          {/* Lateral */}
          <TabsContent value="lateral">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards suggestions={suggestions.filter(s => s.transfer_type === 'lateral')} onApprove={handleApprove} onReject={handleReject} storeMap={storeMap} fcNameMap={fcNameMap} />
            ) : (
              <RebalanceBoardTable suggestions={suggestions} onApprove={handleApprove} onReject={handleReject} transferType="lateral" storeMap={storeMap} />
            )}
          </TabsContent>

          <TabsContent value="simulation">
            <RebalanceSimulationTab suggestions={suggestions} />
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
