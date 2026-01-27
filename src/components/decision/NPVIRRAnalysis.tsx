import { useState, useEffect, useMemo } from 'react';
import { Calculator, TrendingUp, Save, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatVNDCompact, formatDate } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import { AnimatedKPIRing } from './AnimatedKPIRing';
import { IRRGauge } from './IRRGauge';
import { DecisionWorkflowCard } from './DecisionWorkflowCard';
import { InlineAIAdvisor } from './InlineAIAdvisor';
import { SensitivityHeatmap } from './SensitivityHeatmap';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

type AdvisorContext = Record<string, any>;

export function NPVIRRAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [initialInvestment, setInitialInvestment] = useState(2000000000);
  const [discountRate, setDiscountRate] = useState(12);
  const [cashFlows, setCashFlows] = useState([
    400000000, 500000000, 600000000, 700000000, 800000000
  ]);

  // NPV Calculation
  const calculateNPV = (rate: number) => {
    const r = rate / 100;
    let npv = -initialInvestment;
    cashFlows.forEach((cf, i) => {
      npv += cf / Math.pow(1 + r, i + 1);
    });
    return npv;
  };

  // IRR Calculation using Newton-Raphson method
  const calculateIRR = () => {
    let irr = 0.1;
    for (let i = 0; i < 100; i++) {
      const npv = calculateNPV(irr * 100);
      let derivative = 0;
      cashFlows.forEach((cf, j) => {
        derivative -= (j + 1) * cf / Math.pow(1 + irr, j + 2);
      });
      if (Math.abs(derivative) < 0.0001) break;
      irr = irr - npv / derivative / initialInvestment;
    }
    return irr * 100;
  };

  const npv = calculateNPV(discountRate);
  const irr = calculateIRR();
  const totalCashFlows = cashFlows.reduce((a, b) => a + b, 0);
  const profitabilityIndex = (npv + initialInvestment) / initialInvestment;

  // Generate NPV profile data with multiple scenarios
  const npvProfileData = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const rate = i * 2;
      return {
        rate: `${rate}%`,
        rateNum: rate,
        npvBase: calculateNPV(rate),
        npvOptimistic: calculateNPV(rate) * 1.2,
        npvPessimistic: calculateNPV(rate) * 0.8,
      };
    });
  }, [initialInvestment, cashFlows]);

  // Mini heatmap data: Discount rate vs Cash flow variance
  const heatmapData = useMemo(() => {
    const data: { x: number; y: number; value: number }[] = [];
    for (let cfChange = -20; cfChange <= 20; cfChange += 5) {
      for (let drChange = -4; drChange <= 4; drChange += 1) {
        const adjustedCashFlows = cashFlows.map(cf => cf * (1 + cfChange / 100));
        const adjustedRate = discountRate + drChange;
        let adjNpv = -initialInvestment;
        adjustedCashFlows.forEach((cf, i) => {
          adjNpv += cf / Math.pow(1 + adjustedRate / 100, i + 1);
        });
        data.push({ x: drChange, y: cfChange, value: adjNpv / 1000000000 }); // In billions
      }
    }
    return data;
  }, [cashFlows, discountRate, initialInvestment]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights = [];
    
    if (npv > 0 && irr > discountRate) {
      insights.push({
        type: 'success' as const,
        message: `NPV dương và IRR ${irr.toFixed(1)}% > WACC ${discountRate}%. Dự án tạo giá trị.`,
        action: 'Xem chi tiết',
      });
    } else if (npv < 0) {
      insights.push({
        type: 'critical' as const,
        message: `NPV âm ${formatVNDCompact(npv)}. Dự án phá hủy giá trị tại discount rate hiện tại.`,
        action: 'Xem xét lại assumptions',
      });
    }

    const spread = irr - discountRate;
    if (spread < 3 && spread > 0) {
      insights.push({
        type: 'warning' as const,
        message: `IRR chỉ cao hơn WACC ${spread.toFixed(1)}%. Biên an toàn thấp.`,
        action: 'Phân tích rủi ro',
      });
    }

    return insights;
  }, [npv, irr, discountRate]);

  useEffect(() => {
    onContextChange?.({
      analysisType: 'npv-irr',
      inputs: { initialInvestment, discountRate, cashFlows },
      outputs: { npv, irr, totalCashFlows, profitabilityIndex },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInvestment, discountRate, cashFlows, npv, irr, totalCashFlows, profitabilityIndex]);

  const addYear = () => {
    setCashFlows([...cashFlows, 500000000]);
  };

  const removeYear = (index: number) => {
    if (cashFlows.length > 1) {
      setCashFlows(cashFlows.filter((_, i) => i !== index));
    }
  };

  const updateCashFlow = (index: number, value: number) => {
    const newCashFlows = [...cashFlows];
    newCashFlows[index] = value;
    setCashFlows(newCashFlows);
  };

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'npv_irr',
      title: `Phân tích NPV/IRR - ${formatDate(new Date())}`,
      description: `Đầu tư ${formatVNDCompact(initialInvestment)}, ${cashFlows.length} năm`,
      parameters: { initialInvestment, discountRate, cashFlows },
      results: { npv, irr, profitabilityIndex, totalCashFlows },
      recommendation: npv > 0 && irr > discountRate ? 'Khuyến nghị đầu tư' : 'Không khuyến nghị',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  const getConfidenceLevel = () => {
    if (npv > 0 && irr > discountRate + 5) return 85;
    if (npv > 0 && irr > discountRate) return 65;
    return 30;
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <InlineAIAdvisor 
        insights={aiInsights}
      />

      {/* KPI Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedKPIRing
          label="NPV"
          value={npv}
          maxValue={initialInvestment}
          formatValue={(v) => formatVNDCompact(v)}
          color={npv > 0 ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          subtitle={`tại ${discountRate}% chiết khấu`}
        />
        <AnimatedKPIRing
          label="IRR"
          value={irr}
          maxValue={30}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color={irr > discountRate ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          benchmark={{ value: discountRate, label: 'WACC' }}
          subtitle="Internal Rate of Return"
        />
        <AnimatedKPIRing
          label="Profitability Index"
          value={profitabilityIndex}
          maxValue={2}
          formatValue={(v) => `${v.toFixed(2)}x`}
          color={profitabilityIndex > 1 ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          benchmark={{ value: 1, label: 'Threshold' }}
          subtitle={profitabilityIndex > 1 ? 'Đáng đầu tư' : 'Không đáng'}
        />
        <AnimatedKPIRing
          label="Tổng dòng tiền"
          value={totalCashFlows}
          maxValue={initialInvestment * 2}
          formatValue={(v) => formatVNDCompact(v)}
          color="hsl(var(--primary))"
          subtitle={`${cashFlows.length} năm`}
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vốn đầu tư ban đầu</Label>
                <Input
                  type="number"
                  value={initialInvestment}
                  onChange={(e) => setInitialInvestment(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tỷ lệ chiết khấu (%)</Label>
                <Input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Dòng tiền theo năm</Label>
                <Button variant="outline" size="sm" onClick={addYear}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm năm
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {cashFlows.map((cf, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm w-16">Năm {i + 1}:</span>
                    <Input
                      type="number"
                      value={cf}
                      onChange={(e) => updateCashFlow(i, Number(e.target.value))}
                      className="flex-1"
                    />
                    {cashFlows.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeYear(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Lưu phân tích
            </Button>
          </CardContent>
        </Card>

        {/* NPV Profile Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>NPV Profile (Multi-scenario)</CardTitle>
            <CardDescription>NPV theo tỷ lệ chiết khấu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={npvProfileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="rate" />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip 
                    formatter={(v: number) => formatVNDCompact(v)}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="3 3" />
                  <ReferenceLine x={`${Math.round(irr)}%`} stroke="hsl(142 76% 36%)" strokeDasharray="3 3" label="IRR" />
                  <Area 
                    type="monotone" 
                    dataKey="npvOptimistic" 
                    name="Lạc quan (+20%)" 
                    fill="hsl(142 76% 36% / 0.1)" 
                    stroke="hsl(142 76% 36% / 0.3)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="npvPessimistic" 
                    name="Bi quan (-20%)" 
                    fill="hsl(var(--destructive) / 0.1)" 
                    stroke="hsl(var(--destructive) / 0.3)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="npvBase" 
                    name="Base case" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* IRR Gauge */}
        <IRRGauge irr={irr} wacc={discountRate} />
      </div>

      {/* Sensitivity Heatmap */}
      <SensitivityHeatmap
        data={heatmapData}
        xLabel="Discount Rate Δ (%)"
        yLabel="Cash Flow Δ (%)"
        title="NPV Sensitivity: Discount Rate vs Cash Flow"
        valueLabel="NPV (tỷ VND)"
      />

      {/* Decision Workflow */}
      <DecisionWorkflowCard
        recommendation={
          npv > 0 && irr > discountRate ? 'Khuyến nghị ĐẦU TƯ' : 'KHÔNG khuyến nghị đầu tư'
        }
        confidence={getConfidenceLevel()}
        metrics={[
          { label: 'NPV', value: formatVNDCompact(npv) },
          { label: 'IRR', value: `${irr.toFixed(1)}%` },
          { label: 'PI', value: `${profitabilityIndex.toFixed(2)}x` },
          { label: 'Spread', value: `${(irr - discountRate).toFixed(1)}%` },
        ]}
        onApprove={handleSave}
        onRequestData={() => {}}
        status="pending"
        icon={<TrendingUp className="h-6 w-6" />}
        variant={npv > 0 && irr > discountRate ? 'success' : 'danger'}
      />
    </div>
  );
}
