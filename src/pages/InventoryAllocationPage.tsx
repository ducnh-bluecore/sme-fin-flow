import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Package, ArrowRightLeft, Settings2 } from 'lucide-react';
import { RebalanceSummaryCards } from '@/components/inventory/RebalanceSummaryCards';
import { RebalanceBoardTable } from '@/components/inventory/RebalanceBoardTable';
import { RebalanceDecisionCard } from '@/components/inventory/RebalanceDecisionCard';
import { RebalanceConfigPanel } from '@/components/inventory/RebalanceConfigPanel';
import { useRebalanceSuggestions, useLatestRebalanceRun } from '@/hooks/inventory/useRebalanceSuggestions';
import { useRunRebalance } from '@/hooks/inventory/useRunRebalance';
import { useApproveRebalance } from '@/hooks/inventory/useApproveRebalance';

export default function InventoryAllocationPage() {
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: latestRun } = useLatestRebalanceRun();
  const { data: suggestions = [], isLoading } = useRebalanceSuggestions(latestRun?.id);
  const runRebalance = useRunRebalance();
  const approveRebalance = useApproveRebalance();

  const handleApprove = (ids: string[]) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'approved' });
  };

  const handleReject = (ids: string[]) => {
    approveRebalance.mutate({ suggestionIds: ids, action: 'rejected' });
  };

  const handleApproveAllP1 = () => {
    const p1Pending = suggestions.filter(s => s.priority === 'P1' && s.status === 'pending');
    if (p1Pending.length > 0) {
      approveRebalance.mutate({ suggestionIds: p1Pending.map(s => s.id), action: 'approved' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Inventory Allocation Engine | Bluecore FDP</title>
        <meta name="description" content="Phân bổ và cân bằng tồn kho giữa kho tổng và các kho con" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Rebalance Board</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Đề xuất phân bổ & cân bằng tồn kho hàng ngày
              {latestRun && (
                <span className="ml-2 text-xs">
                  • Lần quét gần nhất: {new Date(latestRun.created_at).toLocaleString('vi-VN')}
                  {latestRun.status === 'completed' && ` • ${latestRun.total_suggestions} đề xuất`}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => runRebalance.mutate()}
            disabled={runRebalance.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${runRebalance.isPending ? 'animate-spin' : ''}`} />
            {runRebalance.isPending ? 'Đang quét...' : 'Chạy Quét'}
          </Button>
        </div>

        {/* Summary Cards */}
        <RebalanceSummaryCards suggestions={suggestions} />

        {/* Decision Card */}
        <RebalanceDecisionCard
          suggestions={suggestions}
          onApproveAllP1={handleApproveAllP1}
          isApproving={approveRebalance.isPending}
        />

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
              {suggestions.filter(s => s.transfer_type === 'push').length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 rounded-full">
                  {suggestions.filter(s => s.transfer_type === 'push').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lateral" className="gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Giữa các kho
              {suggestions.filter(s => s.transfer_type === 'lateral').length > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 rounded-full">
                  {suggestions.filter(s => s.transfer_type === 'lateral').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Cấu hình
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <RebalanceBoardTable
              suggestions={suggestions}
              onApprove={handleApprove}
              onReject={handleReject}
              transferType="all"
            />
          </TabsContent>
          <TabsContent value="push">
            <RebalanceBoardTable
              suggestions={suggestions}
              onApprove={handleApprove}
              onReject={handleReject}
              transferType="push"
            />
          </TabsContent>
          <TabsContent value="lateral">
            <RebalanceBoardTable
              suggestions={suggestions}
              onApprove={handleApprove}
              onReject={handleReject}
              transferType="lateral"
            />
          </TabsContent>
          <TabsContent value="config">
            <RebalanceConfigPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
