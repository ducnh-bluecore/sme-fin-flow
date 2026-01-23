import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategorySpend {
  category: string;
  revenue: number;
  percentage: number;
}

interface CategorySpendBlockProps {
  data: CategorySpend[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

function formatCurrency(value: number): string {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}tỷ`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function CategorySpendBlock({ data }: CategorySpendBlockProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Phân bổ Chi tiêu theo Danh mục
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có dữ liệu danh mục
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.category || 'Khác',
    value: item.revenue,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          Phân bổ Chi tiêu theo Danh mục
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cấu trúc chi tiêu của khách hàng theo nhóm sản phẩm
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(name) => `Danh mục: ${name}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend table */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.category} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="capitalize">{item.category || 'Khác'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                <span className="font-medium">{formatCurrency(item.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
