import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { 
  Info,
  ChevronDown,
  FileSpreadsheet,
  AlertTriangle,
  ExternalLink,
  LayoutDashboard,
  BarChart3
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shared/PageHeader';
import { useScenarioBudgetData } from '@/hooks/useScenarioBudgetData';
import { ScenarioSelector } from '@/components/budget/ScenarioSelector';
import { BudgetOverviewPanel } from '@/components/budget/BudgetOverviewPanel';
import { MonthlyComparisonChart } from '@/components/budget/MonthlyComparisonChart';
import { QuarterlyComparisonTable } from '@/components/budget/QuarterlyComparisonTable';
import { MonthlyComparisonTable } from '@/components/budget/MonthlyComparisonTable';
import { ContextualAIPanel } from '@/components/dashboard/ContextualAIPanel';
import { Link } from 'react-router-dom';

export default function BudgetVsActualPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showFormulas, setShowFormulas] = useState(false);
  const { t } = useLanguage();
  
  const { data, isLoading, error } = useScenarioBudgetData({ selectedScenarioId, targetYear: selectedYear });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {t('budgetVsActual.loadError')}
      </div>
    );
  }

  const hasScenarios = data && data.scenarios.length > 0;
  const hasPlannedData = data && data.monthly.some(c => c.plannedRevenue > 0 || c.plannedOpex > 0);
  const selectedScenarioLink = data?.scenarioId ? `/scenario/${data.scenarioId}` : '/scenario-hub';

  return (
    <>
      <Helmet>
        <title>{t('budgetVsActual.title')} | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title={t('budgetVsActual.title')}
            subtitle={t('budgetVsActual.subtitle')}
          />
          <div className="flex items-center gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t('budgetVsActual.year')} />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScenarioSelector
              scenarios={data?.scenarios || []}
              selectedId={selectedScenarioId || data?.scenarioId || undefined}
              onSelect={setSelectedScenarioId}
            />
          </div>
        </div>

        {/* No Scenario Warning */}
        {!hasScenarios && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{t('budgetVsActual.noScenario')}</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/scenario-hub">
                  {t('budgetVsActual.goToScenarioHub')}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* No Plan Data Warning */}
        {hasScenarios && !hasPlannedData && (
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {t('budgetVsActual.scenario')} "{data?.scenarioName}" {t('budgetVsActual.noPlanData')}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to={`/scenario/${data?.scenarioId}`}>
                  {t('budgetVsActual.enterPlan')}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Formula Reference */}
        <Collapsible open={showFormulas} onOpenChange={setShowFormulas}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              {t('budgetVsActual.formulas')}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-primary">{t('budgetVsActual.planned')}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {t('budgetVsActual.plannedSource')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('budgetVsActual.scenario')}: {data?.scenarioName || t('budgetVsActual.notSelected')}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">{t('budgetVsActual.actual')}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {t('budgetVsActual.actualRevenueSource')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('budgetVsActual.actualExpenseSource')}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">{t('budgetVsActual.revenueVariance')}</p>
                  <p className="text-muted-foreground font-mono text-xs">{t('budgetVsActual.revenueVarianceFormula')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('budgetVsActual.positiveGood')}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">{t('budgetVsActual.expenseVariance')}</p>
                  <p className="text-muted-foreground font-mono text-xs">{t('budgetVsActual.expenseVarianceFormula')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('budgetVsActual.savingsGood')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              {t('budgetVsActual.tabOverview')}
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('budgetVsActual.tabChart')}
            </TabsTrigger>
            <TabsTrigger value="quarterly">{t('budgetVsActual.tabQuarterly')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('budgetVsActual.tabMonthly')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {data && <BudgetOverviewPanel data={data} />}
          </TabsContent>

          <TabsContent value="chart">
            <MonthlyComparisonChart comparison={data?.monthly || []} />
          </TabsContent>

          <TabsContent value="quarterly">
            <QuarterlyComparisonTable quarterlyData={data?.quarterly || []} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyComparisonTable comparison={data?.monthly || []} />
          </TabsContent>
        </Tabs>

        {/* AI Strategic Recommendations */}
        <section aria-label={t('budgetVsActual.aiRecommendations')} className="space-y-3">
          {!hasPlannedData ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>
                  {t('budgetVsActual.noPlanAIWarning')}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to={selectedScenarioLink}>
                    {t('budgetVsActual.enterPlan')}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ContextualAIPanel
              context="budget_vs_actual"
              title={t('budgetVsActual.aiTitle')}
            />
          )}
        </section>
      </div>
    </>
  );
}
