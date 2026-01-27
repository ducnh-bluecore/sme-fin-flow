/**
 * RetailConcentrationRisk - 5 loại rủi ro tập trung cho Bán lẻ E-commerce
 * 
 * Layout: Grid 2x2 + 1 full-width + Alerts summary
 * - 1. Kênh bán (PieChart)
 * - 2. Danh mục (PieChart)  
 * - 3. Khách hàng (BarChart Horizontal)
 * - 4. Hero SKU (BarChart Horizontal)
 * - 5. Mùa vụ (AreaChart 12 tháng)
 * - 6. Tổng hợp cảnh báo
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatVNDCompact } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  Store, 
  Package, 
  Users, 
  Star,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useRetailConcentrationRisk, type ConcentrationAlert } from '@/hooks/useRetailConcentrationRisk';

// Color palette for charts
const CHANNEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];
const CATEGORY_COLORS = ['#06b6d4', '#84cc16', '#f97316', '#ec4899', '#94a3b8'];

function getSeverityColor(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusFromPct(value: number, thresholds: { medium: number; high: number }) {
  if (value > thresholds.high) return { label: 'Cao', color: 'text-red-500' };
  if (value > thresholds.medium) return { label: 'Trung bình', color: 'text-yellow-500' };
  return { label: 'Tốt', color: 'text-green-500' };
}

// Alert Summary Component
function AlertsSummary({ alerts }: { alerts: ConcentrationAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Tổng hợp đánh giá
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600">
              ✅ Không có rủi ro tập trung đáng lo ngại. Danh mục đầu tư và kênh bán đa dạng tốt.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Cảnh báo rủi ro tập trung ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RetailConcentrationRisk() {
  const { data, isLoading, error } = useRetailConcentrationRisk();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Không thể tải dữ liệu rủi ro tập trung</p>
        </CardContent>
      </Card>
    );
  }

  const { 
    channelData, 
    categoryData, 
    customerData, 
    skuData, 
    seasonalData, 
    alerts,
    top1ChannelPct,
    top1CategoryPct,
    top10CustomerPct,
    top5SKUMarginPct,
    maxSeasonalityIndex,
  } = data;

  const channelStatus = getStatusFromPct(top1ChannelPct, { medium: 30, high: 50 });
  const categoryStatus = getStatusFromPct(top1CategoryPct, { medium: 30, high: 40 });
  const customerStatus = getStatusFromPct(top10CustomerPct, { medium: 20, high: 30 });
  const skuStatus = getStatusFromPct(top5SKUMarginPct, { medium: 20, high: 30 });

  return (
    <div className="space-y-6">
      {/* Row 1: Channel + Category (PieCharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Kênh bán */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-500" />
                Tập trung Kênh bán
              </span>
              <Badge variant="outline" className={channelStatus.color}>
                {channelStatus.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Top 1 kênh: {channelData[0]?.name || 'N/A'} ({top1ChannelPct.toFixed(1)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="pct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, pct }) => `${name}: ${pct}%`}
                    labelLine={false}
                  >
                    {channelData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string, props: { payload?: { revenue?: number } }) => [
                    formatVNDCompact(props.payload?.revenue || 0), 
                    'Doanh thu'
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Danh mục */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-cyan-500" />
                Tập trung Danh mục
              </span>
              <Badge variant="outline" className={categoryStatus.color}>
                {categoryStatus.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Top 1 danh mục: {categoryData[0]?.name || 'N/A'} ({top1CategoryPct.toFixed(1)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="pct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, pct }) => `${name}: ${pct}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string, props: { payload?: { revenue?: number } }) => [
                    formatVNDCompact(props.payload?.revenue || 0),
                    'Doanh thu'
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Customer + SKU (Horizontal BarCharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Khách hàng */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Tập trung Khách hàng
              </span>
              <Badge variant="outline" className={customerStatus.color}>
                {customerStatus.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Top 10 KH chiếm {top10CustomerPct.toFixed(1)}% doanh thu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={customerData.slice(0, 5)} 
                  layout="vertical"
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="id" width={80} tick={{ fontSize: 11 }} 
                    tickFormatter={(v) => `KH-${v.slice(0, 6)}...`} />
                  <Tooltip 
                    formatter={(v: number, name: string, props: { payload?: { revenue?: number; orders?: number } }) => [
                      `${v.toFixed(2)}% (${formatVNDCompact(props.payload?.revenue || 0)}, ${props.payload?.orders || 0} đơn)`,
                      'Tỷ trọng'
                    ]}
                  />
                  <Bar dataKey="pct" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Hero SKU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Tập trung Hero SKU
              </span>
              <Badge variant="outline" className={skuStatus.color}>
                {skuStatus.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Top 5 SKU chiếm {top5SKUMarginPct.toFixed(1)}% lợi nhuận
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={skuData} 
                  layout="vertical"
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.length > 12 ? `${v.slice(0, 12)}...` : v} />
                  <Tooltip 
                    formatter={(v: number, name: string, props: { payload?: { margin?: number; category?: string } }) => [
                      `${v.toFixed(2)}% (${formatVNDCompact(props.payload?.margin || 0)})`,
                      props.payload?.category || 'Margin'
                    ]}
                  />
                  <Bar dataKey="pct" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Seasonal (AreaChart full width) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Rủi ro Mùa vụ
            </span>
            <Badge variant="outline" className={maxSeasonalityIndex > 1.5 ? 'text-yellow-500' : 'text-green-500'}>
              Seasonality Index: {maxSeasonalityIndex.toFixed(2)}
            </Badge>
          </CardTitle>
          <CardDescription>
            Biến động doanh thu 12 tháng gần nhất. Index &gt; 1.5 = Peak season cần chuẩn bị vốn lưu động
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seasonalData} margin={{ left: 0, right: 30 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(v) => {
                    const [year, month] = v.split('-');
                    return `T${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis yAxisId="left" tickFormatter={(v) => formatVNDCompact(v)} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 2]} tickFormatter={(v) => `SI: ${v}`} />
                <Tooltip 
                  formatter={(v: number, name: string) => [
                    name === 'index' ? v.toFixed(2) : formatVNDCompact(v),
                    name === 'index' ? 'Seasonality Index' : 'Doanh thu'
                  ]}
                  labelFormatter={(label) => {
                    const [year, month] = label.split('-');
                    return `Tháng ${month}/${year}`;
                  }}
                />
                <Legend />
                <ReferenceLine yAxisId="right" y={1.5} stroke="#f59e0b" strokeDasharray="5 5" label="SI = 1.5" />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  name="Doanh thu"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 4: Alerts Summary */}
      <AlertsSummary alerts={alerts} />
    </div>
  );
}
