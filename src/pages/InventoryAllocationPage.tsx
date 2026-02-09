import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, ArrowRightLeft, Settings2, BarChart3, History, LayoutGrid, Table2 } from 'lucide-react';
import { InventoryHeroHeader } from '@/components/inventory/InventoryHeroHeader';
import { RebalanceSummaryCards } from '@/components/inventory/RebalanceSummaryCards';
import { RebalanceBoardTable } from '@/components/inventory/RebalanceBoardTable';
import { InventoryFCDecisionCards } from '@/components/inventory/InventoryFCDecisionCards';
import { RebalanceConfigPanel } from '@/components/inventory/RebalanceConfigPanel';
import { RebalanceSimulationTab } from '@/components/inventory/RebalanceSimulationTab';
import { RebalanceAuditLog } from '@/components/inventory/RebalanceAuditLog';
import { useRebalanceSuggestions, useLatestRebalanceRun } from '@/hooks/inventory/useRebalanceSuggestions';
import { useRunRebalance } from '@/hooks/inventory/useRunRebalance';
import { useApproveRebalance } from '@/hooks/inventory/useApproveRebalance';

export default function InventoryAllocationPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data: latestRun } = useLatestRebalanceRun();
  const { data: suggestions = [], isLoading } = useRebalanceSuggestions(latestRun?.id);
  const runRebalance = useRunRebalance();
  const approveRebalance = useApproveRebalance();

  const handleApprove = (ids: string[], editedQty?: Record<string, number>) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'approved', editedQty });
  };

  const handleReject = (ids: string[]) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'rejected' });
  };

  return (
    <>
      <Helmet>
        <title>Inventory Allocation Engine | Bluecore FDP</title>
        <meta name="description" content="Phân bổ và cân bằng tồn kho giữa kho tổng và các kho con" />
      </Helmet>

      <div className="space-y-6">
        {/* Hero Header */}
        <InventoryHeroHeader suggestions={suggestions} />

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
            {/* View Toggle */}
            {(activeTab === 'all' || activeTab === 'push' || activeTab === 'lateral') && (
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
            <Button
              onClick={() => runRebalance.mutate()}
              disabled={runRebalance.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${runRebalance.isPending ? 'animate-spin' : ''}`} />
              {runRebalance.isPending ? 'Đang quét...' : 'Chạy Quét'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <RebalanceSummaryCards suggestions={suggestions} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              Tất cả
              {suggestions.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{suggestions.length}</span>
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
          </TabsList>

          <TabsContent value="all">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards
                suggestions={suggestions}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <RebalanceBoardTable
                suggestions={suggestions}
                onApprove={handleApprove}
                onReject={handleReject}
                transferType="all"
              />
            )}
          </TabsContent>
          <TabsContent value="push">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards
                suggestions={suggestions.filter(s => s.transfer_type === 'push')}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <RebalanceBoardTable
                suggestions={suggestions}
                onApprove={handleApprove}
                onReject={handleReject}
                transferType="push"
              />
            )}
          </TabsContent>
          <TabsContent value="lateral">
            {viewMode === 'cards' ? (
              <InventoryFCDecisionCards
                suggestions={suggestions.filter(s => s.transfer_type === 'lateral')}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <RebalanceBoardTable
                suggestions={suggestions}
                onApprove={handleApprove}
                onReject={handleReject}
                transferType="lateral"
              />
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
        </Tabs>
      </div>
    </>
  );
}
