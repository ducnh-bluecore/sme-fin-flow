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
        Không thể tải dữ liệu Budget vs Actual
      </div>
    );
  }

  const hasScenarios = data && data.scenarios.length > 0;
  const hasPlannedData = data && data.monthly.some(c => c.plannedRevenue > 0 || c.plannedOpex > 0);
  const selectedScenarioLink = data?.scenarioId ? `/scenario/${data.scenarioId}` : '/scenario-hub';

  return (
    <>
      <Helmet>
        <title>Budget vs Actual | CFO Dashboard</title>
      </Helmet>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <PageHeader
            title="Budget vs Actual"
            subtitle="So sánh kế hoạch kịch bản với số liệu thực tế"
          />
          <div className="flex items-center gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Năm" />
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
              <span>Chưa có kịch bản nào. Hãy tạo kịch bản để bắt đầu lập kế hoạch ngân sách.</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/scenario-hub">
                  Đi tới Scenario Hub
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
                Kịch bản "{data?.scenarioName}" chưa có kế hoạch tháng. 
                Hãy nhập kế hoạch Revenue, OPEX, EBITDA.
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to={`/scenario/${data?.scenarioId}`}>
                  Nhập kế hoạch
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
              Công thức & Nguồn dữ liệu
              <ChevronDown className={`h-4 w-4 transition-transform ${showFormulas ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-primary">Kế hoạch (KH)</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Từ bảng scenario_monthly_plans
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kịch bản: {data?.scenarioName || 'Chưa chọn'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">Thực tế (TT)</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    DT từ external_orders (delivered)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CP từ expenses
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">Chênh lệch Doanh thu</p>
                  <p className="text-muted-foreground font-mono text-xs">= Thực tế - Kế hoạch</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dương = Vượt KH (tốt)
                  </p>
                </div>
                <div>
                  <p className="font-medium text-primary">Chênh lệch Chi phí</p>
                  <p className="text-muted-foreground font-mono text-xs">= Kế hoạch - Thực tế</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dương = Tiết kiệm (tốt)
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
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Biểu đồ
            </TabsTrigger>
            <TabsTrigger value="quarterly">Theo Quý</TabsTrigger>
            <TabsTrigger value="monthly">Chi tiết tháng</TabsTrigger>
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
        <section aria-label="AI đề xuất hành động" className="space-y-3">
          {!hasPlannedData ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>
                  Chưa có dữ liệu kế hoạch (Budget) nên AI chưa thể đề xuất hành động chiến lược. Hãy nhập kế hoạch theo tháng để AI phân tích Budget vs Actual.
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to={selectedScenarioLink}>
                    Nhập kế hoạch
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <ContextualAIPanel
              context="budget_vs_actual"
              title="🎯 AI Đề xuất Hành động Chiến lược"
            />
          )}
        </section>
      </div>
    </>
  );
}
