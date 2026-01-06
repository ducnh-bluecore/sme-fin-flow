import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, TrendingUp, TrendingDown, DollarSign, 
  Truck, Package, Percent, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatVNDCompact } from '@/lib/formatters';
import { GeographicMetrics } from '@/hooks/useWhatIfRealData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// Vietnam regions
const REGIONS: Record<string, { name: string; provinces: string[] }> = {
  north: {
    name: 'Miền Bắc',
    provinces: ['HN', 'HP', 'BN', 'HY', 'HD', 'NB', 'TB', 'VP', 'PT', 'QN', 'BG', 'HG', 'ND', 'TQ', 'LS', 'LC', 'YB', 'SL', 'LCI', 'DB', 'CB', 'TN', 'BK', 'HB'],
  },
  central: {
    name: 'Miền Trung',
    provinces: ['TTH', 'DN', 'QNA', 'QNG', 'BD', 'PY', 'KH', 'GL', 'KT', 'DL', 'NT', 'BT', 'HA', 'QB', 'QT', 'NA', 'HT'],
  },
  south: {
    name: 'Miền Nam',
    provinces: ['HCM', 'BD', 'DN', 'BR', 'TG', 'LA', 'CT', 'AG', 'KG', 'DT', 'VL', 'HG', 'BL', 'TV', 'ST', 'CM', 'BT', 'TN', 'BP', 'TN'],
  },
};

interface GeoSimParams {
  northGrowth: number;
  centralGrowth: number;
  southGrowth: number;
  shippingCostChange: number;
}

interface Props {
  geoData: GeographicMetrics[];
  isLoading?: boolean;
}

const REGION_COLORS = {
  north: '#3b82f6',
  central: '#22c55e', 
  south: '#f59e0b',
};

