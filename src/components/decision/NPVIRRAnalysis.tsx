import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Save, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { formatVNDCompact, formatDate } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

  useEffect(() => {
    onContextChange?.({
      analysisType: 'npv-irr',
      inputs: { initialInvestment, discountRate, cashFlows },
      outputs: { npv, irr, totalCashFlows, profitabilityIndex },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInvestment, discountRate, cashFlows, npv, irr, totalCashFlows, profitabilityIndex]);

  // Generate NPV profile data
  const npvProfileData = Array.from({ length: 25 }, (_, i) => {
    const rate = i * 2;
    return {
      rate: `${rate}%`,
      npv: calculateNPV(rate),
    };
  });

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              NPV
              <HoverCard>
                <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="font-mono text-sm">NPV = Σ(CFt / (1+r)^t) - I₀</p>
                  <p className="text-xs mt-1">CFt: Dòng tiền năm t, r: Tỷ lệ chiết khấu, I₀: Đầu tư ban đầu</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${npv > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatVNDCompact(npv)}
            </div>
            <p className="text-sm text-muted-foreground">tại {discountRate}% chiết khấu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              IRR
              <HoverCard>
                <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="font-mono text-sm">IRR: Tỷ lệ chiết khấu khi NPV = 0</p>
                  <p className="text-xs mt-1">Nên đầu tư khi IRR {'>'} Cost of Capital</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${irr > discountRate ? 'text-green-500' : 'text-red-500'}`}>
              {irr.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              {irr > discountRate ? `> ${discountRate}% ✓` : `< ${discountRate}% ✗`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profitability Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${profitabilityIndex > 1 ? 'text-green-500' : 'text-red-500'}`}>
              {profitabilityIndex.toFixed(2)}x
            </div>
            <p className="text-sm text-muted-foreground">
              {profitabilityIndex > 1 ? 'Đáng đầu tư' : 'Không đáng'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng dòng tiền</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatVNDCompact(totalCashFlows)}</div>
            <p className="text-sm text-muted-foreground">{cashFlows.length} năm</p>
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

        <Card>
          <CardHeader>
            <CardTitle>NPV Profile (NPV theo tỷ lệ chiết khấu)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={npvProfileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="rate" />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" />
                  <ReferenceLine x={`${Math.round(irr)}%`} stroke="green" strokeDasharray="3 3" label="IRR" />
                  <Line type="monotone" dataKey="npv" name="NPV" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={npv > 0 && irr > discountRate ? 'border-green-500/50' : 'border-red-500/50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              npv > 0 && irr > discountRate ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <TrendingUp className={`h-6 w-6 ${
                npv > 0 && irr > discountRate ? 'text-green-500' : 'text-red-500'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold">
                {npv > 0 && irr > discountRate ? 'Khuyến nghị ĐẦU TƯ' : 'KHÔNG khuyến nghị đầu tư'}
              </h3>
              <p className="text-sm text-muted-foreground">
                NPV = {formatVNDCompact(npv)} {npv > 0 ? '> 0 ✓' : '< 0 ✗'} | 
                IRR = {irr.toFixed(1)}% {irr > discountRate ? `> ${discountRate}% ✓` : `< ${discountRate}% ✗`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
