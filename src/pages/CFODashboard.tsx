import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Wallet, RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle, Clock, Zap, ArrowRight } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { CashForecastChart } from '@/components/dashboard/CashForecastChart';
import { ARAgingChart } from '@/components/dashboard/ARAgingChart';

import { OverdueInvoicesTable } from '@/components/dashboard/OverdueInvoicesTable';
import { ScenarioPlanner } from '@/components/dashboard/ScenarioPlanner';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { AIUsagePanel } from '@/components/dashboard/AIUsagePanel';
import FinancialTruthCard from '@/components/dashboard/FinancialTruthCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAutoDecisionCards } from '@/hooks/useAutoDecisionCards';
import { useDecisionCards } from '@/hooks/useDecisionCards';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatVNDCompact } from '@/lib/formatters';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useCashRunway } from '@/hooks/useCashRunway';
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
  const { t } = useLanguage();

  // Get decision cards count from Command Center (single source of truth)
  const { data: dbCards } = useDecisionCards({ status: ['OPEN', 'IN_PROGRESS'] });
  const { data: autoCards } = useAutoDecisionCards();
  
  const urgentDecisionsCount = useMemo(() => {
    const dbP1 = (dbCards || []).filter(c => c.priority === 'P1').length;
    const autoP1 = (autoCards || []).filter(c => c.priority === 'P1').length;
    return dbP1 + autoP1;
  }, [dbCards, autoCards]);

  const totalDecisionsCount = (dbCards?.length || 0) + (autoCards?.length || 0);

  const handleRefresh = useMemo(() => {
    return () => {
      refreshAllData();
    };
  }, [refreshAllData]);

  // Enable realtime updates for dashboard data
  useRealtimeDashboard();

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

        {/* Quick Link to Command Center - Single Source of Truth for Decisions */}
        {totalDecisionsCount > 0 && (
          <Link to="/command-center">
            <Card className={`border-2 ${urgentDecisionsCount > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-primary/30 bg-primary/5'} hover:border-primary transition-colors cursor-pointer`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${urgentDecisionsCount > 0 ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                      <Zap className={`h-5 w-5 ${urgentDecisionsCount > 0 ? 'text-red-500' : 'text-primary'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Command Center</span>
                        <Badge variant={urgentDecisionsCount > 0 ? 'destructive' : 'secondary'}>
                          {totalDecisionsCount} quyết định
                        </Badge>
                        {urgentDecisionsCount > 0 && (
                          <Badge variant="destructive" className="animate-pulse">
                            {urgentDecisionsCount} P1 khẩn cấp
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Trung tâm điều hành quyết định — Nguồn dữ liệu duy nhất
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    Xem chi tiết
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

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
                trend={{ value: 5.2, label: t('cfo.vsYesterday') }}
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
                value={formatVNDCompact((metrics?.cashOnHand || 0) + (metrics?.cashFlow || 0))}
                trend={{ value: 12.3 }}
                icon={ArrowUpRight}
              />
              <KPICard
                title={t('cfo.overdueAR')}
                value={formatVNDCompact(metrics?.overdueAR || 0)}
                trend={{ value: -8.5 }}
                icon={ArrowDownRight}
                variant="warning"
              />
              <KPICard
                title={t('cfo.ccc')}
                value={`${metrics?.ccc || 0} ${t('cfo.days')}`}
                trend={{ value: -3 }}
                icon={RefreshCw}
              />
            </>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.dso')}</p>
            <p className="text-2xl font-bold text-foreground">{metrics?.dso || 0}</p>
            <p className="text-xs text-muted-foreground">{t('cfo.days')}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="data-card text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('cfo.grossMargin')}</p>
            <p className="text-2xl font-bold text-success">{metrics?.grossMargin?.toFixed(1) || 0}%</p>
            <p className="text-xs text-muted-foreground">{t('cfo.thisPeriod')}</p>
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