export function GeographicAnalysisPanel({ geoData, isLoading }: Props) {
  const [params, setParams] = useState<GeoSimParams>({
    northGrowth: 0,
    centralGrowth: 0,
    southGrowth: 0,
    shippingCostChange: 0,
  });

  // Categorize provinces into regions
  const categorizedData = useMemo(() => {
    const regions: Record<string, { 
      provinces: GeographicMetrics[]; 
      totalRevenue: number; 
      totalOrders: number; 
      totalShipping: number;
      totalProfit: number;
    }> = {
      north: { provinces: [], totalRevenue: 0, totalOrders: 0, totalShipping: 0, totalProfit: 0 },
      central: { provinces: [], totalRevenue: 0, totalOrders: 0, totalShipping: 0, totalProfit: 0 },
      south: { provinces: [], totalRevenue: 0, totalOrders: 0, totalShipping: 0, totalProfit: 0 },
      other: { provinces: [], totalRevenue: 0, totalOrders: 0, totalShipping: 0, totalProfit: 0 },
    };

    geoData.forEach(province => {
      const code = province.provinceCode?.toUpperCase() || '';
      let region = 'other';
      
      if (REGIONS.north.provinces.includes(code) || province.provinceName?.includes('Bắc') || province.provinceName?.includes('Hà Nội') || province.provinceName?.includes('Hải')) {
        region = 'north';
      } else if (REGIONS.central.provinces.includes(code) || province.provinceName?.includes('Đà Nẵng') || province.provinceName?.includes('Huế') || province.provinceName?.includes('Nghệ')) {
        region = 'central';
      } else if (REGIONS.south.provinces.includes(code) || province.provinceName?.includes('Hồ Chí Minh') || province.provinceName?.includes('Cần Thơ') || province.provinceName?.includes('Đồng')) {
        region = 'south';
      }

      regions[region].provinces.push(province);
      regions[region].totalRevenue += province.revenue;
      regions[region].totalOrders += province.orders;
      regions[region].totalShipping += province.shippingCost;
      regions[region].totalProfit += province.netProfit;
    });

    return regions;
  }, [geoData]);

  // Calculate simulated results
  const simulatedResults = useMemo(() => {
    const getGrowth = (region: string) => {
      switch (region) {
        case 'north': return params.northGrowth;
        case 'central': return params.centralGrowth;
        case 'south': return params.southGrowth;
        default: return 0;
      }
    };

    const shippingMultiplier = 1 + params.shippingCostChange / 100;

    const results: Record<string, {
      baseRevenue: number;
      simRevenue: number;
      baseOrders: number;
      simOrders: number;
      baseShipping: number;
      simShipping: number;
      baseProfit: number;
      simProfit: number;
      revenueChange: number;
      profitChange: number;
    }> = {};

    Object.entries(categorizedData).forEach(([region, data]) => {
      const growth = getGrowth(region);
      const multiplier = 1 + growth / 100;
      
      const simRevenue = data.totalRevenue * multiplier;
      const simOrders = Math.round(data.totalOrders * multiplier);
      const simShipping = data.totalShipping * shippingMultiplier * multiplier;
      
      // Profit = Revenue - Shipping - other costs (assume 70% of revenue)
      const baseCost = data.totalRevenue * 0.7;
      const simCost = simRevenue * 0.7;
      const baseProfit = data.totalRevenue - data.totalShipping - baseCost;
      const simProfit = simRevenue - simShipping - simCost;

      results[region] = {
        baseRevenue: data.totalRevenue,
        simRevenue,
        baseOrders: data.totalOrders,
        simOrders,
        baseShipping: data.totalShipping,
        simShipping,
        baseProfit: data.totalProfit || baseProfit,
        simProfit,
        revenueChange: simRevenue - data.totalRevenue,
        profitChange: simProfit - (data.totalProfit || baseProfit),
      };
    });

    return results;
  }, [categorizedData, params]);

  // Summary
  const summary = useMemo(() => {
    let baseRevenue = 0, simRevenue = 0;
    let baseProfit = 0, simProfit = 0;
    let baseShipping = 0, simShipping = 0;

    Object.values(simulatedResults).forEach(r => {
      baseRevenue += r.baseRevenue;
      simRevenue += r.simRevenue;
      baseProfit += r.baseProfit;
      simProfit += r.simProfit;
      baseShipping += r.baseShipping;
      simShipping += r.simShipping;
    });

    return {
      baseRevenue,
      simRevenue,
      baseProfit,
      simProfit,
      baseShipping,
      simShipping,
      revenueChange: simRevenue - baseRevenue,
      profitChange: simProfit - baseProfit,
      shippingChange: simShipping - baseShipping,
    };
  }, [simulatedResults]);

  // Chart data
  const regionChartData = useMemo(() => {
    return ['north', 'central', 'south'].map(region => ({
      name: REGIONS[region]?.name || region,
      'Hiện tại': simulatedResults[region]?.baseRevenue || 0,
      'Dự kiến': simulatedResults[region]?.simRevenue || 0,
      color: REGION_COLORS[region as keyof typeof REGION_COLORS],
    }));
  }, [simulatedResults]);

  const pieData = useMemo(() => {
    return ['north', 'central', 'south'].map(region => ({
      name: REGIONS[region]?.name || region,
      value: simulatedResults[region]?.simRevenue || 0,
      fill: REGION_COLORS[region as keyof typeof REGION_COLORS],
    }));
  }, [simulatedResults]);

  // Top provinces
  const topProvinces = useMemo(() => {
    return [...geoData]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [geoData]);

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted/30 rounded-lg" />;
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Doanh thu dự kiến</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.simRevenue)}</p>
                {summary.revenueChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${summary.revenueChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {summary.revenueChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {summary.revenueChange > 0 ? '+' : ''}{formatVNDCompact(summary.revenueChange)}
                  </div>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Lợi nhuận dự kiến</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.simProfit)}</p>
                {summary.profitChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${summary.profitChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {summary.profitChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {summary.profitChange > 0 ? '+' : ''}{formatVNDCompact(summary.profitChange)}
                  </div>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Chi phí vận chuyển</p>
                <p className="text-2xl font-bold">{formatVNDCompact(summary.simShipping)}</p>
                {summary.shippingChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${summary.shippingChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {summary.shippingChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {summary.shippingChange > 0 ? '+' : ''}{formatVNDCompact(summary.shippingChange)}
                  </div>
                )}
              </div>
              <Truck className="w-8 h-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Tỉnh/Thành phố</p>
                <p className="text-2xl font-bold">{geoData.length}</p>
                <p className="text-xs text-muted-foreground">vùng miền đang bán</p>
              </div>
              <MapPin className="w-8 h-8 text-violet-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Parameters */}
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Tham số vùng miền
            </CardTitle>
            <CardDescription className="text-xs">
              Mô phỏng mở rộng/thu hẹp theo vùng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {/* North Growth */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS.north }} />
                  Miền Bắc
                </Label>
                <span className="text-sm font-medium">{params.northGrowth > 0 ? '+' : ''}{params.northGrowth}%</span>
              </div>
              <Slider
                value={[params.northGrowth]}
                onValueChange={([v]) => setParams(p => ({ ...p, northGrowth: v }))}
                min={-50}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Hiện tại: {formatVNDCompact(categorizedData.north.totalRevenue)}
              </p>
            </div>

            {/* Central Growth */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS.central }} />
                  Miền Trung
                </Label>
                <span className="text-sm font-medium">{params.centralGrowth > 0 ? '+' : ''}{params.centralGrowth}%</span>
              </div>
              <Slider
                value={[params.centralGrowth]}
                onValueChange={([v]) => setParams(p => ({ ...p, centralGrowth: v }))}
                min={-50}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Hiện tại: {formatVNDCompact(categorizedData.central.totalRevenue)}
              </p>
            </div>

            {/* South Growth */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: REGION_COLORS.south }} />
                  Miền Nam
                </Label>
                <span className="text-sm font-medium">{params.southGrowth > 0 ? '+' : ''}{params.southGrowth}%</span>
              </div>
              <Slider
                value={[params.southGrowth]}
                onValueChange={([v]) => setParams(p => ({ ...p, southGrowth: v }))}
                min={-50}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Hiện tại: {formatVNDCompact(categorizedData.south.totalRevenue)}
              </p>
            </div>

            {/* Shipping Cost */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Chi phí vận chuyển
                </Label>
                <span className="text-sm font-medium">{params.shippingCostChange > 0 ? '+' : ''}{params.shippingCostChange}%</span>
              </div>
              <Slider
                value={[params.shippingCostChange]}
                onValueChange={([v]) => setParams(p => ({ ...p, shippingCostChange: v }))}
                min={-30}
                max={50}
                step={5}
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setParams({ northGrowth: 0, centralGrowth: 0, southGrowth: 0, shippingCostChange: 0 })}
            >
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Right: Charts */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="comparison">
            <TabsList>
              <TabsTrigger value="comparison">So sánh</TabsTrigger>
              <TabsTrigger value="distribution">Phân bổ</TabsTrigger>
              <TabsTrigger value="provinces">Top tỉnh thành</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Doanh thu theo vùng miền</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis tickFormatter={(v) => formatVNDCompact(v)} className="text-xs" />
                        <Tooltip 
                          formatter={(v: number) => formatVNDCompact(v)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Hiện tại" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Dự kiến" radius={[4, 4, 0, 0]}>
                          {regionChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Phân bổ doanh thu dự kiến</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatVNDCompact(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="provinces">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top 10 Tỉnh/Thành phố</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[350px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-xs">Tỉnh/TP</th>
                          <th className="text-right p-2 font-medium text-xs">Đơn hàng</th>
                          <th className="text-right p-2 font-medium text-xs">Doanh thu</th>
                          <th className="text-right p-2 font-medium text-xs">AOV</th>
                          <th className="text-right p-2 font-medium text-xs">Biên LN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {topProvinces.map((province) => (
                          <tr key={province.provinceCode} className="hover:bg-muted/20">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium">{province.provinceName || province.provinceCode}</span>
                              </div>
                            </td>
                            <td className="text-right p-2">{province.orders.toLocaleString()}</td>
                            <td className="text-right p-2 font-medium">{formatVNDCompact(province.revenue)}</td>
                            <td className="text-right p-2">{formatVNDCompact(province.avgOrderValue)}</td>
                            <td className="text-right p-2">
                              <Badge variant={province.margin >= 15 ? 'default' : province.margin >= 5 ? 'secondary' : 'destructive'}>
                                {province.margin.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}
