import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { 
  GitBranch, 
  TrendingUp, 
  TrendingDown,
  Dice5,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Save,
  Plus,
  Edit3,
  Target,
  DollarSign,
  Clock,
  Percent,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Wallet,
  Trash2,
  Loader2,
  Copy,
  ArrowLeftRight,
  Check,
  History,
  Database,
  X,
  Star,
  Crown,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
  ComposedChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { formatCurrency, formatVNDCompact, formatDateTime, formatCount } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useScenarios, useCreateScenario, useUpdateScenario, useDeleteScenario, useSetPrimaryScenario, usePrimaryScenario } from '@/hooks/useScenarioData';
import { useMonteCarloResults, useSaveMonteCarloResult, useDeleteMonteCarloResult } from '@/hooks/useMonteCarloData';
import { useCentralFinancialMetrics } from '@/hooks/useCentralFinancialMetrics';
import { useWhatIfScenarios, WhatIfScenario } from '@/hooks/useWhatIfScenarios';
import { Download } from 'lucide-react';
// Monthly plans hooks moved to MonthlyPlanSection component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ContextualAIPanel } from '@/components/dashboard/ContextualAIPanel';
import { MonthlyPlanSection } from '@/components/scenario/MonthlyPlanSection';

interface ScenarioParams {
  id: string;
  name: string;
  description: string;
  probability: number;
  revenueGrowth: number;
  costChange: number;
  dsoTarget: number;
  grossMargin: number;
  opexChange: number;
  arDays: number;
  apDays: number;
  inventoryDays: number;
  isPrimary: boolean;
}

const generateForecastData = (scenarios: ScenarioParams[], months: number, baseRevenue: number = 12_000_000_000) => {
  return Array.from({ length: months }, (_, i) => {
    const month = `T${i + 1}`;
    const data: Record<string, number | string> = { month };
    
    scenarios.forEach(s => {
      data[s.id] = baseRevenue * Math.pow(1 + s.revenueGrowth / 100 / 12, i);
    });
    
    return data;
  });
};

// Monte Carlo Simulation Types
interface MonteCarloResult {
  revenueDistribution: { value: number; frequency: number }[];
  cashDistribution: { value: number; frequency: number }[];
  ebitdaDistribution: { value: number; frequency: number }[];
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  statistics: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    var95: number;
    cvar95: number;
  };
  simulations: { revenue: number; ebitda: number; cash: number }[];
}

// Box-Muller transform for normal distribution
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Run Monte Carlo simulation
function runMonteCarloSimulation(
  scenarios: ScenarioParams[],
  baseRevenue: number,
  numSimulations: number = 10000
): MonteCarloResult {
  const simulations: { revenue: number; ebitda: number; cash: number }[] = [];
  
  const weightedRevGrowth = scenarios.reduce((sum, s) => sum + s.revenueGrowth * s.probability / 100, 0);
  const weightedMargin = scenarios.reduce((sum, s) => sum + s.grossMargin * s.probability / 100, 0);
  const weightedOpex = scenarios.reduce((sum, s) => sum + s.opexChange * s.probability / 100, 0);
  const weightedArDays = scenarios.reduce((sum, s) => sum + s.arDays * s.probability / 100, 0);
  
  const revGrowthStd = Math.max(...scenarios.map(s => Math.abs(s.revenueGrowth - weightedRevGrowth)));
  const marginStd = Math.max(...scenarios.map(s => Math.abs(s.grossMargin - weightedMargin)));
  const opexStd = Math.max(...scenarios.map(s => Math.abs(s.opexChange - weightedOpex)));
  const arDaysStd = Math.max(...scenarios.map(s => Math.abs(s.arDays - weightedArDays)));
  
  for (let i = 0; i < numSimulations; i++) {
    const simRevGrowth = randomNormal(weightedRevGrowth, revGrowthStd / 2);
    const simMargin = Math.max(10, Math.min(60, randomNormal(weightedMargin, marginStd / 2)));
    const simOpex = randomNormal(weightedOpex, opexStd / 2);
    const simArDays = Math.max(15, randomNormal(weightedArDays, arDaysStd / 2));
    
    const revenue = baseRevenue * (1 + simRevGrowth / 100);
    const grossProfit = revenue * (simMargin / 100);
    const opexAmount = baseRevenue * 0.25 * (1 + simOpex / 100);
    const ebitda = grossProfit - opexAmount;
    
    const dailySales = revenue / 30;
    const arChange = dailySales * (simArDays - 52);
    const cash = 8_500_000_000 - arChange;
    
    simulations.push({ revenue, ebitda, cash });
  }
  
  const sortedByEbitda = [...simulations].sort((a, b) => a.ebitda - b.ebitda);
  
  const getPercentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];
  const ebitdaValues = sortedByEbitda.map(s => s.ebitda);
  
  const createHistogram = (values: number[], bins: number = 30) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    const histogram: { value: number; frequency: number }[] = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = values.filter(v => v >= binStart && v < binEnd).length;
      histogram.push({
        value: binStart + binWidth / 2,
        frequency: count / values.length * 100,
      });
    }
    return histogram;
  };
  
  const mean = ebitdaValues.reduce((a, b) => a + b, 0) / ebitdaValues.length;
  const variance = ebitdaValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ebitdaValues.length;
  const stdDev = Math.sqrt(variance);
  const var95 = getPercentile(ebitdaValues, 5);
  const cvar95Values = ebitdaValues.filter(v => v <= var95);
  const cvar95 = cvar95Values.length > 0 ? cvar95Values.reduce((a, b) => a + b, 0) / cvar95Values.length : var95;
  
  return {
    revenueDistribution: createHistogram(simulations.map(s => s.revenue)),
    cashDistribution: createHistogram(simulations.map(s => s.cash)),
    ebitdaDistribution: createHistogram(ebitdaValues),
    percentiles: {
      p5: getPercentile(ebitdaValues, 5),
      p25: getPercentile(ebitdaValues, 25),
      p50: getPercentile(ebitdaValues, 50),
      p75: getPercentile(ebitdaValues, 75),
      p95: getPercentile(ebitdaValues, 95),
    },
    statistics: {
      mean,
      stdDev,
      min: Math.min(...ebitdaValues),
      max: Math.max(...ebitdaValues),
      var95,
      cvar95,
    },
    simulations: simulations.slice(0, 500),
  };
}

// Map database scenario to UI format - needs currentGrossMargin for accurate defaults
function mapDbToUi(dbScenario: any, currentGrossMargin: number = 35): ScenarioParams {
  // Round grossMargin to 1 decimal for better UI display
  const roundedGrossMargin = Math.round((currentGrossMargin || 35) * 10) / 10;
  
  return {
    id: dbScenario.id,
    name: dbScenario.name,
    description: dbScenario.description || '',
    probability: 33, // Default value since DB doesn't have this
    revenueGrowth: dbScenario.revenue_change || 0,
    costChange: dbScenario.cost_change || 0,
    dsoTarget: 45,
    grossMargin: roundedGrossMargin, // Use current gross margin from KPI data, rounded
    opexChange: dbScenario.cost_change || 0,
    arDays: 52,
    apDays: 35,
    inventoryDays: 28,
    isPrimary: dbScenario.is_primary || false,
  };
}

