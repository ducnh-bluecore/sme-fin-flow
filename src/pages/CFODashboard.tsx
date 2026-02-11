import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  Wallet, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  TrendingDown,
  ArrowRight,
  FileText,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DecisionCard, 
  DecisionCardList,
  DecisionSummaryCard,
} from '@/components/decisions';
import { CashForecastChart } from '@/components/dashboard/CashForecastChart';
import { ARAgingChart } from '@/components/dashboard/ARAgingChart';
import { OverdueInvoicesTable } from '@/components/dashboard/OverdueInvoicesTable';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
// ✅ CANONICAL HOOK - DB-first, no client-side calculations
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useCashRunway } from '@/hooks/useCashRunway';
import { useCashForecasts } from '@/hooks/useDashboardData';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════
// CFO DASHBOARD - Decision-First, Not Dashboard-First
// Shows: Top financial risks, Reconciliation health, Cash & liquidity exceptions
// Uses Decision Cards as primary unit
// ═══════════════════════════════════════════════════════════════════

function ChartErrorFallback({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-card rounded-lg border border-border flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{t('cfo.chartError')}</p>
      </div>
    </div>
  );
}

// Financial Summary Card
function FinancialSummaryCard({ 
  label, 
  value, 
  subtext, 
  variant = 'default',
  noData = false,
}: { 
  label: string; 
  value: string; 
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  noData?: boolean;
}) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <div className="text-center">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      {noData ? (
        <div className="text-sm text-muted-foreground/60 italic">Chưa kết nối</div>
      ) : (
        <div className={`text-xl font-semibold tabular-nums ${variantStyles[variant]}`}>
          {value}
        </div>
      )}
      {subtext && !noData && (
        <div className="text-xs text-muted-foreground mt-0.5">{subtext}</div>
      )}
    </div>
  );
}

