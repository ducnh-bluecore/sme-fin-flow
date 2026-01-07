import { useState, useMemo } from 'react';
import { Activity, Save, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { formatVNDCompact } from '@/lib/formatters';
import { useSaveDecisionAnalysis } from '@/hooks/useDecisionAnalyses';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function SensitivityAnalysis() {
  const saveAnalysis = useSaveDecisionAnalysis();
  
  const [baseCase, setBaseCase] = useState({
    revenue: 10000000000,
    cogs: 6500000000,
    opex: 2000000000,
  });

  const [variations, setVariations] = useState({
    revenueRange: [-20, 20],
    cogsRange: [-15, 15],
    opexRange: [-10, 10],
  });

  const baseProfit = baseCase.revenue - baseCase.cogs - baseCase.opex;

  // Generate sensitivity data
  const sensitivityData = useMemo(() => {
    const data: { variable: string; change: number; profit: number; impact: number }[] = [];
    
    // Revenue sensitivity
    for (let change = variations.revenueRange[0]; change <= variations.revenueRange[1]; change += 5) {
      const newRevenue = baseCase.revenue * (1 + change / 100);
      const profit = newRevenue - baseCase.cogs - baseCase.opex;
      data.push({
        variable: 'Doanh thu',
        change,
        profit,
        impact: ((profit - baseProfit) / baseProfit) * 100,
      });
    }

    // COGS sensitivity
    for (let change = variations.cogsRange[0]; change <= variations.cogsRange[1]; change += 5) {
      const newCogs = baseCase.cogs * (1 + change / 100);
      const profit = baseCase.revenue - newCogs - baseCase.opex;
      data.push({
        variable: 'COGS',
        change,
        profit,
        impact: ((profit - baseProfit) / baseProfit) * 100,
      });
    }

    // OPEX sensitivity
    for (let change = variations.opexRange[0]; change <= variations.opexRange[1]; change += 5) {
      const newOpex = baseCase.opex * (1 + change / 100);
      const profit = baseCase.revenue - baseCase.cogs - newOpex;
      data.push({
        variable: 'OPEX',
        change,
        profit,
        impact: ((profit - baseProfit) / baseProfit) * 100,
      });
    }

    return data;
  }, [baseCase, variations, baseProfit]);

  // Calculate sensitivity coefficients
  const sensitivityCoeffs = useMemo(() => {
    const revenueImpact = ((baseCase.revenue * 0.1) / baseProfit) * 100;
    const cogsImpact = ((baseCase.cogs * 0.1) / baseProfit) * 100;
    const opexImpact = ((baseCase.opex * 0.1) / baseProfit) * 100;

    return [
      { variable: 'Doanh thu', coefficient: revenueImpact, direction: 'positive' },
      { variable: 'COGS', coefficient: -cogsImpact, direction: 'negative' },
      { variable: 'OPEX', coefficient: -opexImpact, direction: 'negative' },
    ].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }, [baseCase, baseProfit]);

  const handleSave = () => {
    saveAnalysis.mutate({
      analysis_type: 'sensitivity',
      title: `Phân tích Độ nhạy - ${new Date().toLocaleDateString('vi-VN')}`,
      description: `Base profit: ${formatVNDCompact(baseProfit)}`,
      parameters: { baseCase, variations },
      results: { baseProfit, sensitivityCoeffs },
      recommendation: `Biến nhạy cảm nhất: ${sensitivityCoeffs[0].variable}`,
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Lợi nhuận cơ sở</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatVNDCompact(baseProfit)}</div>
            <p className="text-sm text-muted-foreground">Base case</p>
          </CardContent>
        </Card>

        {sensitivityCoeffs.map((item, i) => (
          <Card key={item.variable}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                {item.variable}
                <HoverCard>
                  <HoverCardTrigger><HelpCircle className="h-3 w-3" /></HoverCardTrigger>
                  <HoverCardContent>
                    <p className="text-sm">Khi {item.variable} thay đổi 10%, lợi nhuận thay đổi {Math.abs(item.coefficient).toFixed(1)}%</p>
                  </HoverCardContent>
                </HoverCard>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${i === 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {Math.abs(item.coefficient).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                per 10% change
                {i === 0 && <Badge variant="destructive" className="ml-2">Nhạy nhất</Badge>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Điều chỉnh biến động
            </CardTitle>
            <CardDescription>Thiết lập phạm vi thay đổi cho từng biến</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Doanh thu: {variations.revenueRange[0]}% đến {variations.revenueRange[1]}%</Label>
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
              <Label>COGS: {variations.cogsRange[0]}% đến {variations.cogsRange[1]}%</Label>
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
              <Label>OPEX: {variations.opexRange[0]}% đến {variations.opexRange[1]}%</Label>
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

        <Card>
          <CardHeader>
            <CardTitle>Tornado Chart - Độ nhạy lợi nhuận</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    dataKey="change" 
                    name="% Thay đổi" 
                    domain={[-30, 30]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="impact" 
                    name="% Tác động"
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'change' ? `${value}%` : `${value.toFixed(1)}%`,
                      name === 'change' ? 'Thay đổi' : 'Tác động'
                    ]}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--border))" />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  {['Doanh thu', 'COGS', 'OPEX'].map((variable, i) => (
                    <Scatter
                      key={variable}
                      name={variable}
                      data={sensitivityData.filter(d => d.variable === variable)}
                      fill={COLORS[i]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {['Doanh thu', 'COGS', 'OPEX'].map((variable, i) => (
                <div key={variable} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm">{variable}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kết luận phân tích độ nhạy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sensitivityCoeffs.map((item, i) => (
              <div key={item.variable} className={`p-4 rounded-lg ${i === 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-muted'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.variable}</span>
                  {i === 0 && <Badge variant="destructive">Rủi ro cao nhất</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Thay đổi 10% → Lợi nhuận {item.direction === 'positive' ? 'tăng' : 'giảm'} {Math.abs(item.coefficient).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
