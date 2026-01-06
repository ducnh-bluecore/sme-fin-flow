import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { MonthlyPlanEditor } from './MonthlyPlanEditor';
import { useMonthlyPlans, useMonthlyActuals, useSaveMonthlyPlan, useSaveMonthlyActual, planToArray, actualsToArray } from '@/hooks/useMonthlyPlans';

interface MonthlyPlanSectionProps {
  primaryScenarioId: string;
  currentKPIs: {
    revenue: number;
    ebitda: number;
    grossMargin: number;
  };
  targetRevenue: number;
  targetOpex: number;
  actualOpex: number;
  targetEbitda: number;
  revenueGrowth: number;
  opexChange: number;
}

export function MonthlyPlanSection({
  primaryScenarioId,
  currentKPIs,
  targetRevenue,
  targetOpex,
  actualOpex,
  targetEbitda,
  revenueGrowth,
  opexChange,
}: MonthlyPlanSectionProps) {
  const currentYear = new Date().getFullYear();
  
  const { data: plans = [], isLoading: plansLoading } = useMonthlyPlans(primaryScenarioId, currentYear);
  const { data: actuals = [] } = useMonthlyActuals(currentYear);
  const savePlan = useSaveMonthlyPlan();
  const saveActual = useSaveMonthlyActual();

  const revenuePlan = plans.find(p => p.metric_type === 'revenue');
  const opexPlan = plans.find(p => p.metric_type === 'opex');
  const ebitdaPlan = plans.find(p => p.metric_type === 'ebitda');

  const handleSavePlan = (metricType: string, targetTotal: number) => (monthlyValues: number[]) => {
    savePlan.mutate({
      scenarioId: primaryScenarioId,
      metricType,
      year: currentYear,
      monthlyValues,
      totalTarget: targetTotal,
    });
  };

  const handleSaveActual = (metricType: string) => (month: number, value: number) => {
    saveActual.mutate({
      metricType,
      year: currentYear,
      month,
      actualValue: value,
    });
  };

  return (
    <div className="space-y-4">
      <MonthlyPlanEditor
        title="Doanh thu"
        icon={<DollarSign className="w-5 h-5 text-success" />}
        currentTotal={currentKPIs.revenue}
        targetTotal={targetRevenue}
        unit="currency"
        metricType="revenue"
        scenarioId={primaryScenarioId}
        savedPlan={planToArray(revenuePlan)}
        actualValues={actualsToArray(actuals, 'revenue')}
        onSave={handleSavePlan('revenue', targetRevenue)}
        onSaveActual={handleSaveActual('revenue')}
        isLoading={savePlan.isPending}
        description={`Mục tiêu tăng trưởng ${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% so với hiện tại`}
      />
      
      <MonthlyPlanEditor
        title="Chi phí hoạt động (OPEX)"
        icon={<Wallet className="w-5 h-5 text-warning" />}
        currentTotal={actualOpex}
        targetTotal={targetOpex}
        unit="currency"
        metricType="opex"
        scenarioId={primaryScenarioId}
        savedPlan={planToArray(opexPlan)}
        actualValues={actualsToArray(actuals, 'opex')}
        onSave={handleSavePlan('opex', targetOpex)}
        onSaveActual={handleSaveActual('opex')}
        isLoading={savePlan.isPending}
        description={`Mục tiêu thay đổi ${opexChange >= 0 ? '+' : ''}${opexChange}% so với hiện tại`}
      />
      
      <MonthlyPlanEditor
        title="EBITDA"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
        currentTotal={currentKPIs.ebitda}
        targetTotal={targetEbitda}
        unit="currency"
        metricType="ebitda"
        scenarioId={primaryScenarioId}
        savedPlan={planToArray(ebitdaPlan)}
        actualValues={actualsToArray(actuals, 'ebitda')}
        onSave={handleSavePlan('ebitda', targetEbitda)}
        onSaveActual={handleSaveActual('ebitda')}
        isLoading={savePlan.isPending}
        description="Lợi nhuận trước thuế, lãi vay và khấu hao"
      />
    </div>
  );
}
