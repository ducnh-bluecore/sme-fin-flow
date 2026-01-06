import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { ScenarioBudgetMonth } from '@/hooks/useScenarioBudgetData';
import { BarChart3 } from 'lucide-react';

interface Props {
  comparison: ScenarioBudgetMonth[];
}

export function MonthlyComparisonChart({ comparison }: Props) {
  const currentMonth = new Date().getMonth() + 1;
  
  const revenueData = comparison.map(c => ({
    month: `T${c.month}`,
    'Kế hoạch': c.plannedRevenue,
    'Thực tế': c.actualRevenue,
    'Chênh lệch': c.revenueVariance,
    isPastMonth: c.month <= currentMonth,
  }));

  const opexData = comparison.map(c => ({
    month: `T${c.month}`,
    'Kế hoạch': c.plannedOpex,
    'Thực tế': c.actualOpex,
    'Tiết kiệm': c.opexVariance,
    isPastMonth: c.month <= currentMonth,
  }));

  const ebitdaData = comparison.map(c => ({
    month: `T${c.month}`,
    'Kế hoạch': c.plannedEbitda,
    'Thực tế': c.actualEbitda,
    'Chênh lệch': c.ebitdaVariance,
    isPastMonth: c.month <= currentMonth,
  }));

  const renderChart = (data: any[], varianceKey: string, isExpense = false) => (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => formatVNDCompact(v)} />
        <Tooltip
          formatter={(value: number) => formatVND(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar dataKey="Kế hoạch" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Thực tế" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => {
            if (!entry.isPastMonth) {
              return <Cell key={`cell-${index}`} fill="hsl(var(--muted))" />;
            }
            const variance = entry[varianceKey];
            const favorable = isExpense ? variance > 0 : variance > 0;
            return (
              <Cell
                key={`cell-${index}`}
                fill={favorable ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
              />
            );
          })}
        </Bar>
        <Line
          type="monotone"
          dataKey={varianceKey}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (comparison.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-80 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
          <p>Chưa có dữ liệu so sánh</p>
          <p className="text-sm">Hãy tạo kịch bản và nhập kế hoạch tháng</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          So sánh Kế hoạch vs Thực tế theo tháng
        </CardTitle>
        <CardDescription>
          Các tháng trong tương lai chưa có số liệu thực tế
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
            <TabsTrigger value="opex">Chi phí</TabsTrigger>
            <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
          </TabsList>
          <TabsContent value="revenue">
            {renderChart(revenueData, 'Chênh lệch')}
          </TabsContent>
          <TabsContent value="opex">
            {renderChart(opexData, 'Tiết kiệm', true)}
          </TabsContent>
          <TabsContent value="ebitda">
            {renderChart(ebitdaData, 'Chênh lệch')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
