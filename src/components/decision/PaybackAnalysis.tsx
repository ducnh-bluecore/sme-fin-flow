import { useState } from 'react';
import { Clock, Calculator, Save, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { formatVNDCompact } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
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

export function PaybackAnalysis() {
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

  // Generate chart data
  const chartData = Array.from({ length: 10 }, (_, i) => {
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

  const isWithinTarget = simplePayback <= params.targetPayback;

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'payback',
      title: `Phân tích Payback - ${new Date().toLocaleDateString('vi-VN')}`,
      description: `Đầu tư ${formatVNDCompact(params.initialInvestment)}`,
      parameters: params,
      results: { simplePayback, discountedPayback },
      recommendation: isWithinTarget ? 'Khuyến nghị đầu tư' : 'Cân nhắc thêm',
      ai_insights: null,
      status: 'completed',
      approved_by: null,
      approved_at: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              Simple Payback
              <HoverCard>
                <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="font-mono text-sm">Payback = Đầu tư / Dòng tiền hàng năm</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${simplePayback <= params.targetPayback ? 'text-green-500' : 'text-red-500'}`}>
              {simplePayback.toFixed(1)} năm
            </div>
            <p className="text-sm text-muted-foreground">
              {simplePayback <= params.targetPayback ? `≤ ${params.targetPayback} năm ✓` : `> ${params.targetPayback} năm ✗`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              Discounted Payback
              <HoverCard>
                <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="font-mono text-sm">Thời gian thu hồi vốn có chiết khấu (10%)</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${discountedPayback <= params.targetPayback + 1 ? 'text-green-500' : 'text-yellow-500'}`}>
              {discountedPayback > 0 ? `${discountedPayback.toFixed(1)} năm` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">chiết khấu 10%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dòng tiền năm đầu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatVNDCompact(params.annualCashFlow)}</div>
            <p className="text-sm text-muted-foreground">tăng {params.growthRate}%/năm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mục tiêu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{params.targetPayback} năm</div>
            <p className="text-sm text-muted-foreground">thời gian thu hồi tối đa</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Label>Tỷ lệ tăng trưởng: {params.growthRate}%/năm</Label>
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
              <Label>Mục tiêu thu hồi vốn: {params.targetPayback} năm</Label>
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

        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ thu hồi vốn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="Hòa vốn" />
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
      </div>

      <Card className={isWithinTarget ? 'border-green-500/50' : 'border-yellow-500/50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isWithinTarget ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              <Clock className={`h-6 w-6 ${isWithinTarget ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold">
                {isWithinTarget ? 'Thời gian thu hồi vốn CHẤP NHẬN ĐƯỢC' : 'Thời gian thu hồi vốn CẦN CÂN NHẮC'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Simple: {simplePayback.toFixed(1)} năm | Discounted: {discountedPayback.toFixed(1)} năm | Mục tiêu: {params.targetPayback} năm
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