export default function CFODashboard() {
  const navigate = useNavigate();
  const { dateRange, setDateRange, refreshAllData } = useDateRange();
  // ✅ CANONICAL: Finance metrics from precomputed snapshot
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();
  const { data: cashRunway, isLoading: isLoadingRunway } = useCashRunway();
  const { data: cashForecasts } = useCashForecasts();
  const { t } = useLanguage();

  // Enable realtime updates for dashboard data
  useRealtimeDashboard();

  // Cash 7-day from snapshot (precomputed in DB)
  const cashNext7Days = useMemo(() => {
    // ✅ Using precomputed value from snapshot
    if (snapshot?.cash7dForecast) {
      return snapshot.cash7dForecast;
    }
    if (cashForecasts && cashForecasts.length > 0) {
      const day7Forecast = cashForecasts[6] || cashForecasts[cashForecasts.length - 1];
      return day7Forecast?.closing_balance || snapshot?.cashToday || 0;
    }
    return snapshot?.cashToday || 0;
  }, [cashForecasts, snapshot]);

  // Format runway display
  const formatRunway = () => {
    if (!cashRunway?.hasEnoughData) return t('cfo.notEnoughData');
    if (cashRunway.runwayMonths === null) return 'N/A';
    if (cashRunway.runwayMonths === Infinity) return '∞';
    if (cashRunway.runwayMonths < 1) return `${cashRunway.runwayDays} ${t('cfo.days')}`;
    return `${cashRunway.runwayMonths.toFixed(1)} ${t('cashDirect.months')}`;
  };

  const getRunwayVariant = (): 'success' | 'warning' | 'danger' | 'default' => {
    if (!cashRunway?.hasEnoughData || cashRunway.runwayMonths === null) return 'default';
    if (cashRunway.runwayMonths === Infinity) return 'success';
    if (cashRunway.runwayMonths < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) return 'danger';
    if (cashRunway.runwayMonths < FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS) return 'warning';
    return 'success';
  };

  // Generate Decision Cards from precomputed snapshot data (NO CALCULATIONS)
  const financialDecisions = useMemo(() => {
    const decisions = [];
    
    // Check Overdue AR - using precomputed snapshot values
    if (snapshot?.overdueAR && snapshot.overdueAR > 0) {
      decisions.push({
        id: 'overdue-ar',
        statement: `${formatVNDCompact(snapshot.overdueAR)} in overdue receivables requires collection action`,
        context: 'Aging analysis shows concentration in 30-60 day bucket',
        severity: snapshot.overdueAR > 1000000000 ? 'critical' : 'warning' as const,
        confidence: 'confirmed' as const,
        impacts: [
          { type: 'cash' as const, label: 'Cash Impact', value: formatVNDCompact(snapshot.overdueAR), trend: 'negative' as const },
          { type: 'risk' as const, label: 'Collection Risk', value: 'Medium' },
        ],
        actions: [
          { id: 'investigate', label: 'View AR Aging', variant: 'primary' as const, onClick: () => navigate('/ar-operations') },
          { id: 'assign', label: 'Assign Owner', variant: 'outline' as const },
        ],
      });
    }

    // Check Cash Runway - using precomputed snapshot
    const runwayMonths = snapshot?.cashRunwayMonths || cashRunway?.runwayMonths;
    if (runwayMonths !== null && runwayMonths !== undefined && runwayMonths < FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS) {
      decisions.push({
        id: 'runway-warning',
        statement: `Cash runway is ${formatRunway()} - below ${FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS} month threshold`,
        context: `Average monthly burn rate: ${formatVNDCompact(cashRunway?.avgMonthlyBurn || 0)}`,
        severity: runwayMonths < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS ? 'critical' : 'warning' as const,
        confidence: 'confirmed' as const,
        impacts: [
          { type: 'cash' as const, label: 'Current Cash', value: formatVNDCompact(snapshot?.cashToday || 0) },
          { type: 'risk' as const, label: 'Monthly Burn', value: formatVNDCompact(cashRunway?.avgMonthlyBurn || 0), trend: 'negative' as const },
        ],
        actions: [
          { id: 'forecast', label: 'View Cash Forecast', variant: 'primary' as const, onClick: () => navigate('/cash-forecast') },
          { id: 'scenario', label: 'Run Scenario', variant: 'outline' as const, onClick: () => navigate('/scenario') },
        ],
      });
    }

    // Check Contribution Margin - using precomputed snapshot
    const cmPercent = snapshot?.contributionMarginPercent;
    if (cmPercent !== undefined && cmPercent < 20) {
      decisions.push({
        id: 'margin-warning',
        statement: `Contribution margin at ${cmPercent.toFixed(1)}% - below healthy threshold`,
        context: 'Review variable costs and pricing strategy',
        severity: cmPercent < 10 ? 'critical' : 'warning' as const,
        confidence: 'confirmed' as const,
        impacts: [
          { type: 'margin' as const, label: 'CM %', value: `${cmPercent.toFixed(1)}%`, trend: 'negative' as const },
          { type: 'cash' as const, label: 'Gross Margin', value: `${(snapshot?.grossMarginPercent || 0).toFixed(1)}%` },
        ],
        actions: [
          { id: 'unit-econ', label: 'Unit Economics', variant: 'primary' as const, onClick: () => navigate('/unit-economics') },
        ],
      });
    }

    return decisions;
  }, [snapshot, cashRunway, navigate, formatRunway, t]);

  const handleRefresh = useMemo(() => {
    return () => refreshAllData();
  }, [refreshAllData]);

  return (
    <>
      <Helmet>
        <title>{t('cfo.pageTitle')} | Bluecore FDP</title>
        <meta name="description" content={t('cfo.pageDesc')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {t('cfo.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Decision-first financial overview • {t('cfo.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <QuickDateSelector value={dateRange} onChange={setDateRange} />
            <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Financial Truth Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Financial Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || isLoadingRunway ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {/* Always-available metrics first */}
                <FinancialSummaryCard 
                  label="Net Revenue" 
                  value={formatVNDCompact(snapshot?.netRevenue || 0)}
                  variant="success"
                  noData={!snapshot?.netRevenue}
                />
                <FinancialSummaryCard 
                  label="Gross Profit" 
                  value={formatVNDCompact(snapshot?.grossProfit || 0)}
                  subtext={`GM ${(snapshot?.grossMarginPercent || 0).toFixed(1)}%`}
                  noData={!snapshot?.grossProfit && !snapshot?.grossMarginPercent}
                />
                <FinancialSummaryCard 
                  label="Total Orders" 
                  value={(snapshot?.totalOrders || 0).toLocaleString()}
                />
                <FinancialSummaryCard 
                  label="AOV" 
                  value={formatVNDCompact(snapshot?.avgOrderValue || 0)}
                />
                {/* Cash & AR metrics - may not be connected */}
                <FinancialSummaryCard 
                  label="Cash Today" 
                  value={formatVNDCompact(snapshot?.cashToday || 0)}
                  variant="success"
                  noData={!snapshot?.dataQuality?.hasCashData}
                />
                <FinancialSummaryCard 
                  label="Cash Runway" 
                  value={formatRunway()}
                  variant={getRunwayVariant()}
                  noData={!snapshot?.dataQuality?.hasCashData}
                />
                <FinancialSummaryCard 
                  label="Overdue AR" 
                  value={formatVNDCompact(snapshot?.overdueAR || 0)}
                  variant={snapshot?.overdueAR && snapshot.overdueAR > 0 ? 'warning' : 'default'}
                  noData={!snapshot?.dataQuality?.hasARData}
                />
                <FinancialSummaryCard 
                  label="Inventory" 
                  value={formatVNDCompact(snapshot?.totalInventoryValue || 0)}
                  noData={!snapshot?.dataQuality?.hasInventoryData}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two Column Layout: Decisions + Context */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Column: Decisions (70%) */}
          <div className="lg:col-span-2 space-y-4">
            <DecisionCardList
              title="Financial Decisions Required"
              description="Issues requiring immediate attention"
              isEmpty={financialDecisions.length === 0}
              emptyMessage="No critical financial decisions pending"
            >
              {financialDecisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  id={decision.id}
                  statement={decision.statement}
                  context={decision.context}
                  severity={decision.severity}
                  confidence={decision.confidence}
                  impacts={decision.impacts}
                  actions={decision.actions}
                />
              ))}
            </DecisionCardList>

            {/* Overdue Invoices - Action Items */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    Overdue Invoices
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/ar-operations')} className="gap-1 text-xs">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
                  <OverdueInvoicesTable limit={5} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Right Rail: Context (30%) */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2" 
                  size="sm"
                  onClick={() => navigate('/reconciliation')}
                >
                  <FileText className="h-4 w-4" />
                  Reconciliation Center
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2" 
                  size="sm"
                  onClick={() => navigate('/cash-forecast')}
                >
                  <TrendingDown className="h-4 w-4" />
                  Cash Forecast
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2" 
                  size="sm"
                  onClick={() => navigate('/unit-economics')}
                >
                  <Wallet className="h-4 w-4" />
                  Unit Economics
                </Button>
              </CardContent>
            </Card>

            {/* AR Aging Chart */}
            <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
              <ARAgingChart />
            </ErrorBoundary>

            {/* Cash Forecast Mini */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">7-Day Cash Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
                  <div className="h-48">
                    <CashForecastChart />
                  </div>
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
