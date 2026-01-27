import { useState, useMemo, useEffect } from 'react';
import { Activity, Save, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { formatVNDCompact, formatDate } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import { AnimatedKPIRing } from './AnimatedKPIRing';
import { TornadoChart } from './TornadoChart';
import { BreakEvenScenarios } from './BreakEvenScenarios';
import { SensitivityHeatmap } from './SensitivityHeatmap';
import { DecisionWorkflowCard } from './DecisionWorkflowCard';
import { InlineAIAdvisor } from './InlineAIAdvisor';

type AdvisorContext = Record<string, any>;

export function SensitivityAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [baseCase, setBaseCase] = useState({
    revenue: 10000000000,
    cogs: 6500000000,
    opex: 2000000000,
  });

  const [variations, setVariations] = useState({
    revenueRange: [-20, 20] as [number, number],
    cogsRange: [-15, 15] as [number, number],
    opexRange: [-10, 10] as [number, number],
  });

  const baseProfit = baseCase.revenue - baseCase.cogs - baseCase.opex;

  // Calculate sensitivity coefficients
  const sensitivityCoeffs = useMemo(() => {
    const revenueImpact = ((baseCase.revenue * 0.1) / baseProfit) * 100;
    const cogsImpact = ((baseCase.cogs * 0.1) / baseProfit) * 100;
    const opexImpact = ((baseCase.opex * 0.1) / baseProfit) * 100;

    return [
      { variable: 'Doanh thu', coefficient: revenueImpact, direction: 'positive' as const },
      { variable: 'COGS', coefficient: -cogsImpact, direction: 'negative' as const },
      { variable: 'OPEX', coefficient: -opexImpact, direction: 'negative' as const },
    ].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }, [baseCase, baseProfit]);

  // Tornado chart data
  const tornadoData = useMemo(() => {
    return [
      {
        variable: 'Doanh thu',
        minImpact: -((baseCase.revenue * 0.1) / baseProfit) * 100,
        maxImpact: ((baseCase.revenue * 0.1) / baseProfit) * 100,
      },
      {
        variable: 'COGS',
        minImpact: ((baseCase.cogs * 0.1) / baseProfit) * 100, // COGS down = profit up
        maxImpact: -((baseCase.cogs * 0.1) / baseProfit) * 100, // COGS up = profit down
      },
      {
        variable: 'OPEX',
        minImpact: ((baseCase.opex * 0.1) / baseProfit) * 100,
        maxImpact: -((baseCase.opex * 0.1) / baseProfit) * 100,
      },
    ];
  }, [baseCase, baseProfit]);

  // Break-even scenarios
  const breakEvenScenarios = useMemo(() => {
    const revenueBreakEven = (baseProfit / baseCase.revenue) * 100;
    const cogsBreakEven = (baseProfit / baseCase.cogs) * 100;
    const opexBreakEven = (baseProfit / baseCase.opex) * 100;

    const getRiskLevel = (change: number): 'low' | 'medium' | 'high' => {
      if (Math.abs(change) < 10) return 'high';
      if (Math.abs(change) < 20) return 'medium';
      return 'low';
    };

    return [
      {
        variable: 'Doanh thu',
        changeToBreakEven: -revenueBreakEven,
        direction: 'decrease' as const,
        riskLevel: getRiskLevel(revenueBreakEven),
      },
      {
        variable: 'COGS',
        changeToBreakEven: cogsBreakEven,
        direction: 'increase' as const,
        riskLevel: getRiskLevel(cogsBreakEven),
      },
      {
        variable: 'OPEX',
        changeToBreakEven: opexBreakEven,
        direction: 'increase' as const,
        riskLevel: getRiskLevel(opexBreakEven),
      },
    ];
  }, [baseCase, baseProfit]);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    const data: { x: number; y: number; value: number }[] = [];
    for (let revChange = -20; revChange <= 20; revChange += 5) {
      for (let cogsChange = -15; cogsChange <= 15; cogsChange += 5) {
        const newRevenue = baseCase.revenue * (1 + revChange / 100);
        const newCogs = baseCase.cogs * (1 + cogsChange / 100);
        const profit = newRevenue - newCogs - baseCase.opex;
        const margin = (profit / newRevenue) * 100;
        data.push({ x: revChange, y: cogsChange, value: margin });
      }
    }
    return data;
  }, [baseCase]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const mostSensitive = sensitivityCoeffs[0];
    const insights = [
      {
        type: 'warning' as const,
        message: `${mostSensitive.variable} là biến nhạy nhất. Thay đổi 10% → Lợi nhuận thay đổi ${Math.abs(mostSensitive.coefficient).toFixed(1)}%`,
        action: 'Thiết lập cảnh báo giám sát',
      },
    ];

    if (Math.abs(breakEvenScenarios[0].changeToBreakEven) < 15) {
      insights.push({
        type: 'warning' as const,
        message: `Buffer hòa vốn chỉ ${Math.abs(breakEvenScenarios[0].changeToBreakEven).toFixed(1)}%. Biên an toàn thấp.`,
        action: 'Xem xét đàm phán chi phí',
      });
    }

    return insights;
  }, [sensitivityCoeffs, breakEvenScenarios]);

  useEffect(() => {
    onContextChange?.({
      analysisType: 'sensitivity',
      inputs: { baseCase, variations },
      outputs: {
        baseProfit,
        sensitivityCoeffs,
        breakEvenScenarios,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCase, variations, baseProfit, sensitivityCoeffs, breakEvenScenarios]);

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'sensitivity',
      title: `Phân tích Độ nhạy - ${formatDate(new Date())}`,
      description: `Base profit: ${formatVNDCompact(baseProfit)}`,
      parameters: { baseCase, variations },
      results: { baseProfit, sensitivityCoeffs, breakEvenScenarios },
      recommendation: `Biến nhạy cảm nhất: ${sensitivityCoeffs[0].variable}`,
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  const mostSensitiveVar = sensitivityCoeffs[0];

  return (
    <div className="space-y-6">
      {/* Hero Card - Most Sensitive Variable */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-red-500/5 via-background to-background border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">Rủi ro cao nhất</Badge>
                </div>
                <h2 className="text-2xl font-bold">{mostSensitiveVar.variable}</h2>
                <p className="text-muted-foreground">
                  ±10% thay đổi → ±{Math.abs(mostSensitiveVar.coefficient).toFixed(1)}% lợi nhuận
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-red-500">
                  {Math.abs(mostSensitiveVar.coefficient).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Hệ số nhạy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <InlineAIAdvisor 
        insights={aiInsights}
      />

      {/* KPI Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKPIRing
          label="Lợi nhuận cơ sở"
          value={baseProfit}
          maxValue={baseCase.revenue * 0.3}
          formatValue={(v) => formatVNDCompact(v)}
          color="hsl(var(--primary))"
        />
        {sensitivityCoeffs.map((item, i) => (
          <AnimatedKPIRing
            key={item.variable}
            label={item.variable}
            value={Math.abs(item.coefficient)}
            maxValue={100}
            formatValue={(v) => `${v.toFixed(1)}%`}
            color={i === 0 ? 'hsl(var(--destructive))' : i === 1 ? 'hsl(45 93% 47%)' : 'hsl(var(--primary))'}
            subtitle="per 10% change"
            benchmark={i === 0 ? undefined : { value: Math.abs(sensitivityCoeffs[0].coefficient), label: 'Max' }}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TornadoChart 
          data={tornadoData}
          title="Tornado Chart - Tác động đến lợi nhuận"
          subtitle="Khi mỗi biến thay đổi ±10%"
        />

        <SensitivityHeatmap
          data={heatmapData}
          xLabel="Doanh thu (%)"
          yLabel="COGS (%)"
          title="Heatmap Margin theo Doanh thu & COGS"
        />
      </div>

      {/* Controls and Break-even */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Điều chỉnh phạm vi phân tích
            </CardTitle>
            <CardDescription>Thiết lập biên độ thay đổi cho từng biến</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="flex items-center justify-between">
                <span>Doanh thu</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {variations.revenueRange[0]}% đến {variations.revenueRange[1]}%
                </span>
              </Label>
              <Slider
                value={variations.revenueRange}
                onValueChange={(v) => setVariations({ ...variations, revenueRange: v as [number, number] })}
                min={-50}
                max={50}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatVNDCompact(baseCase.revenue * (1 + variations.revenueRange[0] / 100))} - {formatVNDCompact(baseCase.revenue * (1 + variations.revenueRange[1] / 100))}
              </p>
            </div>

            <div>
              <Label className="flex items-center justify-between">
                <span>COGS</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {variations.cogsRange[0]}% đến {variations.cogsRange[1]}%
                </span>
              </Label>
              <Slider
                value={variations.cogsRange}
                onValueChange={(v) => setVariations({ ...variations, cogsRange: v as [number, number] })}
                min={-30}
                max={30}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatVNDCompact(baseCase.cogs * (1 + variations.cogsRange[0] / 100))} - {formatVNDCompact(baseCase.cogs * (1 + variations.cogsRange[1] / 100))}
              </p>
            </div>

            <div>
              <Label className="flex items-center justify-between">
                <span>OPEX</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {variations.opexRange[0]}% đến {variations.opexRange[1]}%
                </span>
              </Label>
              <Slider
                value={variations.opexRange}
                onValueChange={(v) => setVariations({ ...variations, opexRange: v as [number, number] })}
                min={-30}
                max={30}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formatVNDCompact(baseCase.opex * (1 + variations.opexRange[0] / 100))} - {formatVNDCompact(baseCase.opex * (1 + variations.opexRange[1] / 100))}
              </p>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Lưu phân tích
            </Button>
          </CardContent>
        </Card>

        <BreakEvenScenarios 
          scenarios={breakEvenScenarios}
          baseProfit={baseProfit}
        />
      </div>

      {/* Decision Workflow */}
      <DecisionWorkflowCard
        recommendation={`${mostSensitiveVar.variable} là biến nhạy nhất - cần giám sát chặt`}
        confidence={Math.max(20, 100 - Math.abs(mostSensitiveVar.coefficient))}
        metrics={[
          { label: 'Base Profit', value: formatVNDCompact(baseProfit) },
          { label: 'Buffer thấp nhất', value: `${Math.abs(breakEvenScenarios[0].changeToBreakEven).toFixed(1)}%` },
        ]}
        onApprove={handleSave}
        onRequestData={() => {}}
        status="pending"
      />
    </div>
  );
}
