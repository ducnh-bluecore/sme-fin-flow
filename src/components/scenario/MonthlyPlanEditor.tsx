import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatVNDCompact } from '@/lib/formatters';
import { PlanTab } from './PlanTab';
import { TrackingTab } from './TrackingTab';

interface MonthlyData {
  month: string;
  value: number;
  locked: boolean;
  percentOfTotal: number;
}

interface MonthlyPlanEditorProps {
  title: string;
  icon?: React.ReactNode;
  currentTotal: number;
  targetTotal: number;
  unit?: 'currency' | 'percent' | 'days';
  description?: string;
  metricType: string;
  scenarioId?: string;
  savedPlan?: number[];
  actualValues?: number[];
  onSave?: (monthlyValues: number[]) => void;
  onSaveActual?: (month: number, value: number) => void;
  isLoading?: boolean;
}

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export function MonthlyPlanEditor({
  title,
  icon,
  currentTotal,
  targetTotal,
  unit = 'currency',
  description,
  metricType,
  scenarioId,
  savedPlan,
  actualValues = [],
  onSave,
  onSaveActual,
  isLoading,
}: MonthlyPlanEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'tracking'>('plan');

  // Initialize with saved plan or even distribution
  const initialDistribution = useMemo(() => {
    if (savedPlan && savedPlan.length === 12) {
      const total = savedPlan.reduce((sum, v) => sum + v, 0);
      return MONTHS.map((month, idx) => ({
        month,
        value: savedPlan[idx],
        locked: false,
        percentOfTotal: total > 0 ? (savedPlan[idx] / total) * 100 : 100 / 12,
      }));
    }
    const evenValue = targetTotal / 12;
    return MONTHS.map((month) => ({
      month,
      value: evenValue,
      locked: false,
      percentOfTotal: 100 / 12,
    }));
  }, [targetTotal, savedPlan]);

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(initialDistribution);

  // Update when savedPlan changes
  useEffect(() => {
    if (savedPlan && savedPlan.length === 12) {
      const total = savedPlan.reduce((sum, v) => sum + v, 0);
      setMonthlyData(
        MONTHS.map((month, idx) => ({
          month,
          value: savedPlan[idx],
          locked: false,
          percentOfTotal: total > 0 ? (savedPlan[idx] / total) * 100 : 100 / 12,
        }))
      );
    }
  }, [savedPlan]);

  const totalPlanned = useMemo(
    () => monthlyData.reduce((sum, m) => sum + m.value, 0),
    [monthlyData]
  );

  const formatValue = useCallback(
    (value: number) => {
      if (unit === 'currency') return formatVNDCompact(value);
      if (unit === 'percent') return `${value.toFixed(1)}%`;
      return `${Math.round(value)} ngày`;
    },
    [unit]
  );

  const handleValueChange = useCallback((index: number, newValue: number) => {
    setMonthlyData((prev) => {
      const updated = [...prev];
      const oldValue = updated[index].value;
      const diff = newValue - oldValue;

      // Find unlocked months to redistribute
      const unlockedIndices = updated
        .map((m, i) => ({ locked: m.locked, index: i }))
        .filter((m) => !m.locked && m.index !== index)
        .map((m) => m.index);

      if (unlockedIndices.length === 0) {
        return prev;
      }

      // Distribute the difference evenly among unlocked months
      const diffPerMonth = diff / unlockedIndices.length;

      updated[index] = {
        ...updated[index],
        value: newValue,
      };

      unlockedIndices.forEach((i) => {
        const adjustedValue = updated[i].value - diffPerMonth;
        updated[i] = {
          ...updated[i],
          value: Math.max(0, adjustedValue),
        };
      });

      // Recalculate percentages
      const total = updated.reduce((sum, m) => sum + m.value, 0);
      return updated.map((m) => ({
        ...m,
        percentOfTotal: total > 0 ? (m.value / total) * 100 : 100 / 12,
      }));
    });
  }, []);

  const toggleLock = useCallback((index: number) => {
    setMonthlyData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        locked: !updated[index].locked,
      };
      return updated;
    });
  }, []);

  const resetToEven = useCallback(() => {
    const evenValue = targetTotal / 12;
    setMonthlyData(
      MONTHS.map((month) => ({
        month,
        value: evenValue,
        locked: false,
        percentOfTotal: 100 / 12,
      }))
    );
  }, [targetTotal]);

  const applySeasonalPattern = useCallback(() => {
    const seasonalFactors = [0.85, 0.88, 0.92, 0.95, 1.0, 1.02, 0.98, 1.0, 1.05, 1.1, 1.12, 1.13];
    const totalFactor = seasonalFactors.reduce((a, b) => a + b, 0);

    setMonthlyData((prev) => {
      const updated = prev.map((m, i) => {
        if (m.locked) return m;
        return {
          ...m,
          value: (targetTotal * seasonalFactors[i]) / totalFactor,
        };
      });

      const total = updated.reduce((sum, m) => sum + m.value, 0);
      return updated.map((m) => ({
        ...m,
        percentOfTotal: total > 0 ? (m.value / total) * 100 : 100 / 12,
      }));
    });
  }, [targetTotal]);

  const hasSavedPlan = savedPlan && savedPlan.length === 12 && savedPlan.some((v) => v > 0);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {icon || <Calendar className="w-5 h-5 text-primary" />}
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasSavedPlan && (
            <Badge variant="outline" className="gap-1 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3" />
              Đã có kế hoạch
            </Badge>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tổng kế hoạch</p>
            <p
              className={cn(
                'font-bold',
                Math.abs(totalPlanned - targetTotal) < 1 ? 'text-success' : 'text-warning'
              )}
            >
              {formatValue(totalPlanned)}
            </p>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Tabs */}
          <div className="px-4 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'plan' | 'tracking')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plan">📋 Lập kế hoạch</TabsTrigger>
                <TabsTrigger value="tracking">📊 Theo dõi thực tế</TabsTrigger>
              </TabsList>

              <TabsContent value="plan" className="mt-4">
                <PlanTab
                  monthlyData={monthlyData}
                  currentTotal={currentTotal}
                  targetTotal={targetTotal}
                  actualValues={actualValues}
                  formatValue={formatValue}
                  onValueChange={handleValueChange}
                  onToggleLock={toggleLock}
                  onResetToEven={resetToEven}
                  onApplySeasonalPattern={applySeasonalPattern}
                  onSave={onSave}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="tracking" className="mt-4">
                <TrackingTab
                  hasSavedPlan={!!hasSavedPlan}
                  monthlyData={monthlyData}
                  actualValues={actualValues}
                  formatValue={formatValue}
                  onSwitchToPlan={() => setActiveTab('plan')}
                  onSaveActual={onSaveActual}
                />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
