import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Scale, 
  Calculator, 
  TrendingUp, 
  Target,
  Clock,
  Activity,
  Save,
  BarChart3,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { formatVNDCompact, formatVND, formatCount, formatDate } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';

// New visual components
import { HeroDecisionCard } from '@/components/decision/HeroDecisionCard';
import { ScenarioSandbox, type ScenarioModifiers } from '@/components/decision/ScenarioSandbox';
import { SensitivityHeatmap } from '@/components/decision/SensitivityHeatmap';
import { DecisionWorkflowCard } from '@/components/decision/DecisionWorkflowCard';
import { InlineAIAdvisor, useDecisionInsights } from '@/components/decision/InlineAIAdvisor';
import { AnimatedKPIRing, KPIRingGrid } from '@/components/decision/AnimatedKPIRing';

// Existing components
import { DecisionAdvisorChat } from '@/components/decision/DecisionAdvisorChat';
import { ROIAnalysis } from '@/components/decision/ROIAnalysis';
import { NPVIRRAnalysis } from '@/components/decision/NPVIRRAnalysis';
import { PaybackAnalysis } from '@/components/decision/PaybackAnalysis';
import { SensitivityAnalysis } from '@/components/decision/SensitivityAnalysis';
import { SavedAnalysesList } from '@/components/decision/SavedAnalysesList';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

type AdvisorContext = Record<string, any>;

const defaultScenarioModifiers: ScenarioModifiers = {
  revenueMultiplier: 1,
  cogsMultiplier: 1,
  opexMultiplier: 1,
  volumeMultiplier: 1,
};

