import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useRefreshFinanceSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';

// Retail Command Center Components
import { RetailHealthHero } from '@/components/dashboard/RetailHealthHero';
import { MoneyEngineCards } from '@/components/dashboard/MoneyEngineCards';
import { ChannelWarChart } from '@/components/dashboard/ChannelWarChart';
import { InventoryRiskPanel } from '@/components/dashboard/InventoryRiskPanel';
import { CashVelocityPanel } from '@/components/dashboard/CashVelocityPanel';
import { RetailDecisionFeed } from '@/components/dashboard/RetailDecisionFeed';

// ═══════════════════════════════════════════════════════════════════
// BLUECORE RETAIL COMMAND CENTER v1
// "Retail machine đang khỏe hay đang chết ở đâu?"
// Not financial reporting. This is a Retail Operating Console.
// ═══════════════════════════════════════════════════════════════════

function SectionErrorFallback() {
  return (
    <div className="bg-card rounded-lg border border-border flex items-center justify-center h-40">
      <p className="text-sm text-muted-foreground">Không thể tải dữ liệu section này</p>
    </div>
  );
}

export default function CFODashboard() {
  const { dateRange, setDateRange, refreshAllData } = useDateRange();
  const { t } = useLanguage();
  const refreshSnapshot = useRefreshFinanceSnapshot();

  useRealtimeDashboard();

  const handleRefresh = useMemo(() => () => {
    refreshAllData();
    refreshSnapshot.mutate();
  }, [refreshAllData, refreshSnapshot]);

  return (
    <>
      <Helmet>
        <title>Retail Command Center | Bluecore</title>
        <meta name="description" content="Retail Operating Console - Decision-first overview for retail CFO/COO" />
      </Helmet>

      <div className="space-y-5">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Retail Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Are we operating a healthy retail machine?
            </p>
          </div>
          <div className="flex items-center gap-3">
            <QuickDateSelector value={dateRange} onChange={setDateRange} />
            <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2" disabled={refreshSnapshot.isPending}>
              {refreshSnapshot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {refreshSnapshot.isPending ? 'Đang tính...' : 'Refresh'}
            </Button>
          </div>
        </header>

        {/* HERO: Retail Health Score */}
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <RetailHealthHero />
        </ErrorBoundary>

        {/* SECTION 1: Money Engine */}
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <MoneyEngineCards />
        </ErrorBoundary>

        {/* SECTION 2+3: Channel War + Inventory Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <ChannelWarChart />
          </ErrorBoundary>
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <InventoryRiskPanel />
          </ErrorBoundary>
        </div>

        {/* SECTION 4+5: Cash Velocity + Decision Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <CashVelocityPanel />
          </ErrorBoundary>
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <RetailDecisionFeed />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
