import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Calculator, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatVNDCompact, formatDate, formatPercent } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import { AnimatedKPIRing } from './AnimatedKPIRing';
import { DecisionWorkflowCard } from './DecisionWorkflowCard';
import { InlineAIAdvisor } from './InlineAIAdvisor';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

type AdvisorContext = Record<string, any>;

const INDUSTRY_BENCHMARK = {
  roi: 20, // 20% ROI threshold
  cagr: 10, // 10% CAGR industry average
};

export function ROIAnalysis({ onContextChange }: { onContextChange?: (ctx: AdvisorContext) => void }) {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [params, setParams] = useState({
    initialInvestment: 1000000000,
    year1Return: 200000000,
    year2Return: 350000000,
    year3Return: 500000000,
    year4Return: 400000000,
    year5Return: 300000000,
  });

  const totalReturns = params.year1Return + params.year2Return + params.year3Return + params.year4Return + params.year5Return;
  const netProfit = totalReturns - params.initialInvestment;
  const roi = (netProfit / params.initialInvestment) * 100;
  const annualizedROI = Math.pow(1 + roi / 100, 1 / 5) - 1;
  const investmentMultiple = totalReturns / params.initialInvestment;

  // Chart data with cumulative returns
  const chartData = useMemo(() => {
    let cumulative = -params.initialInvestment;
    const years = [
      { year: 'Năm 0', return: -params.initialInvestment, cumulative: -params.initialInvestment },
    ];
    
    [params.year1Return, params.year2Return, params.year3Return, params.year4Return, params.year5Return].forEach((ret, i) => {
      cumulative += ret;
      years.push({
        year: `Năm ${i + 1}`,
        return: ret,
        cumulative,
      });
    });
    
    return years;
  }, [params]);

  // Trend analysis
  const yearlyReturns = [params.year1Return, params.year2Return, params.year3Return, params.year4Return, params.year5Return];
  const peakYear = yearlyReturns.indexOf(Math.max(...yearlyReturns)) + 1;
  const isDecreasing = yearlyReturns[3] < yearlyReturns[2] || yearlyReturns[4] < yearlyReturns[3];

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights = [];
    
    if (roi > INDUSTRY_BENCHMARK.roi) {
      insights.push({
        type: 'success' as const,
        message: `ROI ${roi.toFixed(1)}% vượt ngưỡng industry ${INDUSTRY_BENCHMARK.roi}%`,
        action: 'Xem chi tiết phân tích',
      });
    }

    if (isDecreasing) {
      insights.push({
        type: 'warning' as const,
        message: `Lợi nhuận năm 4-5 có xu hướng giảm. Kiểm tra sustainability.`,
        action: 'Phân tích chi tiết',
      });
    }

    if (annualizedROI * 100 > INDUSTRY_BENCHMARK.cagr) {
      insights.push({
        type: 'info' as const,
        message: `CAGR ${(annualizedROI * 100).toFixed(1)}% cao hơn industry average ${INDUSTRY_BENCHMARK.cagr}%`,
      });
    }

    return insights;
  }, [roi, annualizedROI, isDecreasing]);

  useEffect(() => {
    onContextChange?.({
      analysisType: 'roi',
      inputs: params,
      outputs: {
        totalReturns,
        netProfit,
        roi,
        annualizedROI: annualizedROI * 100,
        investmentMultiple,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, totalReturns, netProfit, roi, annualizedROI, investmentMultiple]);

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'roi',
      title: `Phân tích ROI - ${formatDate(new Date())}`,
      description: `Đầu tư ${formatVNDCompact(params.initialInvestment)}`,
      parameters: params,
      results: {
        totalReturns,
        netProfit,
        roi,
        annualizedROI: annualizedROI * 100,
        investmentMultiple,
      },
      recommendation: roi > 20 ? 'Khuyến nghị đầu tư' : roi > 10 ? 'Cân nhắc đầu tư' : 'Không khuyến nghị',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  const getConfidenceLevel = () => {
    if (roi > 30 && !isDecreasing) return 90;
    if (roi > 20) return 75;
    if (roi > 10) return 50;
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
          label="ROI Tổng"
          value={roi}
          maxValue={100}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color={roi > 20 ? 'hsl(142 76% 36%)' : roi > 10 ? 'hsl(45 93% 47%)' : 'hsl(var(--destructive))'}
          benchmark={{ value: INDUSTRY_BENCHMARK.roi, label: 'Benchmark' }}
          subtitle="sau 5 năm"
        />
        <AnimatedKPIRing
          label="CAGR"
          value={annualizedROI * 100}
          maxValue={30}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color={annualizedROI * 100 > INDUSTRY_BENCHMARK.cagr ? 'hsl(142 76% 36%)' : 'hsl(45 93% 47%)'}
          benchmark={{ value: INDUSTRY_BENCHMARK.cagr, label: 'Industry' }}
          subtitle="hàng năm"
        />
        <AnimatedKPIRing
          label="Lợi nhuận ròng"
          value={netProfit}
          maxValue={params.initialInvestment * 2}
          formatValue={(v) => formatVNDCompact(v)}
          color={netProfit > 0 ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}
          subtitle="tổng 5 năm"
        />
        <AnimatedKPIRing
          label="Investment Multiple"
          value={investmentMultiple}
          maxValue={3}
          formatValue={(v) => `${v.toFixed(2)}x`}
          color={investmentMultiple > 1.5 ? 'hsl(142 76% 36%)' : 'hsl(45 93% 47%)'}
          benchmark={{ value: 1.5, label: 'Target' }}
          subtitle="Tổng thu hồi / Đầu tư"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Tham số đầu vào
            </CardTitle>
            <CardDescription>Nhập dữ liệu đầu tư và dự kiến lợi nhuận</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Vốn đầu tư ban đầu (VND)</Label>
              <Input
                type="number"
                value={params.initialInvestment}
                onChange={(e) => setParams({ ...params, initialInvestment: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lợi nhuận Năm 1</Label>
                <Input
                  type="number"
                  value={params.year1Return}
                  onChange={(e) => setParams({ ...params, year1Return: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Lợi nhuận Năm 2</Label>
                <Input
                  type="number"
                  value={params.year2Return}
                  onChange={(e) => setParams({ ...params, year2Return: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Lợi nhuận Năm 3</Label>
                <Input
                  type="number"
                  value={params.year3Return}
                  onChange={(e) => setParams({ ...params, year3Return: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Lợi nhuận Năm 4</Label>
                <Input
                  type="number"
                  value={params.year4Return}
                  onChange={(e) => setParams({ ...params, year4Return: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Lợi nhuận Năm 5</Label>
                <Input
                  type="number"
                  value={params.year5Return}
                  onChange={(e) => setParams({ ...params, year5Return: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saveAnalysis.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Lưu phân tích
            </Button>
          </CardContent>
        </Card>

        {/* Enhanced Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ lợi nhuận & Lũy kế</CardTitle>
            <CardDescription>
              Đỉnh lợi nhuận: Năm {peakYear} | {isDecreasing ? '⚠️ Xu hướng giảm cuối kỳ' : '✓ Ổn định'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatVNDCompact(v)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip 
                    formatter={(v: number) => formatVNDCompact(v)} 
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--border))" strokeWidth={2} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="return" 
                    name="Lợi nhuận năm" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cumulative" 
                    name="Lũy kế" 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Workflow */}
      <DecisionWorkflowCard
        recommendation={
          roi > 20 ? 'Khuyến nghị ĐẦU TƯ' : 
          roi > 10 ? 'CÂN NHẮC đầu tư' : 
          'KHÔNG khuyến nghị'
        }
        confidence={getConfidenceLevel()}
        metrics={[
          { label: 'ROI', value: formatPercent(roi) },
          { label: 'CAGR', value: formatPercent(annualizedROI, true) },
          { label: 'Net Profit', value: formatVNDCompact(netProfit) },
          { label: 'Multiple', value: `${investmentMultiple.toFixed(2)}x` },
        ]}
        onApprove={handleSave}
        onRequestData={() => {}}
        status="pending"
        icon={<TrendingUp className="h-6 w-6" />}
        variant={roi > 20 ? 'success' : roi > 10 ? 'warning' : 'danger'}
      />
    </div>
  );
}