export default function ScenarioPage() {
  const { user } = useAuth();
  const { data: dbScenarios, isLoading } = useScenarios();
  const { data: metrics } = useCentralFinancialMetrics();
  const { data: primaryScenario } = usePrimaryScenario();
  const createScenario = useCreateScenario();
  const updateScenarioMutation = useUpdateScenario();
  const deleteScenarioMutation = useDeleteScenario();
  const setPrimaryScenarioMutation = useSetPrimaryScenario();
  
  // Monte Carlo hooks
  const { data: savedMonteCarloResults } = useMonteCarloResults();
  const saveMonteCarloResult = useSaveMonteCarloResult();
  const deleteMonteCarloResult = useDeleteMonteCarloResult();
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // What-If scenarios hook
  const { data: whatIfScenarios } = useWhatIfScenarios();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const [localScenarios, setLocalScenarios] = useState<ScenarioParams[]>([]);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numSimulations, setNumSimulations] = useState(10000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [compareScenarios, setCompareScenarios] = useState<[string | null, string | null]>([null, null]);
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    revenue_change: 0,
    cost_change: 0,
  });

  // Check if we have real data
  const hasRealData = useMemo(() => {
    return metrics && (metrics.totalRevenue > 0 || metrics.cashOnHand > 0 || metrics.ebitda !== 0);
  }, [metrics]);

  // Calculate currentKPIs from real data - no fallbacks to fake data
  const currentKPIs = useMemo(() => ({
    revenue: metrics?.totalRevenue ? metrics.totalRevenue / (metrics.daysInPeriod / 30) : 0,
    cashToday: metrics?.cashOnHand || 0,
    cash7d: (metrics?.cashOnHand || 0) + (metrics?.cashFlow || 0),
    totalAR: metrics?.totalAR || 0,
    overdueAR: metrics?.overdueAR || 0,
    dso: metrics?.dso || 0,
    ccc: metrics?.ccc || 0,
    grossMargin: metrics?.grossMargin || 0,
    ebitda: metrics?.ebitda || 0,
    matchedRate: 0,
  }), [metrics]);

  // Sync database scenarios to local state
  useEffect(() => {
    if (dbScenarios && dbScenarios.length > 0) {
      setLocalScenarios(dbScenarios.map(s => mapDbToUi(s, currentKPIs.grossMargin)));
      if (!expandedScenario) {
        setExpandedScenario(dbScenarios[0].id);
      }
    }
  }, [dbScenarios, currentKPIs.grossMargin]);

  const forecastData = useMemo(() => generateForecastData(localScenarios, 12, currentKPIs.revenue), [localScenarios, currentKPIs.revenue]);

  const updateScenario = (id: string, updates: Partial<ScenarioParams>) => {
    setLocalScenarios(prev => 
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  };

  const saveScenarioToDb = async (scenario: ScenarioParams) => {
    await updateScenarioMutation.mutateAsync({
      id: scenario.id,
      updates: {
        name: scenario.name,
        description: scenario.description || null,
        revenue_change: scenario.revenueGrowth,
        cost_change: scenario.costChange,
      }
    });
    setEditingScenario(null);
  };

  const handleCreateScenario = async () => {
    await createScenario.mutateAsync({
      name: newScenario.name,
      description: newScenario.description || null,
      revenue_change: newScenario.revenue_change,
      cost_change: newScenario.cost_change,
      base_revenue: currentKPIs.revenue,
      base_costs: currentKPIs.revenue * 0.7,
      calculated_ebitda: null,
      created_by: user?.id || null,
      is_primary: null,
    });
    setIsCreateDialogOpen(false);
    setNewScenario({ name: '', description: '', revenue_change: 0, cost_change: 0 });
  };

  const handleDeleteScenario = async (id: string) => {
    await deleteScenarioMutation.mutateAsync(id);
  };

  const handleCloneScenario = async (scenario: ScenarioParams) => {
    await createScenario.mutateAsync({
      name: `${scenario.name} (Bản sao)`,
      description: scenario.description || null,
      revenue_change: scenario.revenueGrowth,
      cost_change: scenario.costChange,
      base_revenue: currentKPIs.revenue,
      base_costs: currentKPIs.revenue * 0.7,
      calculated_ebitda: null,
      created_by: user?.id || null,
      is_primary: null,
    });
  };

  const handleSetPrimary = async (id: string) => {
    await setPrimaryScenarioMutation.mutateAsync(id);
  };

  // Import What-If scenario as financial scenario
  const handleImportWhatIfScenario = async (whatIfScenario: WhatIfScenario) => {
    await createScenario.mutateAsync({
      name: `[What-If] ${whatIfScenario.name}`,
      description: whatIfScenario.description || `Imported từ What-If: ${whatIfScenario.name}`,
      revenue_change: whatIfScenario.params.revenueChange || 0,
      cost_change: whatIfScenario.params.cogsChange || 0,
      base_revenue: currentKPIs.revenue,
      base_costs: currentKPIs.revenue * 0.7,
      calculated_ebitda: whatIfScenario.results?.ebitda || null,
      created_by: user?.id || null,
      is_primary: null,
    });
    setIsImportDialogOpen(false);
  };

  // Save Monte Carlo result to database
  const handleSaveMonteCarloResult = async () => {
    if (!monteCarloResult || !user?.id) return;
    
    setIsSaving(true);
    try {
      await saveMonteCarloResult.mutateAsync({
        scenario_id: null,
        simulation_count: numSimulations,
        mean_ebitda: monteCarloResult.statistics.mean,
        std_dev_ebitda: monteCarloResult.statistics.stdDev,
        p10_ebitda: monteCarloResult.percentiles.p5,
        p50_ebitda: monteCarloResult.percentiles.p50,
        p90_ebitda: monteCarloResult.percentiles.p95,
        min_ebitda: monteCarloResult.statistics.min,
        max_ebitda: monteCarloResult.statistics.max,
        distribution_data: {
          percentiles: monteCarloResult.percentiles,
          statistics: monteCarloResult.statistics,
          ebitdaDistribution: monteCarloResult.ebitdaDistribution,
        },
        created_by: user.id,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate projected KPIs for each scenario
  const projectedKPIs = useMemo(() => {
    return localScenarios.map(scenario => {
      const projectedRevenue = currentKPIs.revenue * (1 + scenario.revenueGrowth / 100);
      const projectedGrossProfit = projectedRevenue * (scenario.grossMargin / 100);
      const projectedOpex = currentKPIs.ebitda * (1 + scenario.opexChange / 100);
      const projectedEBITDA = projectedGrossProfit - projectedOpex;
      const projectedCCC = scenario.arDays + scenario.inventoryDays - scenario.apDays;
      
      const dailySales = projectedRevenue / 30;
      const arChange = dailySales * (scenario.arDays - currentKPIs.dso);
      const projectedCash = currentKPIs.cashToday - arChange;

      return {
        id: scenario.id,
        name: scenario.name,
        revenue: projectedRevenue,
        revenueChange: ((projectedRevenue / currentKPIs.revenue) - 1) * 100,
        grossProfit: projectedGrossProfit,
        ebitda: projectedEBITDA,
        ebitdaChange: ((projectedEBITDA / currentKPIs.ebitda) - 1) * 100,
        cash: projectedCash,
        cashChange: ((projectedCash / currentKPIs.cashToday) - 1) * 100,
        dso: scenario.arDays,
        dsoChange: scenario.arDays - currentKPIs.dso,
        ccc: projectedCCC,
        cccChange: projectedCCC - currentKPIs.ccc,
        grossMargin: scenario.grossMargin,
        marginChange: scenario.grossMargin - currentKPIs.grossMargin,
      };
    });
  }, [localScenarios]);

  const comparisonData = useMemo(() => {
    const metrics = [
      { metric: 'Doanh thu', current: currentKPIs.revenue },
      { metric: 'EBITDA', current: currentKPIs.ebitda },
      { metric: 'Tiền mặt', current: currentKPIs.cashToday },
    ];
    
    return metrics.map(m => {
      const result: Record<string, number | string> = { metric: m.metric, current: m.current };
      projectedKPIs.forEach(p => {
        if (m.metric === 'Doanh thu') result[p.id] = p.revenue;
        if (m.metric === 'EBITDA') result[p.id] = p.ebitda;
        if (m.metric === 'Tiền mặt') result[p.id] = p.cash;
      });
      return result;
    });
  }, [projectedKPIs]);

  // Get compared scenarios data
  const comparedScenariosData = useMemo(() => {
    if (!compareScenarios[0] || !compareScenarios[1]) return null;
    
    const scenario1 = localScenarios.find(s => s.id === compareScenarios[0]);
    const scenario2 = localScenarios.find(s => s.id === compareScenarios[1]);
    
    if (!scenario1 || !scenario2) return null;

    const projected1 = projectedKPIs.find(p => p.id === scenario1.id);
    const projected2 = projectedKPIs.find(p => p.id === scenario2.id);

    if (!projected1 || !projected2) return null;

    return { scenario1, scenario2, projected1, projected2 };
  }, [compareScenarios, localScenarios, projectedKPIs]);

  const renderComparisonValue = (val1: number, val2: number, format: 'currency' | 'percent' | 'days') => {
    const diff = val2 - val1;
    const diffPercent = val1 !== 0 ? (diff / Math.abs(val1)) * 100 : 0;
    
    let formattedVal1 = '';
    let formattedVal2 = '';
    let formattedDiff = '';
    
    if (format === 'currency') {
      formattedVal1 = formatVNDCompact(val1);
      formattedVal2 = formatVNDCompact(val2);
      formattedDiff = `${diff >= 0 ? '+' : ''}${formatVNDCompact(diff)}`;
    } else if (format === 'percent') {
      formattedVal1 = `${val1.toFixed(1)}%`;
      formattedVal2 = `${val2.toFixed(1)}%`;
      formattedDiff = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    } else {
      formattedVal1 = `${Math.round(val1)} ngày`;
      formattedVal2 = `${Math.round(val2)} ngày`;
      formattedDiff = `${diff >= 0 ? '+' : ''}${Math.round(diff)} ngày`;
    }

    return { formattedVal1, formattedVal2, formattedDiff, diff, diffPercent };
  };

  const getScenarioColor = (index: number) => {
    const colors = ['primary', 'success', 'warning', 'info', 'destructive'];
    return colors[index % colors.length];
  };

  const renderScenarioCard = (scenario: ScenarioParams, index: number) => {
    const isExpanded = expandedScenario === scenario.id;
    const isEditing = editingScenario === scenario.id;
    const projected = projectedKPIs.find(p => p.id === scenario.id);
    const color = getScenarioColor(index);

    return (
      <motion.div
        key={scenario.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className={cn(
          'bg-card shadow-card transition-all border-l-4 overflow-hidden',
          color === 'primary' && 'border-l-primary',
          color === 'success' && 'border-l-success',
          color === 'warning' && 'border-l-warning',
          color === 'info' && 'border-l-info',
          color === 'destructive' && 'border-l-destructive'
        )}>
          {/* Header */}
          <div 
            className="p-5 cursor-pointer"
            onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                color === 'primary' && 'bg-primary/10',
                color === 'success' && 'bg-success/10',
                color === 'warning' && 'bg-warning/10',
                color === 'info' && 'bg-info/10',
                color === 'destructive' && 'bg-destructive/10'
              )}>
                {scenario.revenueGrowth > 5 ? (
                  <TrendingUp className={cn('w-5 h-5', `text-${color}`)} />
                ) : scenario.revenueGrowth < 0 ? (
                  <TrendingDown className={cn('w-5 h-5', `text-${color}`)} />
                ) : (
                  <GitBranch className={cn('w-5 h-5', `text-${color}`)} />
                )}
              </div>
              <div className="flex items-center gap-2">
                {scenario.isPrimary && (
                  <Badge variant="default" className="bg-warning/20 text-warning border-warning/30">
                    <Crown className="w-3 h-3 mr-1" />
                    Kịch bản chính
                  </Badge>
                )}
                <Badge variant={scenario.revenueGrowth < 0 ? 'secondary' : 'default'}>
                  {scenario.probability}% xác suất
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
              {scenario.name}
              {scenario.isPrimary && <Star className="w-4 h-4 text-warning fill-warning" />}
            </h3>
            <p className="text-sm text-muted-foreground">{scenario.description}</p>

            {/* Quick KPI Preview */}
            {!isExpanded && projected && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Doanh thu</p>
                  <p className="text-sm font-semibold">{formatVNDCompact(projected.revenue)}</p>
                  <p className={cn(
                    'text-xs',
                    projected.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {projected.revenueChange >= 0 ? '+' : ''}{projected.revenueChange.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DSO</p>
                  <p className="text-sm font-semibold">{projected.dso} ngày</p>
                  <p className={cn(
                    'text-xs',
                    projected.dsoChange <= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {projected.dsoChange >= 0 ? '+' : ''}{projected.dsoChange} ngày
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CCC</p>
                  <p className="text-sm font-semibold">{projected.ccc} ngày</p>
                  <p className={cn(
                    'text-xs',
                    projected.cccChange <= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {projected.cccChange >= 0 ? '+' : ''}{projected.cccChange} ngày
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-5 pb-5 space-y-6 border-t border-border pt-5">
                  {/* Edit Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Chỉnh sửa thông số</span>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveScenarioToDb(scenario);
                          }}
                          disabled={updateScenarioMutation.isPending}
                        >
                          {updateScenarioMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Lưu
                        </Button>
                      )}
                      <Button 
                        variant={isEditing ? 'outline' : 'outline'} 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingScenario(isEditing ? null : scenario.id);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloneScenario(scenario);
                        }}
                        disabled={createScenario.isPending}
                        title="Sao chép kịch bản"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {!scenario.isPrimary && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(scenario.id);
                          }}
                          disabled={setPrimaryScenarioMutation.isPending}
                          title="Đặt làm kịch bản chính"
                          className="border-warning/50 text-warning hover:bg-warning/10"
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                        disabled={deleteScenarioMutation.isPending}
                        title="Xóa kịch bản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Basic Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Tăng trưởng doanh thu
                      </label>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[scenario.revenueGrowth]}
                              onValueChange={(v) => updateScenario(scenario.id, { revenueGrowth: v[0] })}
                              min={-20}
                              max={30}
                              step={1}
                              className="flex-1"
                            />
                            <span className={cn(
                              'text-sm font-bold w-12 text-right',
                              scenario.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'
                            )}>
                              {scenario.revenueGrowth >= 0 ? '+' : ''}{scenario.revenueGrowth}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className={cn(
                          'text-lg font-bold mt-1',
                          scenario.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {scenario.revenueGrowth >= 0 ? '+' : ''}{scenario.revenueGrowth}%
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Percent className="w-4 h-4 text-info" />
                        Biên lợi nhuận gộp
                      </label>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[scenario.grossMargin]}
                              onValueChange={(v) => updateScenario(scenario.id, { grossMargin: v[0] })}
                              min={15}
                              max={50}
                              step={0.5}
                              className="flex-1"
                            />
                      <span className="text-sm font-bold w-14 text-right text-info">
                              {scenario.grossMargin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-lg font-bold mt-1 text-info">{scenario.grossMargin.toFixed(1)}%</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning" />
                        DSO (Ngày thu tiền)
                      </label>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[scenario.arDays]}
                              onValueChange={(v) => updateScenario(scenario.id, { arDays: v[0] })}
                              min={20}
                              max={90}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm font-bold w-16 text-right">
                              {scenario.arDays} ngày
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-lg font-bold mt-1">{scenario.arDays} ngày</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        Thay đổi chi phí
                      </label>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[scenario.costChange]}
                              onValueChange={(v) => updateScenario(scenario.id, { costChange: v[0], opexChange: v[0] })}
                              min={-15}
                              max={20}
                              step={1}
                              className="flex-1"
                            />
                            <span className={cn(
                              'text-sm font-bold w-12 text-right',
                              scenario.costChange <= 0 ? 'text-success' : 'text-destructive'
                            )}>
                              {scenario.costChange >= 0 ? '+' : ''}{scenario.costChange}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className={cn(
                          'text-lg font-bold mt-1',
                          scenario.costChange <= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {scenario.costChange >= 0 ? '+' : ''}{scenario.costChange}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Advanced Parameters Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Thông số nâng cao</span>
                    <Switch 
                      checked={showAdvanced} 
                      onCheckedChange={setShowAdvanced}
                    />
                  </div>

                  {/* Advanced Parameters */}
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg"
                    >
                      <div>
                        <label className="text-xs text-muted-foreground">DPO (Ngày trả tiền)</label>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Slider
                              value={[scenario.apDays]}
                              onValueChange={(v) => updateScenario(scenario.id, { apDays: v[0] })}
                              min={15}
                              max={60}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm font-semibold w-12 text-right">{scenario.apDays}</span>
                          </div>
                        ) : (
                          <p className="font-semibold">{scenario.apDays} ngày</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">DIO (Ngày tồn kho)</label>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Slider
                              value={[scenario.inventoryDays]}
                              onValueChange={(v) => updateScenario(scenario.id, { inventoryDays: v[0] })}
                              min={10}
                              max={60}
                              step={1}
                              className="flex-1"
                            />
                            <span className="text-sm font-semibold w-12 text-right">{scenario.inventoryDays}</span>
                          </div>
                        ) : (
                          <p className="font-semibold">{scenario.inventoryDays} ngày</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Xác suất kịch bản</label>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              value={scenario.probability}
                              onChange={(e) => updateScenario(scenario.id, { probability: Number(e.target.value) })}
                              min={0}
                              max={100}
                              className="h-8"
                            />
                            <span className="text-sm font-semibold">%</span>
                          </div>
                        ) : (
                          <p className="font-semibold">{scenario.probability}%</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Projected KPIs */}
                  {projected && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Dự báo KPI so với hiện tại
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="w-3 h-3" />
                            Doanh thu/tháng
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Hiện tại</p>
                              <p className="font-semibold">{formatVNDCompact(currentKPIs.revenue)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Dự báo</p>
                              <p className="font-semibold">{formatVNDCompact(projected.revenue)}</p>
                              <p className={cn(
                                'text-xs',
                                projected.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {projected.revenueChange >= 0 ? '+' : ''}{projected.revenueChange.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <BarChart3 className="w-3 h-3" />
                            EBITDA
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Hiện tại</p>
                              <p className="font-semibold">{formatVNDCompact(currentKPIs.ebitda)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Dự báo</p>
                              <p className="font-semibold">{formatVNDCompact(projected.ebitda)}</p>
                              <p className={cn(
                                'text-xs',
                                projected.ebitdaChange >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {projected.ebitdaChange >= 0 ? '+' : ''}{projected.ebitdaChange.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Wallet className="w-3 h-3" />
                            Tiền mặt
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Hiện tại</p>
                              <p className="font-semibold">{formatVNDCompact(currentKPIs.cashToday)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Dự báo</p>
                              <p className="font-semibold">{formatVNDCompact(projected.cash)}</p>
                              <p className={cn(
                                'text-xs',
                                projected.cashChange >= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {projected.cashChange >= 0 ? '+' : ''}{projected.cashChange.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <RefreshCw className="w-3 h-3" />
                            CCC
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Hiện tại</p>
                              <p className="font-semibold">{currentKPIs.ccc} ngày</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Dự báo</p>
                              <p className="font-semibold">{projected.ccc} ngày</p>
                              <p className={cn(
                                'text-xs',
                                projected.cccChange <= 0 ? 'text-success' : 'text-destructive'
                              )}>
                                {projected.cccChange >= 0 ? '+' : ''}{projected.cccChange} ngày
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show message if no real data
  if (!hasRealData) {
    return (
      <>
        <Helmet>
          <title>Kế hoạch kịch bản | Bluecore Finance</title>
          <meta name="description" content="Phân tích và lập kế hoạch theo các kịch bản" />
        </Helmet>
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-info" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kế hoạch kịch bản</h1>
              <p className="text-muted-foreground">Scenario Planning & What-If Analysis</p>
            </div>
          </motion.div>
          
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Cần có dữ liệu doanh thu, chi phí và các chỉ số tài chính để có thể lập kế hoạch kịch bản.
              Hãy thêm dữ liệu hóa đơn, chi phí hoặc kết nối với nguồn dữ liệu để bắt đầu.
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kế hoạch kịch bản | Bluecore Finance</title>
        <meta name="description" content="Phân tích và lập kế hoạch theo các kịch bản" />
      </Helmet>

      <div className="space-y-6">
        {/* Header - can be hidden when embedded */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="scenario-header flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-info" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kế hoạch kịch bản</h1>
              <p className="text-muted-foreground">Scenario Planning & What-If Analysis</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Import from What-If Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!whatIfScenarios || whatIfScenarios.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import từ What-If
                  {whatIfScenarios && whatIfScenarios.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {whatIfScenarios.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Import kịch bản từ What-If
                  </DialogTitle>
                  <DialogDescription>
                    Chọn kịch bản What-If đã lưu để sử dụng làm kế hoạch tài chính
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  {whatIfScenarios && whatIfScenarios.length > 0 ? (
                    whatIfScenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                        onClick={() => handleImportWhatIfScenario(scenario)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{scenario.name}</h4>
                              {scenario.is_favorite && (
                                <Star className="w-4 h-4 text-warning fill-warning" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {scenario.control_mode === 'retail' ? 'Bán lẻ' : 'Cơ bản'}
                              </Badge>
                            </div>
                            {scenario.description && (
                              <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                            )}
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Doanh thu: {scenario.params.revenueChange >= 0 ? '+' : ''}{scenario.params.revenueChange}%</span>
                              <span>COGS: {scenario.params.cogsChange >= 0 ? '+' : ''}{scenario.params.cogsChange}%</span>
                              <span>OPEX: {scenario.params.opexChange >= 0 ? '+' : ''}{scenario.params.opexChange}%</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Import
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Chưa có kịch bản What-If nào được lưu.</p>
                      <p className="text-sm mt-1">Vào tab What-If để tạo và lưu kịch bản mới.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo kịch bản mới
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo kịch bản mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin để tạo kịch bản phân tích mới
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên kịch bản</Label>
                    <Input
                      id="name"
                      value={newScenario.name}
                      onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Kịch bản tăng trưởng mạnh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={newScenario.description}
                      onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mô tả chi tiết kịch bản..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thay đổi doanh thu (%)</Label>
                      <Input
                        type="number"
                        value={newScenario.revenue_change}
                        onChange={(e) => setNewScenario(prev => ({ ...prev, revenue_change: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thay đổi chi phí (%)</Label>
                      <Input
                        type="number"
                        value={newScenario.cost_change}
                        onChange={(e) => setNewScenario(prev => ({ ...prev, cost_change: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreateScenario} disabled={createScenario.isPending || !newScenario.name}>
                    {createScenario.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Tạo kịch bản
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Compare Dialog */}
            <Dialog open={isCompareDialogOpen} onOpenChange={setIsCompareDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={localScenarios.length < 2}
                  onClick={() => {
                    if (localScenarios.length >= 2) {
                      setCompareScenarios([localScenarios[0].id, localScenarios[1].id]);
                    }
                  }}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  So sánh
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5" />
                    So sánh kịch bản chi tiết
                  </DialogTitle>
                  <DialogDescription>
                    Chọn 2 kịch bản để so sánh các chỉ số tài chính
                  </DialogDescription>
                </DialogHeader>

                {/* Scenario Selectors */}
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Kịch bản 1</Label>
                    <select
                      value={compareScenarios[0] || ''}
                      onChange={(e) => setCompareScenarios([e.target.value, compareScenarios[1]])}
                      className="w-full bg-muted rounded-md px-3 py-2 text-sm border border-border"
                    >
                      <option value="">Chọn kịch bản...</option>
                      {localScenarios.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === compareScenarios[1]}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kịch bản 2</Label>
                    <select
                      value={compareScenarios[1] || ''}
                      onChange={(e) => setCompareScenarios([compareScenarios[0], e.target.value])}
                      className="w-full bg-muted rounded-md px-3 py-2 text-sm border border-border"
                    >
                      <option value="">Chọn kịch bản...</option>
                      {localScenarios.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === compareScenarios[0]}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Comparison Content */}
                {comparedScenariosData && (
                  <div className="space-y-6">
                    {/* Header Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4 border-l-4 border-l-primary">
                        <h4 className="font-semibold text-primary">{comparedScenariosData.scenario1.name}</h4>
                        <p className="text-sm text-muted-foreground">{comparedScenariosData.scenario1.description}</p>
                      </Card>
                      <Card className="p-4 border-l-4 border-l-info">
                        <h4 className="font-semibold text-info">{comparedScenariosData.scenario2.name}</h4>
                        <p className="text-sm text-muted-foreground">{comparedScenariosData.scenario2.description}</p>
                      </Card>
                    </div>

                    {/* Detailed Comparison Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold">Chỉ số</th>
                            <th className="text-right py-3 px-4 font-semibold text-primary">
                              {comparedScenariosData.scenario1.name}
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-info">
                              {comparedScenariosData.scenario2.name}
                            </th>
                            <th className="text-right py-3 px-4 font-semibold">Chênh lệch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Input Parameters */}
                          <tr className="bg-muted/30">
                            <td colSpan={4} className="py-2 px-4 font-semibold text-sm text-muted-foreground">
                              Thông số đầu vào
                            </td>
                          </tr>
                          {[
                            { label: 'Tăng trưởng doanh thu', key1: comparedScenariosData.scenario1.revenueGrowth, key2: comparedScenariosData.scenario2.revenueGrowth, format: 'percent' as const },
                            { label: 'Thay đổi chi phí', key1: comparedScenariosData.scenario1.costChange, key2: comparedScenariosData.scenario2.costChange, format: 'percent' as const },
                            { label: 'Biên lợi nhuận gộp', key1: comparedScenariosData.scenario1.grossMargin, key2: comparedScenariosData.scenario2.grossMargin, format: 'percent' as const },
                            { label: 'DSO (Ngày thu tiền)', key1: comparedScenariosData.scenario1.arDays, key2: comparedScenariosData.scenario2.arDays, format: 'days' as const },
                            { label: 'DPO (Ngày trả tiền)', key1: comparedScenariosData.scenario1.apDays, key2: comparedScenariosData.scenario2.apDays, format: 'days' as const },
                            { label: 'DIO (Ngày tồn kho)', key1: comparedScenariosData.scenario1.inventoryDays, key2: comparedScenariosData.scenario2.inventoryDays, format: 'days' as const },
                          ].map((row, idx) => {
                            const comparison = renderComparisonValue(row.key1, row.key2, row.format);
                            return (
                              <tr key={idx} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="py-3 px-4">{row.label}</td>
                                <td className="py-3 px-4 text-right font-medium text-primary">{comparison.formattedVal1}</td>
                                <td className="py-3 px-4 text-right font-medium text-info">{comparison.formattedVal2}</td>
                                <td className={cn('py-3 px-4 text-right font-medium', comparison.diff > 0 ? 'text-success' : comparison.diff < 0 ? 'text-destructive' : '')}>
                                  {comparison.formattedDiff}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Output KPIs */}
                          <tr className="bg-muted/30">
                            <td colSpan={4} className="py-2 px-4 font-semibold text-sm text-muted-foreground">
                              Kết quả dự báo
                            </td>
                          </tr>
                          {[
                            { label: 'Doanh thu dự báo', key1: comparedScenariosData.projected1.revenue, key2: comparedScenariosData.projected2.revenue, format: 'currency' as const },
                            { label: 'EBITDA dự báo', key1: comparedScenariosData.projected1.ebitda, key2: comparedScenariosData.projected2.ebitda, format: 'currency' as const },
                            { label: 'Tiền mặt dự báo', key1: comparedScenariosData.projected1.cash, key2: comparedScenariosData.projected2.cash, format: 'currency' as const },
                            { label: 'Biên lợi nhuận', key1: comparedScenariosData.projected1.grossMargin, key2: comparedScenariosData.projected2.grossMargin, format: 'percent' as const },
                            { label: 'CCC (Vòng quay tiền)', key1: comparedScenariosData.projected1.ccc, key2: comparedScenariosData.projected2.ccc, format: 'days' as const },
                          ].map((row, idx) => {
                            const comparison = renderComparisonValue(row.key1, row.key2, row.format);
                            const isBetter = row.label.includes('CCC') 
                              ? comparison.diff < 0 
                              : comparison.diff > 0;
                            return (
                              <tr key={`output-${idx}`} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="py-3 px-4 font-medium">{row.label}</td>
                                <td className="py-3 px-4 text-right font-semibold text-primary">{comparison.formattedVal1}</td>
                                <td className="py-3 px-4 text-right font-semibold text-info">{comparison.formattedVal2}</td>
                                <td className="py-3 px-4 text-right">
                                  <span className={cn(
                                    'inline-flex items-center gap-1 font-semibold',
                                    isBetter ? 'text-success' : comparison.diff === 0 ? '' : 'text-destructive'
                                  )}>
                                    {isBetter ? <TrendingUp className="w-3 h-3" /> : comparison.diff !== 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                    {comparison.formattedDiff}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Changes vs Baseline */}
                          <tr className="bg-muted/30">
                            <td colSpan={4} className="py-2 px-4 font-semibold text-sm text-muted-foreground">
                              Thay đổi so với hiện tại
                            </td>
                          </tr>
                          {[
                            { label: 'Thay đổi doanh thu', key1: comparedScenariosData.projected1.revenueChange, key2: comparedScenariosData.projected2.revenueChange },
                            { label: 'Thay đổi EBITDA', key1: comparedScenariosData.projected1.ebitdaChange, key2: comparedScenariosData.projected2.ebitdaChange },
                            { label: 'Thay đổi tiền mặt', key1: comparedScenariosData.projected1.cashChange, key2: comparedScenariosData.projected2.cashChange },
                          ].map((row, idx) => (
                            <tr key={`change-${idx}`} className="border-t border-border/50 hover:bg-muted/20">
                              <td className="py-3 px-4">{row.label}</td>
                              <td className={cn('py-3 px-4 text-right font-medium', row.key1 >= 0 ? 'text-success' : 'text-destructive')}>
                                {row.key1 >= 0 ? '+' : ''}{row.key1.toFixed(1)}%
                              </td>
                              <td className={cn('py-3 px-4 text-right font-medium', row.key2 >= 0 ? 'text-success' : 'text-destructive')}>
                                {row.key2 >= 0 ? '+' : ''}{row.key2.toFixed(1)}%
                              </td>
                              <td className={cn('py-3 px-4 text-right font-medium', row.key2 > row.key1 ? 'text-success' : row.key2 < row.key1 ? 'text-destructive' : '')}>
                                {row.key2 > row.key1 ? <Check className="w-4 h-4 inline mr-1" /> : row.key2 < row.key1 ? <X className="w-4 h-4 inline mr-1" /> : '='}
                                {row.key2 > row.key1 ? 'Tốt hơn' : row.key2 < row.key1 ? 'Kém hơn' : 'Bằng nhau'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Radar Chart */}
                    <div className="data-card">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-info" />
                        So sánh trực quan các chỉ số
                      </h4>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart 
                            cx="50%" 
                            cy="50%" 
                            outerRadius="80%" 
                            data={[
                              { 
                                metric: 'Doanh thu', 
                                scenario1: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected1.revenueChange * 2)),
                                scenario2: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected2.revenueChange * 2)),
                                fullMark: 100 
                              },
                              { 
                                metric: 'EBITDA', 
                                scenario1: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected1.ebitdaChange * 2)),
                                scenario2: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected2.ebitdaChange * 2)),
                                fullMark: 100 
                              },
                              { 
                                metric: 'Tiền mặt', 
                                scenario1: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected1.cashChange * 2)),
                                scenario2: Math.min(100, Math.max(0, 50 + comparedScenariosData.projected2.cashChange * 2)),
                                fullMark: 100 
                              },
                              { 
                                metric: 'Biên LN', 
                                scenario1: Math.min(100, Math.max(0, comparedScenariosData.scenario1.grossMargin * 2)),
                                scenario2: Math.min(100, Math.max(0, comparedScenariosData.scenario2.grossMargin * 2)),
                                fullMark: 100 
                              },
                              { 
                                metric: 'DSO', 
                                scenario1: Math.min(100, Math.max(0, 100 - comparedScenariosData.scenario1.arDays)),
                                scenario2: Math.min(100, Math.max(0, 100 - comparedScenariosData.scenario2.arDays)),
                                fullMark: 100 
                              },
                              { 
                                metric: 'CCC', 
                                scenario1: Math.min(100, Math.max(0, 100 - comparedScenariosData.projected1.ccc)),
                                scenario2: Math.min(100, Math.max(0, 100 - comparedScenariosData.projected2.ccc)),
                                fullMark: 100 
                              },
                            ]}
                          >
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis 
                              dataKey="metric" 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <PolarRadiusAxis 
                              angle={30} 
                              domain={[0, 100]} 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            />
                            <Radar
                              name={comparedScenariosData.scenario1.name}
                              dataKey="scenario1"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                            <Radar
                              name={comparedScenariosData.scenario2.name}
                              dataKey="scenario2"
                              stroke="hsl(var(--info))"
                              fill="hsl(var(--info))"
                              fillOpacity={0.3}
                              strokeWidth={2}
                            />
                            <Legend />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number) => `${value.toFixed(0)} điểm`}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Điểm số cao hơn = hiệu suất tốt hơn (DSO và CCC được đảo ngược vì giá trị thấp hơn tốt hơn)
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className={cn(
                        'p-4',
                        comparedScenariosData.projected1.ebitda > comparedScenariosData.projected2.ebitda 
                          ? 'bg-success/10 border-success' 
                          : 'bg-muted'
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">EBITDA tốt hơn</span>
                          {comparedScenariosData.projected1.ebitda > comparedScenariosData.projected2.ebitda && (
                            <Badge className="bg-success">Ưu tiên</Badge>
                          )}
                        </div>
                        <p className="text-xl font-bold mt-2">{formatVNDCompact(comparedScenariosData.projected1.ebitda)}</p>
                      </Card>
                      <Card className={cn(
                        'p-4',
                        comparedScenariosData.projected2.ebitda > comparedScenariosData.projected1.ebitda 
                          ? 'bg-success/10 border-success' 
                          : 'bg-muted'
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">EBITDA tốt hơn</span>
                          {comparedScenariosData.projected2.ebitda > comparedScenariosData.projected1.ebitda && (
                            <Badge className="bg-success">Ưu tiên</Badge>
                          )}
                        </div>
                        <p className="text-xl font-bold mt-2">{formatVNDCompact(comparedScenariosData.projected2.ebitda)}</p>
                      </Card>
                    </div>
                  </div>
                )}

                {!comparedScenariosData && (
                  <div className="py-12 text-center text-muted-foreground">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Chọn 2 kịch bản để xem so sánh chi tiết</p>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCompareDialogOpen(false)}>
                    Đóng
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              size="sm"
              onClick={() => {
                if (localScenarios.length > 0) {
                  setIsSimulating(true);
                  setTimeout(() => {
                    setMonteCarloResult(runMonteCarloSimulation(localScenarios, currentKPIs.revenue, numSimulations));
                    setIsSimulating(false);
                  }, 100);
                }
              }}
              disabled={localScenarios.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              Chạy mô phỏng
            </Button>
          </div>
        </motion.div>

        {/* Current KPIs Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="data-card"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            KPI Hiện tại (Baseline)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-primary/5">
              <p className="text-xs text-muted-foreground mb-1">Doanh thu/tháng</p>
              <p className="text-lg font-bold text-primary">{formatVNDCompact(currentKPIs.revenue)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/5">
              <p className="text-xs text-muted-foreground mb-1">Tiền mặt</p>
              <p className="text-lg font-bold text-success">{formatVNDCompact(currentKPIs.cashToday)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-info/5">
              <p className="text-xs text-muted-foreground mb-1">EBITDA</p>
              <p className="text-lg font-bold text-info">{formatVNDCompact(currentKPIs.ebitda)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/5">
              <p className="text-xs text-muted-foreground mb-1">DSO</p>
              <p className="text-lg font-bold text-warning">{currentKPIs.dso} ngày</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">CCC</p>
              <p className="text-lg font-bold">{currentKPIs.ccc} ngày</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/5">
              <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
              <p className="text-lg font-bold text-success">{currentKPIs.grossMargin}%</p>
            </div>
          </div>
        </motion.div>

        {/* Primary Scenario Comparison Panel - So sánh Thực tế vs Mục tiêu */}
        {primaryScenario && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="data-card border-2 border-warning/30 bg-gradient-to-r from-warning/5 to-transparent"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-warning" />
                So sánh Thực tế vs Kịch bản chính: <span className="text-warning">{primaryScenario.name}</span>
              </h3>
              <Badge variant="outline" className="border-warning text-warning">
                <Star className="w-3 h-3 mr-1 fill-warning" />
                Kế hoạch mục tiêu
              </Badge>
            </div>
            
            {(() => {
              const primaryProjected = projectedKPIs.find(p => p.id === primaryScenario.id);
              const primaryParams = localScenarios.find(s => s.id === primaryScenario.id);
              if (!primaryProjected || !primaryParams) return null;

              // Tính toán các số thực tế từ KPI
              const actualMonthlyRevenue = currentKPIs.revenue;
              const actualGrossMargin = currentKPIs.grossMargin;
              const actualCogs = actualMonthlyRevenue * (1 - actualGrossMargin / 100);
              const actualGrossProfit = actualMonthlyRevenue * (actualGrossMargin / 100);
              
              // Estimate OPEX from EBITDA: EBITDA = Gross Profit - OPEX
              const actualOpex = actualGrossProfit - (currentKPIs.ebitda / 12);
              const actualOpexPercent = actualMonthlyRevenue > 0 ? (actualOpex / actualMonthlyRevenue) * 100 : 25;
              
              // Target calculations based on scenario params
              const targetMonthlyRevenue = actualMonthlyRevenue * (1 + primaryParams.revenueGrowth / 100);
              const targetCogs = targetMonthlyRevenue * (1 - primaryParams.grossMargin / 100);
              const targetGrossProfit = targetMonthlyRevenue * (primaryParams.grossMargin / 100);
              const targetOpexPercent = actualOpexPercent * (1 + primaryParams.opexChange / 100);
              const targetOpex = targetMonthlyRevenue * (targetOpexPercent / 100);

              // Input parameters comparison
              const inputParams = [
                {
                  category: 'Doanh thu tháng',
                  icon: DollarSign,
                  currentValue: actualMonthlyRevenue,
                  targetValue: targetMonthlyRevenue,
                  targetSetting: `${primaryParams.revenueGrowth >= 0 ? '+' : ''}${primaryParams.revenueGrowth}%`,
                  format: 'currency' as const,
                  description: 'Tăng trưởng doanh thu mục tiêu',
                  betterWhenHigher: true,
                },
                {
                  category: 'Giá vốn hàng bán (COGS)',
                  icon: TrendingDown,
                  currentValue: actualCogs,
                  targetValue: targetCogs,
                  targetSetting: `${(100 - primaryParams.grossMargin).toFixed(1)}% DT`,
                  format: 'currency' as const,
                  description: 'Chi phí sản xuất/mua hàng',
                  betterWhenHigher: false,
                },
                {
                  category: 'Lợi nhuận gộp',
                  icon: TrendingUp,
                  currentValue: actualGrossProfit,
                  targetValue: targetGrossProfit,
                  targetSetting: `${primaryParams.grossMargin}% margin`,
                  format: 'currency' as const,
                  description: 'Doanh thu - COGS',
                  betterWhenHigher: true,
                },
                {
                  category: 'Chi phí hoạt động (OPEX)',
                  icon: Wallet,
                  currentValue: actualOpex,
                  targetValue: targetOpex,
                  targetSetting: `${primaryParams.opexChange >= 0 ? '+' : ''}${primaryParams.opexChange}%`,
                  format: 'currency' as const,
                  description: 'Lương, thuê, tiện ích, marketing...',
                  betterWhenHigher: false,
                },
                {
                  category: 'Biên lợi nhuận gộp',
                  icon: Percent,
                  currentValue: actualGrossMargin,
                  targetValue: primaryParams.grossMargin,
                  targetSetting: `${primaryParams.grossMargin}%`,
                  format: 'percent' as const,
                  description: '(DT - COGS) / DT',
                  betterWhenHigher: true,
                },
                {
                  category: 'DSO (Ngày thu tiền)',
                  icon: Clock,
                  currentValue: currentKPIs.dso,
                  targetValue: primaryParams.arDays,
                  targetSetting: `${primaryParams.arDays} ngày`,
                  format: 'days' as const,
                  description: 'Thời gian thu hồi công nợ',
                  betterWhenHigher: false,
                },
                {
                  category: 'DPO (Ngày trả tiền)',
                  icon: Clock,
                  currentValue: 35, // Simplified - could be fetched
                  targetValue: primaryParams.apDays,
                  targetSetting: `${primaryParams.apDays} ngày`,
                  format: 'days' as const,
                  description: 'Thời gian thanh toán nhà cung cấp',
                  betterWhenHigher: true, // Higher DPO = better cash flow
                },
                {
                  category: 'DIO (Ngày tồn kho)',
                  icon: RefreshCw,
                  currentValue: 28, // Simplified - could be fetched
                  targetValue: primaryParams.inventoryDays,
                  targetSetting: `${primaryParams.inventoryDays} ngày`,
                  format: 'days' as const,
                  description: 'Thời gian quay vòng hàng tồn kho',
                  betterWhenHigher: false,
                },
              ];

              // Calculated output KPIs
              const targetEbitda = targetGrossProfit - targetOpex;
              const actualMonthlyEbitda = currentKPIs.ebitda / 12;
              const targetCcc = primaryParams.arDays + primaryParams.inventoryDays - primaryParams.apDays;

              return (
                <div className="space-y-6">
                  {/* Input Parameters Section */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-info" />
                      Các tham số ảnh hưởng (Input)
                    </h4>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-sm">Tham số</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm">
                              <Badge variant="outline" className="text-xs">Thực tế</Badge>
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-sm">
                              <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">Mục tiêu</Badge>
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-sm">Cài đặt kế hoạch</th>
                            <th className="text-right py-3 px-4 font-semibold text-sm">Chênh lệch</th>
                            <th className="text-center py-3 px-4 font-semibold text-sm">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inputParams.map((item, idx) => {
                            const diff = item.targetValue - item.currentValue;
                            
                            const isOnTrack = item.betterWhenHigher 
                              ? item.currentValue >= item.targetValue * 0.95
                              : item.currentValue <= item.targetValue * 1.05;
                            const isBehind = item.betterWhenHigher
                              ? item.currentValue < item.targetValue * 0.7
                              : item.currentValue > item.targetValue * 1.3;

                            let formattedCurrent = '';
                            let formattedTarget = '';
                            let formattedDiff = '';
                            
                            if (item.format === 'currency') {
                              formattedCurrent = formatVNDCompact(item.currentValue);
                              formattedTarget = formatVNDCompact(item.targetValue);
                              formattedDiff = `${diff >= 0 ? '+' : ''}${formatVNDCompact(diff)}`;
                            } else if (item.format === 'percent') {
                              formattedCurrent = `${item.currentValue.toFixed(1)}%`;
                              formattedTarget = `${item.targetValue.toFixed(1)}%`;
                              formattedDiff = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
                            } else {
                              formattedCurrent = `${Math.round(item.currentValue)} ngày`;
                              formattedTarget = `${Math.round(item.targetValue)} ngày`;
                              formattedDiff = `${diff >= 0 ? '+' : ''}${Math.round(diff)} ngày`;
                            }

                            const isGoodDirection = item.betterWhenHigher ? diff >= 0 : diff <= 0;

                            return (
                              <tr key={idx} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      'w-8 h-8 rounded-lg flex items-center justify-center',
                                      isOnTrack && 'bg-success/10',
                                      isBehind && 'bg-destructive/10',
                                      !isOnTrack && !isBehind && 'bg-warning/10'
                                    )}>
                                      <item.icon className={cn(
                                        'w-4 h-4',
                                        isOnTrack && 'text-success',
                                        isBehind && 'text-destructive',
                                        !isOnTrack && !isBehind && 'text-warning'
                                      )} />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{item.category}</p>
                                      <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-semibold text-foreground">{formattedCurrent}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-bold text-warning">{formattedTarget}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge variant="outline" className="text-xs bg-muted/50">
                                    {item.targetSetting}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className={cn(
                                    'font-semibold flex items-center justify-end gap-1',
                                    isGoodDirection ? 'text-success' : 'text-destructive'
                                  )}>
                                    {isGoodDirection ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    {formattedDiff}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge 
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      isOnTrack && 'bg-success/10 text-success border-success/30',
                                      isBehind && 'bg-destructive/10 text-destructive border-destructive/30',
                                      !isOnTrack && !isBehind && 'bg-warning/10 text-warning border-warning/30'
                                    )}
                                  >
                                    {isOnTrack ? (
                                      <><Check className="w-3 h-3 mr-1" />Đạt</>
                                    ) : isBehind ? (
                                      <><X className="w-3 h-3 mr-1" />Chưa đạt</>
                                    ) : (
                                      'Đang tiến'
                                    )}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Output KPIs Section */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Kết quả dự kiến (Output)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">EBITDA/tháng</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Thực tế</p>
                            <p className="font-semibold">{formatVNDCompact(actualMonthlyEbitda)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Mục tiêu</p>
                            <p className="font-bold text-primary">{formatVNDCompact(targetEbitda)}</p>
                            <p className={cn(
                              'text-xs',
                              targetEbitda >= actualMonthlyEbitda ? 'text-success' : 'text-destructive'
                            )}>
                              {targetEbitda >= actualMonthlyEbitda ? '+' : ''}{formatVNDCompact(targetEbitda - actualMonthlyEbitda)}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-gradient-to-br from-info/5 to-transparent border-info/20">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCw className="w-4 h-4 text-info" />
                          <span className="text-sm font-medium">CCC (Vòng quay tiền)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Thực tế</p>
                            <p className="font-semibold">{currentKPIs.ccc} ngày</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Mục tiêu</p>
                            <p className="font-bold text-info">{targetCcc} ngày</p>
                            <p className={cn(
                              'text-xs',
                              targetCcc <= currentKPIs.ccc ? 'text-success' : 'text-destructive'
                            )}>
                              {targetCcc - currentKPIs.ccc >= 0 ? '+' : ''}{targetCcc - currentKPIs.ccc} ngày
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-gradient-to-br from-success/5 to-transparent border-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="w-4 h-4 text-success" />
                          <span className="text-sm font-medium">Tiền mặt ước tính</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Hiện tại</p>
                            <p className="font-semibold">{formatVNDCompact(currentKPIs.cashToday)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Mục tiêu</p>
                            <p className="font-bold text-success">{formatVNDCompact(primaryProjected.cash)}</p>
                            <p className={cn(
                              'text-xs',
                              primaryProjected.cash >= currentKPIs.cashToday ? 'text-success' : 'text-destructive'
                            )}>
                              {primaryProjected.cashChange >= 0 ? '+' : ''}{primaryProjected.cashChange.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Summary Stats */}
            {(() => {
              const primaryProjected = projectedKPIs.find(p => p.id === primaryScenario.id);
              if (!primaryProjected) return null;

              const revenueGap = primaryProjected.revenue - currentKPIs.revenue;
              const ebitdaGap = primaryProjected.ebitda - currentKPIs.ebitda;
              const dsoGap = currentKPIs.dso - (localScenarios.find(s => s.id === primaryScenario.id)?.arDays || 0);

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className={cn(
                    'p-4',
                    revenueGap <= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Khoảng cách Doanh thu</p>
                    <p className={cn(
                      'text-xl font-bold',
                      revenueGap <= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {revenueGap <= 0 ? 'Vượt ' : 'Thiếu '}
                      {formatVNDCompact(Math.abs(revenueGap))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {revenueGap <= 0 ? 'Đã đạt mục tiêu' : 'Để đạt kế hoạch'}
                    </p>
                  </Card>

                  <Card className={cn(
                    'p-4',
                    ebitdaGap <= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Khoảng cách EBITDA</p>
                    <p className={cn(
                      'text-xl font-bold',
                      ebitdaGap <= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {ebitdaGap <= 0 ? 'Vượt ' : 'Thiếu '}
                      {formatVNDCompact(Math.abs(ebitdaGap))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ebitdaGap <= 0 ? 'Đã đạt mục tiêu' : 'Để đạt kế hoạch'}
                    </p>
                  </Card>

                  <Card className={cn(
                    'p-4',
                    dsoGap >= 0 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Cải thiện DSO</p>
                    <p className={cn(
                      'text-xl font-bold',
                      dsoGap >= 0 ? 'text-success' : 'text-warning'
                    )}>
                      {dsoGap >= 0 ? 'Tốt hơn ' : 'Cần giảm '}
                      {Math.abs(dsoGap)} ngày
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dsoGap >= 0 ? 'So với mục tiêu' : 'Để đạt kế hoạch'}
                    </p>
                  </Card>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Monthly Plan Editor - Chi tiết kế hoạch theo tháng */}
        {primaryScenario && currentKPIs && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Kế hoạch chi tiết theo tháng</h3>
              <Badge variant="outline" className="text-xs">
                Điều chỉnh từng tháng - Tổng không đổi
              </Badge>
            </div>
            
            {(() => {
              const primaryParams = localScenarios.find(s => s.id === primaryScenario.id);
              if (!primaryParams) return null;

              const actualMonthlyRevenue = currentKPIs.revenue / 12;
              const targetMonthlyRevenue = actualMonthlyRevenue * (1 + primaryParams.revenueGrowth / 100);
              const targetAnnualRevenue = targetMonthlyRevenue * 12;

              const actualMonthlyEbitda = currentKPIs.ebitda / 12;
              const actualGrossMargin = currentKPIs.grossMargin;
              const actualGrossProfit = actualMonthlyRevenue * (actualGrossMargin / 100);
              const actualOpex = actualGrossProfit - actualMonthlyEbitda;
              
              const targetGrossProfit = targetMonthlyRevenue * (primaryParams.grossMargin / 100);
              const targetOpexPercent = (actualOpex / actualMonthlyRevenue) * 100 * (1 + primaryParams.opexChange / 100);
              const targetOpex = targetMonthlyRevenue * (targetOpexPercent / 100);
              const targetMonthlyEbitda = targetGrossProfit - targetOpex;
              const targetAnnualEbitda = targetMonthlyEbitda * 12;

              return (
                <MonthlyPlanSection
                  primaryScenarioId={primaryScenario.id}
                  currentKPIs={{
                    revenue: currentKPIs.revenue,
                    ebitda: currentKPIs.ebitda,
                    grossMargin: currentKPIs.grossMargin,
                  }}
                  targetRevenue={targetAnnualRevenue}
                  targetOpex={targetOpex * 12}
                  actualOpex={actualOpex * 12}
                  targetEbitda={targetAnnualEbitda}
                  revenueGrowth={primaryParams.revenueGrowth}
                  opexChange={primaryParams.opexChange}
                />
              );
            })()}
          </motion.div>
        )}

        {/* Scenario Cards - Chỉ hiện khi KHÔNG có kịch bản chính hoặc cần quản lý */}
        {!primaryScenario && localScenarios.length === 0 ? (
          <div className="data-card flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <GitBranch className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Chưa có kịch bản nào</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Tạo kịch bản đầu tiên để bắt đầu phân tích what-if
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo kịch bản mới
            </Button>
          </div>
        ) : !primaryScenario ? (
          <div className="grid grid-cols-1 gap-4">
            {localScenarios.map((scenario, index) => renderScenarioCard(scenario, index))}
          </div>
        ) : (
          /* Khi đã có kịch bản chính, chỉ hiển thị collapsible để quản lý các kịch bản */
          <details className="data-card">
            <summary className="cursor-pointer font-semibold text-muted-foreground flex items-center gap-2 py-2">
              <GitBranch className="w-4 h-4" />
              Quản lý kịch bản ({localScenarios.length} kịch bản)
              <ChevronDown className="w-4 h-4 ml-auto" />
            </summary>
            <div className="grid grid-cols-1 gap-4 mt-4">
              {localScenarios.map((scenario, index) => renderScenarioCard(scenario, index))}
            </div>
          </details>
        )}

        {localScenarios.length > 0 && (
          <Tabs defaultValue="simulation" className="space-y-6">
            <TabsList>
              <TabsTrigger value="simulation">Mô phỏng</TabsTrigger>
              <TabsTrigger value="montecarlo" className="flex items-center gap-1">
                <Dice5 className="w-4 h-4" />
                Monte Carlo
              </TabsTrigger>
              <TabsTrigger value="comparison">So sánh KPI</TabsTrigger>
              <TabsTrigger value="sensitivity">Phân tích độ nhạy</TabsTrigger>
            </TabsList>

            <TabsContent value="simulation" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Dự báo doanh thu 12 tháng theo kịch bản</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickFormatter={(v) => formatVNDCompact(v)}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      {localScenarios.map((s, i) => (
                        <Line 
                          key={s.id}
                          type="monotone" 
                          dataKey={s.id} 
                          stroke={`hsl(var(--${getScenarioColor(i)}))`}
                          strokeWidth={i === 0 ? 3 : 2} 
                          name={s.name} 
                          dot={false} 
                          strokeDasharray={i === 0 ? undefined : "5 5"}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="montecarlo" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="data-card mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Dice5 className="w-5 h-5 text-info" />
                        Mô phỏng Monte Carlo
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Phân tích xác suất rủi ro dựa trên {numSimulations.toLocaleString()} kịch bản ngẫu nhiên
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Số lần mô phỏng:</span>
                        <select 
                          value={numSimulations}
                          onChange={(e) => setNumSimulations(Number(e.target.value))}
                          className="bg-muted rounded-md px-3 py-1.5 text-sm border border-border"
                        >
                          <option value={1000}>1,000</option>
                          <option value={5000}>5,000</option>
                          <option value={10000}>10,000</option>
                          <option value={50000}>50,000</option>
                        </select>
                      </div>
                      <Button 
                        onClick={() => {
                          setIsSimulating(true);
                          setTimeout(() => {
                            setMonteCarloResult(runMonteCarloSimulation(localScenarios, currentKPIs.revenue, numSimulations));
                            setIsSimulating(false);
                          }, 100);
                        }}
                        disabled={isSimulating}
                      >
                        {isSimulating ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-pulse" />
                            Đang chạy...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Chạy mô phỏng
                          </>
                        )}
                      </Button>
                      {monteCarloResult && (
                        <Button 
                          variant="outline"
                          onClick={handleSaveMonteCarloResult}
                          disabled={isSaving || !user?.id}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Database className="w-4 h-4 mr-2" />
                              Lưu kết quả
                            </>
                          )}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        <History className="w-4 h-4 mr-2" />
                        Lịch sử ({savedMonteCarloResults?.length || 0})
                      </Button>
                    </div>
                  </div>
                </div>

                {/* History Panel */}
                {showHistory && savedMonteCarloResults && savedMonteCarloResults.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Lịch sử mô phỏng đã lưu
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {savedMonteCarloResults.map((result) => (
                        <div 
                          key={result.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {formatDateTime(result.created_at)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCount(result.simulation_count)} mô phỏng • EBITDA TB: {formatVNDCompact(result.mean_ebitda || 0)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                const data = result.distribution_data as any;
                                if (data) {
                                  setMonteCarloResult({
                                    revenueDistribution: [],
                                    cashDistribution: [],
                                    ebitdaDistribution: data.ebitdaDistribution || [],
                                    percentiles: data.percentiles || {
                                      p5: result.p10_ebitda || 0,
                                      p25: 0,
                                      p50: result.p50_ebitda || 0,
                                      p75: 0,
                                      p95: result.p90_ebitda || 0,
                                    },
                                    statistics: data.statistics || {
                                      mean: result.mean_ebitda || 0,
                                      stdDev: result.std_dev_ebitda || 0,
                                      min: result.min_ebitda || 0,
                                      max: result.max_ebitda || 0,
                                      var95: result.p10_ebitda || 0,
                                      cvar95: 0,
                                    },
                                    simulations: [],
                                  });
                                  setNumSimulations(result.simulation_count);
                                  setShowHistory(false);
                                }
                              }}
                            >
                              Xem
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMonteCarloResult.mutate(result.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {monteCarloResult ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <Card className="p-4 bg-card">
                        <p className="text-xs text-muted-foreground mb-1">EBITDA Trung bình</p>
                        <p className="text-lg font-bold text-primary">{formatVNDCompact(monteCarloResult.statistics.mean)}</p>
                      </Card>
                      <Card className="p-4 bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Độ lệch chuẩn</p>
                        <p className="text-lg font-bold text-info">{formatVNDCompact(monteCarloResult.statistics.stdDev)}</p>
                      </Card>
                      <Card className="p-4 bg-card">
                        <p className="text-xs text-muted-foreground mb-1">P50 (Median)</p>
                        <p className="text-lg font-bold">{formatVNDCompact(monteCarloResult.percentiles.p50)}</p>
                      </Card>
                      <Card className="p-4 bg-card border-l-4 border-l-warning">
                        <p className="text-xs text-muted-foreground mb-1">VaR 95%</p>
                        <p className="text-lg font-bold text-warning">{formatVNDCompact(monteCarloResult.statistics.var95)}</p>
                        <p className="text-xs text-muted-foreground">Rủi ro tối đa 95%</p>
                      </Card>
                      <Card className="p-4 bg-card border-l-4 border-l-destructive">
                        <p className="text-xs text-muted-foreground mb-1">CVaR 95%</p>
                        <p className="text-lg font-bold text-destructive">{formatVNDCompact(monteCarloResult.statistics.cvar95)}</p>
                        <p className="text-xs text-muted-foreground">Tổn thất TB xấu nhất</p>
                      </Card>
                      <Card className="p-4 bg-card">
                        <p className="text-xs text-muted-foreground mb-1">Khoảng biến động</p>
                        <p className="text-sm font-semibold">
                          {formatVNDCompact(monteCarloResult.statistics.min)} - {formatVNDCompact(monteCarloResult.statistics.max)}
                        </p>
                      </Card>
                    </div>

                    <div className="data-card">
                      <h3 className="font-semibold text-lg mb-2">Phân phối xác suất EBITDA</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Biểu đồ histogram thể hiện phân phối EBITDA từ {numSimulations.toLocaleString()} lần mô phỏng
                      </p>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={monteCarloResult.ebitdaDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="value" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickFormatter={(v) => formatVNDCompact(v)}
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickFormatter={(v) => `${v.toFixed(1)}%`}
                              label={{ value: 'Xác suất (%)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === 'frequency') return [`${value.toFixed(2)}%`, 'Xác suất'];
                                return [formatVNDCompact(value as number), name];
                              }}
                              labelFormatter={(v) => `EBITDA: ${formatVNDCompact(v)}`}
                            />
                            <Bar 
                              dataKey="frequency" 
                              fill="hsl(var(--primary))" 
                              opacity={0.7}
                              name="Xác suất"
                            />
                            <ReferenceLine 
                              x={monteCarloResult.statistics.mean} 
                              stroke="hsl(var(--success))" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: 'TB', position: 'top', fill: 'hsl(var(--success))', fontSize: 11 }}
                            />
                            <ReferenceLine 
                              x={monteCarloResult.statistics.var95} 
                              stroke="hsl(var(--warning))" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: 'VaR', position: 'top', fill: 'hsl(var(--warning))', fontSize: 11 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="data-card">
                      <h3 className="font-semibold text-lg mb-4">Khoảng tin cậy EBITDA</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Khoảng tin cậy 90% (P5 - P95)</span>
                            <span className="text-sm text-muted-foreground">
                              {formatVNDCompact(monteCarloResult.percentiles.p5)} → {formatVNDCompact(monteCarloResult.percentiles.p95)}
                            </span>
                          </div>
                          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="absolute h-full bg-info/30 rounded-full"
                              style={{ left: '5%', width: '90%' }}
                            />
                            <div 
                              className="absolute h-full w-1 bg-success"
                              style={{ left: '50%' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Badge variant="secondary" className="text-xs">
                                Median: {formatVNDCompact(monteCarloResult.percentiles.p50)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Khoảng tin cậy 50% (P25 - P75)</span>
                            <span className="text-sm text-muted-foreground">
                              {formatVNDCompact(monteCarloResult.percentiles.p25)} → {formatVNDCompact(monteCarloResult.percentiles.p75)}
                            </span>
                          </div>
                          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="absolute h-full bg-primary/40 rounded-full"
                              style={{ left: '25%', width: '50%' }}
                            />
                          </div>
                        </div>

                        <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Xác suất EBITDA &gt; 0</span>
                            <span className="text-2xl font-bold text-success">
                              {((monteCarloResult.simulations.filter(s => s.ebitda > 0).length / monteCarloResult.simulations.length) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="data-card">
                      <h3 className="font-semibold text-lg mb-2">Phân bố Doanh thu - EBITDA</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Mỗi điểm đại diện cho một kịch bản mô phỏng
                      </p>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={monteCarloResult.simulations}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="revenue" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickFormatter={(v) => formatVNDCompact(v)}
                              label={{ value: 'Doanh thu', position: 'bottom', style: { fontSize: 11 } }}
                            />
                            <YAxis 
                              dataKey="ebitda"
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11}
                              tickFormatter={(v) => formatVNDCompact(v)}
                              label={{ value: 'EBITDA', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number) => formatVNDCompact(value)}
                            />
                            <Scatter 
                              dataKey="ebitda" 
                              fill="hsl(var(--primary))"
                              opacity={0.3}
                            />
                            <ReferenceLine 
                              y={0} 
                              stroke="hsl(var(--destructive))" 
                              strokeWidth={1}
                              strokeDasharray="5 5"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-5 bg-success/5 border-success/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Kịch bản tốt nhất</h4>
                            <p className="text-xs text-muted-foreground">Top 5% kết quả</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-success">{formatVNDCompact(monteCarloResult.percentiles.p95)}</p>
                        <p className="text-sm text-muted-foreground mt-1">EBITDA P95</p>
                      </Card>

                      <Card className="p-5 bg-info/5 border-info/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-info" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Kịch bản trung bình</h4>
                            <p className="text-xs text-muted-foreground">Giá trị kỳ vọng</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-info">{formatVNDCompact(monteCarloResult.statistics.mean)}</p>
                        <p className="text-sm text-muted-foreground mt-1">EBITDA Mean</p>
                      </Card>

                      <Card className="p-5 bg-warning/5 border-warning/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-warning" />
                          </div>
                          <div>
                            <h4 className="font-semibold">Rủi ro tối đa</h4>
                            <p className="text-xs text-muted-foreground">VaR 95%</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-warning">{formatVNDCompact(monteCarloResult.statistics.var95)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Chỉ có 5% khả năng EBITDA thấp hơn mức này
                        </p>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="data-card flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center mb-4">
                      <Dice5 className="w-8 h-8 text-info" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Chưa có dữ liệu mô phỏng</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Chạy mô phỏng Monte Carlo để phân tích xác suất rủi ro dựa trên các thông số kịch bản hiện tại
                    </p>
                    <Button 
                      onClick={() => {
                        setIsSimulating(true);
                        setTimeout(() => {
                          setMonteCarloResult(runMonteCarloSimulation(localScenarios, currentKPIs.revenue, numSimulations));
                          setIsSimulating(false);
                        }, 100);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Chạy mô phỏng ngay
                    </Button>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="comparison">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="data-card">
                  <h3 className="font-semibold text-lg mb-4">So sánh KPI giữa các kịch bản</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Chỉ số</th>
                          <th className="text-right py-3 px-4 font-semibold">
                            <Badge variant="outline">Hiện tại</Badge>
                          </th>
                          {localScenarios.map((s, i) => (
                            <th key={s.id} className={cn('text-right py-3 px-4 font-semibold', `text-${getScenarioColor(i)}`)}>
                              {s.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Doanh thu', key: 'revenue', current: currentKPIs.revenue },
                          { name: 'EBITDA', key: 'ebitda', current: currentKPIs.ebitda },
                          { name: 'Tiền mặt', key: 'cash', current: currentKPIs.cashToday },
                          { name: 'DSO', key: 'dso', current: currentKPIs.dso, isDays: true },
                          { name: 'CCC', key: 'ccc', current: currentKPIs.ccc, isDays: true },
                          { name: 'Gross Margin', key: 'grossMargin', current: currentKPIs.grossMargin, isPercent: true },
                        ].map((metric) => {
                          const formatValue = (val: number) => {
                            if (metric.isDays) return `${val} ngày`;
                            if (metric.isPercent) return `${val}%`;
                            return formatVNDCompact(val);
                          };

                          return (
                            <tr key={metric.name} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-3 px-4 font-medium">{metric.name}</td>
                              <td className="py-3 px-4 text-right">{formatValue(metric.current)}</td>
                              {projectedKPIs.map((p, i) => (
                                <td key={p.id} className={cn('py-3 px-4 text-right', `text-${getScenarioColor(i)}`)}>
                                  {formatValue((p as any)[metric.key])}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="data-card">
                  <h3 className="font-semibold text-lg mb-4">So sánh trực quan</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          tickFormatter={(v) => formatVNDCompact(v)}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => formatVNDCompact(value)}
                        />
                        <Legend />
                        <Bar dataKey="current" name="Hiện tại" fill="hsl(var(--muted-foreground))" />
                        {localScenarios.map((s, i) => (
                          <Bar key={s.id} dataKey={s.id} name={s.name} fill={`hsl(var(--${getScenarioColor(i)}))`} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="sensitivity">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="data-card"
              >
                <h3 className="font-semibold text-lg mb-4">Phân tích độ nhạy lợi nhuận</h3>
                <p className="text-muted-foreground mb-6">Tác động của các yếu tố đến lợi nhuận ròng</p>
                
                <div className="space-y-4">
                  {[
                    { factor: 'Giá bán tăng 1%', impact: '+5.2%', direction: 'up' },
                    { factor: 'Chi phí nguyên vật liệu tăng 1%', impact: '-3.1%', direction: 'down' },
                    { factor: 'Chi phí nhân công tăng 1%', impact: '-2.4%', direction: 'down' },
                    { factor: 'Sản lượng tăng 1%', impact: '+4.8%', direction: 'up' },
                    { factor: 'DSO giảm 5 ngày', impact: '+1.8%', direction: 'up' },
                    { factor: 'Tỷ giá USD/VND tăng 1%', impact: '-1.5%', direction: 'down' },
                  ].map((item) => (
                    <div key={item.factor} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <span className="font-medium">{item.factor}</span>
                      <Badge variant={item.direction === 'up' ? 'default' : 'destructive'}>
                        {item.direction === 'up' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {item.impact}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        )}

        {/* AI Analysis Panel */}
        <ContextualAIPanel context="scenario" />
      </div>
    </>
  );
}
