import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Wallet, RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle, Clock } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { CashForecastChart } from '@/components/dashboard/CashForecastChart';
import { ARAgingChart } from '@/components/dashboard/ARAgingChart';

import { OverdueInvoicesTable } from '@/components/dashboard/OverdueInvoicesTable';
import { ScenarioPlanner } from '@/components/dashboard/ScenarioPlanner';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { AIUsagePanel } from '@/components/dashboard/AIUsagePanel';
import FinancialTruthCard from '@/components/dashboard/FinancialTruthCard';

import { useAllProblematicSKUs } from '@/hooks/useAllProblematicSKUs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatVNDCompact } from '@/lib/formatters';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useCashRunway } from '@/hooks/useCashRunway';
import { useCashForecasts } from '@/hooks/useDashboardData';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickDateSelector } from '@/components/filters/DateRangeFilter';
import { DateRangeIndicator } from '@/components/shared/DateRangeIndicator';

function ChartErrorFallback({ t }: { t: (key: string) => string }) {
  return (
    <div className="data-card flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">{t('cfo.chartError')}</p>
      </div>
    </div>
  );
}

export default function CFODashboard() {
  const { dateRange, setDateRange, refreshAllData } = useDateRange();
  const { data: metrics, isLoading } = useCentralFinancialMetrics();
  const { data: cashRunway, isLoading: isLoadingRunway } = useCashRunway();
  const { data: cashForecasts } = useCashForecasts();
  const { data: problematicSKUs } = useAllProblematicSKUs();
  const { t } = useLanguage();

  const handleRefresh = useMemo(() => {
    return () => {
      refreshAllData();
    };
  }, [refreshAllData]);

  // Enable realtime updates for dashboard data
  useRealtimeDashboard();

  // Calculate real trends from data
  const trends = useMemo(() => {
    // Cash trend - compare current cash position with 7-day forecast
    const currentCash = metrics?.cashOnHand || 0;
    const cash7Days = cashForecasts?.[6]?.closing_balance || currentCash;
    const cashTrend = currentCash > 0 ? ((cash7Days - currentCash) / currentCash) * 100 : 0;

    // AR trend - calculate from current vs previous period overdue
    // Without historical data, show 0 (no fake trends)
    const arTrend = 0; // Will be calculated when we have historical comparison

    // CCC trend - compare current with industry benchmark
    const cccCurrent = metrics?.ccc || 0;
    const cccBenchmark = 45; // Industry benchmark from financial-constants
    const cccTrend = cccBenchmark > 0 ? ((cccBenchmark - cccCurrent) / cccBenchmark) * 100 : 0;

    return {
      cash: cashTrend,
      cash7Days: cashTrend,
      ar: arTrend,
      ccc: cccTrend
    };
  }, [metrics, cashForecasts]);

  // Use cashNext7Days from centralized metrics (properly calculated from forecast)
  const cashNext7Days = useMemo(() => {
    // Primary: Use centralized metric which calculates from AR/AP forecast
    if (metrics?.cashNext7Days && metrics.cashNext7Days !== metrics.cashOnHand) {
      return metrics.cashNext7Days;
    }
    // Fallback: Use cash_forecasts table data
    if (cashForecasts && cashForecasts.length > 0) {
      const day7Forecast = cashForecasts[6] || cashForecasts[cashForecasts.length - 1];
      return day7Forecast?.closing_balance || metrics?.cashOnHand || 0;
    }
    // Final fallback: current cash
    return metrics?.cashOnHand || 0;
  }, [cashForecasts, metrics]);

  // Format runway display
  const formatRunway = () => {
    if (!cashRunway?.hasEnoughData) return t('cfo.notEnoughData');
    if (cashRunway.runwayMonths === null) return 'N/A';
    if (cashRunway.runwayMonths === Infinity) return '∞';
    if (cashRunway.runwayMonths < 1) return `${cashRunway.runwayDays} ${t('cfo.days')}`;
    return `${cashRunway.runwayMonths.toFixed(1)} ${t('cashDirect.months')}`;
  };

  const getRunwayVariant = () => {
    if (!cashRunway?.hasEnoughData || cashRunway.runwayMonths === null) return 'default';
    if (cashRunway.runwayMonths === Infinity) return 'success';
    if (cashRunway.runwayMonths < FDP_THRESHOLDS.RUNWAY_CRITICAL_MONTHS) return 'danger';
    if (cashRunway.runwayMonths < FDP_THRESHOLDS.RUNWAY_WARNING_MONTHS) return 'warning';
    return 'success';
  };

  return (
    <>
      <Helmet>
        <title>{t('cfo.pageTitle')}</title>
        <meta name="description" content={t('cfo.pageDesc')} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('cfo.title')}
            </h1>
            <p className="text-muted-foreground">{t('cfo.subtitle')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <QuickDateSelector value={dateRange} onChange={setDateRange} />
              <motion.button
                type="button"
                onClick={handleRefresh}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow-glow"
                aria-label={t('cfo.refreshData')}
              >
                <RefreshCw className="w-4 h-4" />
                {t('cfo.refreshData')}
              </motion.button>
            </div>
            <DateRangeIndicator variant="compact" />
          </div>
        </motion.div>

        {/* Financial Truth - Single Source of Truth */}
        <FinancialTruthCard />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {isLoading || isLoadingRunway ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <KPICard
                title={t('cfo.cashToday')}
                value={formatVNDCompact(metrics?.cashOnHand || 0)}
                trend={trends.cash !== 0 ? { value: Number(trends.cash.toFixed(1)), label: t('cfo.vsYesterday') } : undefined}
                icon={Wallet}
                variant="success"
              />
              <KPICard
                title={t('cfo.cashRunway')}
                value={formatRunway()}
                trend={cashRunway?.hasEnoughData ? { 
                  value: cashRunway.avgMonthlyBurn > 0 ? -Math.round(cashRunway.avgMonthlyBurn / 1000000) : 0, 
                  label: t('cfo.burnPerMonth')
                } : undefined}
                icon={Clock}
                variant={getRunwayVariant()}
              />
              <KPICard
                title={t('cfo.cashNext7Days')}
                value={formatVNDCompact(cashNext7Days)}
                trend={trends.cash7Days !== 0 ? { value: Number(trends.cash7Days.toFixed(1)) } : undefined}
                icon={ArrowUpRight}
              />
              <KPICard
                title={t('cfo.overdueAR')}
                value={formatVNDCompact(metrics?.overdueAR || 0)}
                trend={trends.ar !== 0 ? { value: Number(trends.ar.toFixed(1)) } : undefined}
                icon={ArrowDownRight}
                variant="warning"
              />
              <KPICard
                title={t('cfo.ccc')}
                value={`${metrics?.ccc || 0} ${t('cfo.days')}`}
                trend={trends.ccc !== 0 ? { value: Number(trends.ccc.toFixed(1)) } : undefined}
                icon={RefreshCw}
              />
            </>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.dso')}</p>
            <p className="text-2xl font-bold text-foreground">{metrics?.dso || 0}</p>
            <p className="text-xs text-muted-foreground">{t('cfo.days')}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.grossMargin')}</p>
            <p className="text-2xl font-bold text-success">{metrics?.grossMargin?.toFixed(1) || 0}%</p>
            <p className="text-xs text-muted-foreground">Rev - COGS</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
            <p className="text-2xl font-bold text-primary">{metrics?.contributionMargin?.toFixed(1) || 0}%</p>
            <p className="text-xs text-muted-foreground">Rev - COGS - Variable</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.ebitdaMargin')}</p>
            <p className="text-2xl font-bold text-primary">{metrics?.ebitdaMargin?.toFixed(1) || 0}%</p>
            <p className="text-xs text-muted-foreground">{t('cfo.thisPeriod')}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.ebitda')}</p>
            <p className="text-2xl font-bold text-foreground">{formatVNDCompact(metrics?.ebitda || 0)}</p>
            <p className="text-xs text-muted-foreground">{t('cfo.thisPeriod')}</p>
          </motion.div>
        </div>

        {/* AI Insights Panel */}
        <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
          <AIInsightsPanel />
        </ErrorBoundary>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
              <CashForecastChart />
            </ErrorBoundary>
          </div>
          <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
            <ARAgingChart />
          </ErrorBoundary>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
            <OverdueInvoicesTable limit={5} />
          </ErrorBoundary>
          <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
            <ScenarioPlanner />
          </ErrorBoundary>
        </div>

        {/* AI Usage Panel - Bottom */}
        <ErrorBoundary fallback={<ChartErrorFallback t={t} />}>
          <AIUsagePanel />
        </ErrorBoundary>
      </div>
    </>
  );
}
