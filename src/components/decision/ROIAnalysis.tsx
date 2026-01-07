import { useState, useEffect } from 'react';
import { TrendingUp, Calculator, Save, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type AdvisorContext = Record<string, any>;

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

  useEffect(() => {
    onContextChange?.({
      analysisType: 'roi',
      inputs: params,
      outputs: {
        totalReturns,
        netProfit,
        roi,
        annualizedROI: annualizedROI * 100,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, totalReturns, netProfit, roi, annualizedROI]);

  const chartData = [
    { year: 'Năm 1', return: params.year1Return, cumulative: params.year1Return - params.initialInvestment },
    { year: 'Năm 2', return: params.year2Return, cumulative: params.year1Return + params.year2Return - params.initialInvestment },
    { year: 'Năm 3', return: params.year3Return, cumulative: params.year1Return + params.year2Return + params.year3Return - params.initialInvestment },
    { year: 'Năm 4', return: params.year4Return, cumulative: params.year1Return + params.year2Return + params.year3Return + params.year4Return - params.initialInvestment },
    { year: 'Năm 5', return: params.year5Return, cumulative: totalReturns - params.initialInvestment },
  ];

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'roi',
      title: `Phân tích ROI - ${new Date().toLocaleDateString('vi-VN')}`,
      description: `Đầu tư ${formatVNDCompact(params.initialInvestment)}`,
      parameters: params,
      results: {
        totalReturns,
        netProfit,
        roi,
        annualizedROI: annualizedROI * 100,
      },
      recommendation: roi > 20 ? 'Khuyến nghị đầu tư' : roi > 10 ? 'Cân nhắc đầu tư' : 'Không khuyến nghị',
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
              ROI Tổng
              <HoverCard>
                <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="font-mono text-sm">ROI = (Lợi nhuận ròng / Đầu tư) × 100%</p>
                </HoverCardContent>
              </HoverCard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${roi > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {roi.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">sau 5 năm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI Hàng năm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${annualizedROI > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(annualizedROI * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">CAGR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lợi nhuận ròng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfit > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatVNDCompact(netProfit)}
            </div>
            <p className="text-sm text-muted-foreground">tổng 5 năm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng thu hồi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatVNDCompact(totalReturns)}</div>
            <p className="text-sm text-muted-foreground">so với {formatVNDCompact(params.initialInvestment)} đầu tư</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ lợi nhuận theo năm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
                  <Tooltip formatter={(v) => formatVNDCompact(v as number)} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="return" name="Lợi nhuận" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={roi > 20 ? 'border-green-500/50' : roi > 10 ? 'border-yellow-500/50' : 'border-red-500/50'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              roi > 20 ? 'bg-green-500/20' : roi > 10 ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              <TrendingUp className={`h-6 w-6 ${
                roi > 20 ? 'text-green-500' : roi > 10 ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold">
                {roi > 20 ? 'Khuyến nghị ĐẦU TƯ' : roi > 10 ? 'CÂN NHẮC đầu tư' : 'KHÔNG khuyến nghị'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {roi > 20
                  ? `ROI ${roi.toFixed(1)}% vượt ngưỡng 20%, dự án hấp dẫn`
                  : roi > 10
                  ? `ROI ${roi.toFixed(1)}% ở mức trung bình, cần xem xét thêm rủi ro`
                  : `ROI ${roi.toFixed(1)}% thấp hơn kỳ vọng 10%, cân nhắc kỹ`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
