import { useMemo, memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { formatVNDCompact } from '@/lib/formatters';
import { useKPIData } from '@/hooks/useKPIData';
import { Loader2 } from 'lucide-react';

function ScenarioPlannerComponent() {
  const [revenueChange, setRevenueChange] = useState(0);
  const [dsoChange, setDsoChange] = useState(0);
  const { data: kpiData, isLoading } = useKPIData();

  const projections = useMemo(() => {
    if (!kpiData) {
      return {
        projectedRevenue: 0,
        projectedDSO: 0,
        cashRunway: 'N/A',
        netCashFlow: 0,
        arChange: 0,
      };
    }

    const baseRevenue = kpiData.totalRevenue > 0 ? kpiData.totalRevenue / 12 : 12_000_000_000; // Monthly revenue
    const baseOpex = baseRevenue * 0.67; // Estimated 67% OpEx
    
    const newRevenue = baseRevenue * (1 + revenueChange / 100);
    const newDSO = kpiData.dso + dsoChange;
    
    // Cash conversion impact
    const dailySales = newRevenue / 30;
    const arImpact = dailySales * dsoChange;
    
    const monthlyFreeCash = newRevenue - baseOpex - arImpact;
    const currentCash = kpiData.cashToday;
    
    // Runway calculation (months)
    const monthlyBurn = baseOpex;
    const runway = monthlyFreeCash > 0 
      ? 'Tích cực' 
      : Math.abs(currentCash / monthlyBurn).toFixed(1) + ' tháng';
    
    return {
      projectedRevenue: newRevenue,
      projectedDSO: newDSO,
      cashRunway: runway,
      netCashFlow: monthlyFreeCash,
      arChange: arImpact,
    };
  }, [revenueChange, dsoChange, kpiData]);

  const handleRevenueChange = useCallback((value: number[]) => setRevenueChange(value[0]), []);
  const handleDsoChange = useCallback((value: number[]) => setDsoChange(value[0]), []);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="data-card flex items-center justify-center h-64"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="data-card"
    >
      <div className="mb-6">
        <h3 className="font-semibold text-foreground">Kế hoạch kịch bản</h3>
        <p className="text-sm text-muted-foreground">Scenario Planner</p>
      </div>

      <div className="space-y-6">
        {/* Revenue Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Thay đổi doanh thu</span>
            <span className={`text-sm font-bold ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange}%
            </span>
          </div>
          <Slider
            value={[revenueChange]}
            onValueChange={handleRevenueChange}
            min={-30}
            max={30}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>-30%</span>
            <span>0%</span>
            <span>+30%</span>
          </div>
        </div>

        {/* DSO Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Thay đổi DSO</span>
            <span className={`text-sm font-bold ${dsoChange <= 0 ? 'text-success' : 'text-destructive'}`}>
              {dsoChange >= 0 ? '+' : ''}{dsoChange} ngày
            </span>
          </div>
          <Slider
            value={[dsoChange]}
            onValueChange={handleDsoChange}
            min={-15}
            max={15}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>-15 ngày</span>
            <span>0</span>
            <span>+15 ngày</span>
          </div>
        </div>

        {/* Projections */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Doanh thu dự kiến</span>
            <span className="text-sm font-semibold">{formatVNDCompact(projections.projectedRevenue)}/tháng</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">DSO dự kiến</span>
            <span className="text-sm font-semibold">{projections.projectedDSO} ngày</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Thay đổi AR</span>
            <span className={`text-sm font-semibold ${projections.arChange <= 0 ? 'text-success' : 'text-destructive'}`}>
              {projections.arChange >= 0 ? '+' : ''}{formatVNDCompact(projections.arChange)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">Cash Runway</span>
            <span className={`text-lg font-bold ${projections.netCashFlow > 0 ? 'text-success' : 'text-destructive'}`}>
              {projections.cashRunway}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const ScenarioPlanner = memo(ScenarioPlannerComponent);