// Enhanced Make vs Buy Analysis with Hero Card
function EnhancedMakeVsBuyAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  const { t } = useLanguage();
  
  const [makeData, setMakeData] = useState({
    fixedCost: 500000000,
    variableCostPerUnit: 45000,
    volume: 10000,
  });
  
  const [buyData, setBuyData] = useState({
    pricePerUnit: 65000,
    volume: 10000,
  });

  const [scenarioModifiers, setScenarioModifiers] = useState<ScenarioModifiers>(defaultScenarioModifiers);

  // Apply scenario modifiers
  const adjustedMakeData = {
    ...makeData,
    fixedCost: makeData.fixedCost * scenarioModifiers.opexMultiplier,
    variableCostPerUnit: makeData.variableCostPerUnit * scenarioModifiers.cogsMultiplier,
    volume: Math.round(makeData.volume * scenarioModifiers.volumeMultiplier),
  };

  const adjustedBuyData = {
    ...buyData,
    pricePerUnit: buyData.pricePerUnit * scenarioModifiers.cogsMultiplier,
    volume: Math.round(buyData.volume * scenarioModifiers.volumeMultiplier),
  };

  const makeTotalCost = adjustedMakeData.fixedCost + (adjustedMakeData.variableCostPerUnit * adjustedMakeData.volume);
  const buyTotalCost = adjustedBuyData.pricePerUnit * adjustedBuyData.volume;
  const breakEvenVolume = Math.ceil(adjustedMakeData.fixedCost / (adjustedBuyData.pricePerUnit - adjustedMakeData.variableCostPerUnit));
  
  const recommendation = makeTotalCost < buyTotalCost ? 'make' : 'buy';
  const savings = Math.abs(makeTotalCost - buyTotalCost);

  // Insights hook
  const { insights, dismiss: dismissInsight } = useDecisionInsights('make-vs-buy', {
    makeTotalCost,
    buyTotalCost,
    breakEvenVolume,
    volume: adjustedMakeData.volume,
  });

  useEffect(() => {
    onContextChange?.({
      analysisType: 'make-vs-buy',
      inputs: { makeData: adjustedMakeData, buyData: adjustedBuyData, scenarioModifiers },
      outputs: { makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeData, buyData, scenarioModifiers, makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings]);

  const comparisonData = Array.from({ length: 10 }, (_, i) => {
    const vol = (i + 1) * 2000;
    return {
      volume: vol,
      make: adjustedMakeData.fixedCost + (adjustedMakeData.variableCostPerUnit * vol),
      buy: adjustedBuyData.pricePerUnit * vol,
    };
  });

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'make_vs_buy',
      title: `Make vs Buy - ${formatDate(new Date())}`,
      description: `${t('decision.selfProduce')} vs ${t('decision.outsource')} - ${formatCount(adjustedMakeData.volume)} ${t('decision.units')}`,
      parameters: { makeData, buyData, scenarioModifiers },
      results: { makeTotalCost, buyTotalCost, breakEvenVolume, recommendation, savings },
      recommendation: recommendation === 'make' ? t('decision.selfProduce') : t('decision.outsource'),
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  const confidenceScore = Math.min(95, Math.max(60, (savings / Math.max(makeTotalCost, buyTotalCost)) * 500 + 50));

  return (
    <div className="space-y-6">
      {/* Scenario Sandbox */}
      <ScenarioSandbox
        modifiers={scenarioModifiers}
        onModifiersChange={setScenarioModifiers}
      />

      {/* Hero Decision Card */}
      <HeroDecisionCard
        makeData={makeData}
        buyData={buyData}
        onMakeChange={setMakeData}
        onBuyChange={setBuyData}
      />

      {/* AI Insights */}
      {insights.length > 0 && (
        <InlineAIAdvisor
          insights={insights}
          onDismiss={dismissInsight}
        />
      )}

      {/* Cost Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('decision.costComparison')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="volume" tickFormatter={(v) => `${(v/1000)}K`} />
                <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                <Legend />
                <ReferenceLine x={breakEvenVolume} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: 'Break-even', fill: 'hsl(var(--destructive))' }} />
                <Line type="monotone" dataKey="make" name={t('decision.selfProduce')} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="buy" name={t('decision.outsource')} stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sensitivity Heatmap */}
        <SensitivityHeatmap
          baseRevenue={makeTotalCost}
          baseCogs={adjustedMakeData.variableCostPerUnit * adjustedMakeData.volume}
          baseOpex={adjustedMakeData.fixedCost}
        />

        {/* Decision Workflow */}
        <DecisionWorkflowCard
          recommendation={recommendation as 'make' | 'buy'}
          savings={savings}
          breakEvenVolume={breakEvenVolume}
          confidenceScore={confidenceScore}
          analysisType="Make vs Buy"
          onApprove={handleSave}
        />
      </div>
    </div>
  );
}

// Enhanced Break-even Analysis
function EnhancedBreakEvenAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  const { t } = useLanguage();
  
  const [params, setParams] = useState({
    fixedCosts: 2000000000,
    sellingPrice: 150000,
    variableCost: 90000,
    currentVolume: 50000,
  });

  const contributionMargin = params.sellingPrice - params.variableCost;
  const breakEvenUnits = Math.ceil(params.fixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * params.sellingPrice;
  const marginOfSafety = ((params.currentVolume - breakEvenUnits) / params.currentVolume) * 100;
  const currentRevenue = params.currentVolume * params.sellingPrice;
  const currentProfit = (params.currentVolume * contributionMargin) - params.fixedCosts;

  useEffect(() => {
    onContextChange?.({
      analysisType: 'break-even',
      inputs: params,
      outputs: { contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety, currentProfit },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety]);

  const chartData = Array.from({ length: 10 }, (_, i) => {
    const vol = (i + 1) * 10000;
    return {
      volume: vol,
      revenue: vol * params.sellingPrice,
      totalCost: params.fixedCosts + (vol * params.variableCost),
    };
  });

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'break_even',
      title: `Break-even Analysis - ${formatDate(new Date())}`,
      description: `${t('decision.breakEvenUnits')} - ${formatVNDCompact(params.fixedCosts)}`,
      parameters: params,
      results: { contributionMargin, breakEvenUnits, breakEvenRevenue, marginOfSafety },
      recommendation: marginOfSafety > 0 ? t('decision.aboveBreakeven') : t('decision.belowBreakeven'),
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  // KPI Ring data
  const kpiItems = [
    {
      value: breakEvenUnits,
      maxValue: breakEvenUnits * 2,
      label: t('decision.breakEvenUnits'),
      format: 'number' as const,
      thresholds: { good: breakEvenUnits * 0.5, warning: breakEvenUnits * 0.8 },
    },
    {
      value: marginOfSafety,
      maxValue: 100,
      label: t('decision.marginOfSafety'),
      format: 'percent' as const,
      trend: marginOfSafety > 0 ? 5 : -10,
      thresholds: { good: 20, warning: 10 },
    },
    {
      value: contributionMargin,
      maxValue: params.sellingPrice,
      label: 'Contribution Margin',
      format: 'currency' as const,
    },
    {
      value: Math.max(0, (contributionMargin / params.sellingPrice) * 100),
      maxValue: 100,
      label: 'CM Ratio',
      format: 'percent' as const,
      benchmark: 40,
      thresholds: { good: 40, warning: 25 },
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Rings */}
      <Card>
        <CardContent className="py-6">
          <KPIRingGrid items={kpiItems} size="md" />
        </CardContent>
      </Card>

      {/* Parameter Sliders */}
      <Card>
        <CardHeader>
          <CardTitle>{t('decision.adjustParams')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>{t('decision.fixedCost')}: {formatVNDCompact(params.fixedCosts)}</Label>
              <Slider 
                value={[params.fixedCosts]} 
                onValueChange={([v]) => setParams({ ...params, fixedCosts: v })} 
                min={500000000} 
                max={5000000000} 
                step={100000000} 
                className="mt-2" 
              />
            </div>
            <div>
              <Label>{t('decision.sellingPrice')}: {formatVND(params.sellingPrice)}</Label>
              <Slider 
                value={[params.sellingPrice]} 
                onValueChange={([v]) => setParams({ ...params, sellingPrice: v })} 
                min={100000} 
                max={300000} 
                step={5000} 
                className="mt-2" 
              />
            </div>
            <div>
              <Label>{t('decision.variableCost')}: {formatVND(params.variableCost)}</Label>
              <Slider 
                value={[params.variableCost]} 
                onValueChange={([v]) => setParams({ ...params, variableCost: v })} 
                min={50000} 
                max={150000} 
                step={5000} 
                className="mt-2" 
              />
            </div>
            <div>
              <Label>{t('decision.currentVolume')}: {params.currentVolume.toLocaleString()}</Label>
              <Slider 
                value={[params.currentVolume]} 
                onValueChange={([v]) => setParams({ ...params, currentVolume: v })} 
                min={10000} 
                max={100000} 
                step={5000} 
                className="mt-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Break-even Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('decision.breakEvenChart')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="volume" tickFormatter={(v) => `${(v/1000)}K`} />
                <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                <Legend />
                <ReferenceLine x={breakEvenUnits} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="revenue" name={t('decision.revenue')} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalCost" name={t('decision.totalCost')} stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sensitivity Heatmap */}
        <SensitivityHeatmap
          baseRevenue={currentRevenue}
          baseCogs={params.variableCost * params.currentVolume}
          baseOpex={params.fixedCosts}
        />

        {/* Decision Workflow */}
        <DecisionWorkflowCard
          recommendation={marginOfSafety > 0 ? 'invest' : 'hold'}
          savings={currentProfit}
          confidenceScore={Math.min(95, Math.max(50, marginOfSafety + 50))}
          analysisType="Break-even Analysis"
          onApprove={handleSave}
        />
      </div>
    </div>
  );
}

export default function DecisionSupportPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('make-vs-buy');
  const [advisorContext, setAdvisorContext] = useState<AdvisorContext>({});

  return (
    <>
      <Helmet>
        <title>{t('decision.title')} | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('decision.title')}
          subtitle={t('decision.subtitle')}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="make-vs-buy" className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Make vs Buy
                </TabsTrigger>
                <TabsTrigger value="break-even" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Break-even
                </TabsTrigger>
                <TabsTrigger value="roi" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ROI
                </TabsTrigger>
                <TabsTrigger value="npv-irr" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  NPV/IRR
                </TabsTrigger>
                <TabsTrigger value="payback" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Payback
                </TabsTrigger>
                <TabsTrigger value="sensitivity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sensitivity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="make-vs-buy" className="mt-6">
                <EnhancedMakeVsBuyAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="break-even" className="mt-6">
                <EnhancedBreakEvenAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="roi" className="mt-6">
                <ROIAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="npv-irr" className="mt-6">
                <NPVIRRAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="payback" className="mt-6">
                <PaybackAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
              <TabsContent value="sensitivity" className="mt-6">
                <SensitivityAnalysis onContextChange={setAdvisorContext} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div className="h-[500px]">
              <DecisionAdvisorChat analysisType={activeTab} context={advisorContext} />
            </div>
            <SavedAnalysesList />
          </div>
        </div>
      </div>
    </>
  );
}
