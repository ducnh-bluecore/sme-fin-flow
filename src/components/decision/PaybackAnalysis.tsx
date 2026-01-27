import { useState, useEffect, useMemo } from 'react';
import { Clock, Calculator, Save, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact, formatDate } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import { AnimatedKPIRing } from './AnimatedKPIRing';
import { PaybackTimeline } from './PaybackTimeline';
import { DecisionWorkflowCard } from './DecisionWorkflowCard';
import { InlineAIAdvisor } from './InlineAIAdvisor';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type AdvisorContext = Record<string, any>;

const INDUSTRY_BENCHMARK = {
  payback: 4, // 4 years is typical
};

export function PaybackAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [params, setParams] = useState({
    initialInvestment: 1500000000,
    annualCashFlow: 400000000,
    growthRate: 5,
    targetPayback: 4,
  });

  // Simple Payback Period
  const simplePayback = params.initialInvestment / params.annualCashFlow;

  // Discounted Payback Period (using 10% discount rate)
  const discountRate = 0.1;
  let cumulativePV = 0;
  let discountedPayback = 0;
  for (let year = 1; year <= 20; year++) {
    const cf = params.annualCashFlow * Math.pow(1 + params.growthRate / 100, year - 1);
    const pv = cf / Math.pow(1 + discountRate, year);
    cumulativePV += pv;
    if (cumulativePV >= params.initialInvestment && discountedPayback === 0) {
      discountedPayback = year - 1 + (params.initialInvestment - (cumulativePV - pv)) / pv;
      break;
    }
  }
  if (discountedPayback === 0 && cumulativePV < params.initialInvestment) {
    discountedPayback = 20; // Max out if never recovered
  }

  // Risk score based on payback vs target
  const riskScore = useMemo(() => {
    const margin = params.targetPayback - simplePayback;
    if (margin > 1) return 90;
    if (margin > 0) return 70;
    if (margin > -0.5) return 50;
    return 30;
  }, [simplePayback, params.targetPayback]);

  // Generate chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const year = i;
      let cumulative = 0;
      let cumulativeDiscounted = 0;
      for (let y = 1; y <= year; y++) {
        const cf = params.annualCashFlow * Math.pow(1 + params.growthRate / 100, y - 1);
        cumulative += cf;
        cumulativeDiscounted += cf / Math.pow(1 + discountRate, y);
      }
      return {
        year: `Năm ${year}`,
        cumulative: cumulative - params.initialInvestment,
        discounted: cumulativeDiscounted - params.initialInvestment,
        breakeven: 0,
      };
    });
  }, [params]);

  // What-if scenarios
  const scenarios = useMemo(() => {
    // Scenario 1: Cash flow delayed 6 months
    const delayedPayback = (params.initialInvestment / params.annualCashFlow) + 0.5;
    
    // Scenario 2: Zero growth
    const zeroGrowthPayback = params.initialInvestment / params.annualCashFlow;
    
    // Scenario 3: 10% lower cash flow
    const reducedCFPayback = params.initialInvestment / (params.annualCashFlow * 0.9);

    return [
      { name: 'Trì hoãn 6 tháng', payback: delayedPayback, impact: delayedPayback - simplePayback },
      { name: 'Growth = 0%', payback: zeroGrowthPayback, impact: zeroGrowthPayback - simplePayback },
      { name: 'Cash flow -10%', payback: reducedCFPayback, impact: reducedCFPayback - simplePayback },
    ];
  }, [params, simplePayback]);

  const isWithinTarget = simplePayback <= params.targetPayback;

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights = [];
    
    if (isWithinTarget) {
      insights.push({
        type: 'success' as const,
        message: `Payback ${simplePayback.toFixed(1)} năm đạt mục tiêu ${params.targetPayback} năm`,
        action: 'Xem chi tiết',
      });
    } else {
      insights.push({
        type: 'warning' as const,
        message: `Payback ${simplePayback.toFixed(1)} năm vượt mục tiêu ${params.targetPayback} năm`,
        action: 'Xem xét tăng cash flow',
      });
    }

    if (discountedPayback > simplePayback * 1.3) {
      insights.push({
        type: 'info' as const,
        message: `Discounted payback dài hơn 30% so với simple. Discount rate ảnh hưởng đáng kể.`,
      });
    }

    return insights;
  }, [simplePayback, discountedPayback, params.targetPayback, isWithinTarget]);

  useEffect(() => {
    onContextChange?.({
      analysisType: 'payback',
      inputs: params,
      outputs: {
        simplePayback,
        discountedPayback,
        discountRate: discountRate * 100,
        isWithinTarget,
        riskScore,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, simplePayback, discountedPayback, isWithinTarget, riskScore]);

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'payback',
      title: `Phân tích Payback - ${formatDate(new Date())}`,
      description: `Đầu tư ${formatVNDCompact(params.initialInvestment)}`,
      parameters: params,
      results: { simplePayback, discountedPayback, riskScore },
      recommendation: isWithinTarget ? 'Khuyến nghị đầu tư' : 'Cân nhắc thêm',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Visual Timeline */}
      <PaybackTimeline
        simplePayback={simplePayback}
        discountedPayback={discountedPayback}
        targetPayback={params.targetPayback}
        maxYears={10}
      />

      {/* AI Insights */}
      <InlineAIAdvisor 
        insights={aiInsights}
      />

      {/* KPI Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKPIRing
          label="Simple Payback"
          value={simplePayback}
          maxValue={params.targetPayback * 1.5}
          formatValue={(v) => `${v.toFixed(1)} năm`}
          color={simplePayback <= params.targetPayback ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          benchmark={{ value: params.targetPayback, label: 'Target' }}
        />
        <AnimatedKPIRing
          label="Discounted Payback"
          value={discountedPayback}
          maxValue={params.targetPayback * 2}
          formatValue={(v) => `${v.toFixed(1)} năm`}
          color={discountedPayback <= params.targetPayback + 1 ? 'hsl(142 76% 36%)' : 'hsl(45 93% 47%)'}
          subtitle="chiết khấu 10%"
        />
        <AnimatedKPIRing
          label="Target Achievement"
          value={isWithinTarget ? 100 : Math.max(0, (1 - (simplePayback - params.targetPayback) / params.targetPayback) * 100)}
          maxValue={100}
          formatValue={(v) => isWithinTarget ? '✓ Đạt' : `${v.toFixed(0)}%`}
          color={isWithinTarget ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          subtitle={`Mục tiêu: ${params.targetPayback} năm`}
        />
        <AnimatedKPIRing
          label="Risk Score"
          value={riskScore}
          maxValue={100}
          formatValue={(v) => `${v.toFixed(0)}`}
          color={riskScore > 70 ? 'hsl(142 76% 36%)' : riskScore > 50 ? 'hsl(45 93% 47%)' : 'hsl(var(--destructive))'}
          subtitle={riskScore > 70 ? 'Thấp' : riskScore > 50 ? 'Trung bình' : 'Cao'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Tham số đầu vào
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Vốn đầu tư ban đầu</Label>
              <Input
                type="number"
                value={params.initialInvestment}
                onChange={(e) => setParams({ ...params, initialInvestment: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Dòng tiền hàng năm</Label>
              <Input
                type="number"
                value={params.annualCashFlow}
                onChange={(e) => setParams({ ...params, annualCashFlow: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Tỷ lệ tăng trưởng</span>
                <span className="text-sm font-normal text-muted-foreground">{params.growthRate}%/năm</span>
              </Label>
              <Slider
                value={[params.growthRate]}
                onValueChange={([v]) => setParams({ ...params, growthRate: v })}
                min={0}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Mục tiêu thu hồi vốn</span>
                <span className="text-sm font-normal text-muted-foreground">{params.targetPayback} năm</span>
              </Label>
              <Slider
                value={[params.targetPayback]}
                onValueChange={([v]) => setParams({ ...params, targetPayback: v })}
                min={1}
                max={10}
                step={0.5}
                className="mt-2"
              />
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Lưu phân tích
            </Button>
          </CardContent>
        </Card>

        {/* Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Biểu đồ thu hồi vốn</CardTitle>
            <CardDescription>Dòng tiền lũy kế theo năm</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip 
                    formatter={(v: number) => formatVNDCompact(v)}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Hòa vốn" />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Lũy kế (không chiết khấu)"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="discounted"
                    name="Lũy kế (chiết khấu)"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* What-If Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Kịch bản What-If
            </CardTitle>
            <CardDescription>Tác động đến thời gian thu hồi vốn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenarios.map((scenario, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  scenario.impact > 1 
                    ? 'bg-red-500/5 border-red-500/20' 
                    : scenario.impact > 0.5 
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-muted border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{scenario.name}</span>
                  <Badge 
                    variant={scenario.impact > 1 ? 'destructive' : scenario.impact > 0.5 ? 'secondary' : 'outline'}
                  >
                    +{scenario.impact.toFixed(1)} năm
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Payback mới:</span>
                  <span className={`text-sm font-bold ${
                    scenario.payback > params.targetPayback ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {scenario.payback.toFixed(1)} năm
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t mt-4">
              <p className="text-xs text-muted-foreground">
                * Kịch bản cho thấy mức độ nhạy cảm của thời gian thu hồi vốn với các thay đổi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Workflow */}
      <DecisionWorkflowCard
        recommendation={
          isWithinTarget 
            ? 'Thời gian thu hồi vốn CHẤP NHẬN ĐƯỢC' 
            : 'Thời gian thu hồi vốn CẦN CÂN NHẮC'
        }
        confidence={riskScore}
        metrics={[
          { label: 'Simple', value: `${simplePayback.toFixed(1)} năm` },
          { label: 'Discounted', value: `${discountedPayback.toFixed(1)} năm` },
          { label: 'Target', value: `${params.targetPayback} năm` },
          { label: 'Risk', value: riskScore > 70 ? 'Thấp' : riskScore > 50 ? 'TB' : 'Cao' },
        ]}
        onApprove={handleSave}
        onRequestData={() => {}}
        status="pending"
        icon={<Clock className="h-6 w-6" />}
        variant={isWithinTarget ? 'success' : 'warning'}
      />
    </div>
  );
}
