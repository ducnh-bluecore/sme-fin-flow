import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, TrendingUp, TrendingDown, Search, 
  ArrowUpDown, Filter, DollarSign, Percent, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatVNDCompact, formatCurrency } from '@/lib/formatters';
import { useWhatIfRealData, SKUMetrics } from '@/hooks/useWhatIfRealData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface SKUSimParams {
  priceChange: number;  // % change in selling price
  cogsChange: number;   // % change in COGS
  volumeChange: number; // % change in volume
}

export function SKUProfitabilityPanel() {
  const { data, isLoading } = useWhatIfRealData();
  const skuData = data?.bySKU || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'margin' | 'quantity'>('revenue');
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<SKUSimParams>({
    priceChange: 0,
    cogsChange: 0,
    volumeChange: 0,
  });

  // Filter and sort SKUs
  const filteredSKUs = useMemo(() => {
    let result = [...skuData];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.sku.toLowerCase().includes(term) ||
        s.productName.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term)
      );
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'profit': return b.profit - a.profit;
        case 'margin': return b.margin - a.margin;
        case 'quantity': return b.quantity - a.quantity;
        default: return b.revenue - a.revenue;
      }
    });
    
    return result;
  }, [skuData, searchTerm, sortBy]);

  // Calculate simulated results for selected SKUs
  const simulatedResults = useMemo(() => {
    const targetSKUs = selectedSKUs.size > 0 
      ? filteredSKUs.filter(s => selectedSKUs.has(s.sku))
      : filteredSKUs.slice(0, 20);
    
    return targetSKUs.map(sku => {
      const newPrice = sku.avgPrice * (1 + params.priceChange / 100);
      const newCogs = sku.costPrice * (1 + params.cogsChange / 100);
      const newVolume = sku.quantity * (1 + params.volumeChange / 100);
      
      const newRevenue = newPrice * newVolume;
      const newTotalCogs = newCogs * newVolume;
      const newProfit = newRevenue - newTotalCogs;
      const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
      
      return {
        ...sku,
        simRevenue: newRevenue,
        simCogs: newTotalCogs,
        simProfit: newProfit,
        simMargin: newMargin,
        simVolume: newVolume,
        revenueChange: newRevenue - sku.revenue,
        profitChange: newProfit - sku.profit,
        marginChange: newMargin - sku.margin,
      };
    });
  }, [filteredSKUs, selectedSKUs, params]);

  // Summary stats
  const summary = useMemo(() => {
    let baseRevenue = 0, baseProfit = 0, simRevenue = 0, simProfit = 0;
    for (const s of simulatedResults) {
      baseRevenue += s.revenue; baseProfit += s.profit; simRevenue += s.simRevenue; simProfit += s.simProfit;
    }
    
    return {
      baseRevenue,
      baseProfit,
      baseMargin: baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0,
      simRevenue,
      simProfit,
      simMargin: simRevenue > 0 ? (simProfit / simRevenue) * 100 : 0,
      revenueChange: simRevenue - baseRevenue,
      profitChange: simProfit - baseProfit,
    };
  }, [simulatedResults]);

  // Chart data - Top/Bottom performers
  const performanceChartData = useMemo(() => {
    const topPerformers = [...simulatedResults].sort((a, b) => b.margin - a.margin).slice(0, 5);
    const bottomPerformers = [...simulatedResults].sort((a, b) => a.margin - b.margin).slice(0, 5);
    
    return {
      top: topPerformers.map(s => ({
        name: s.productName.substring(0, 20) || s.sku.substring(0, 15),
        margin: s.margin,
        simMargin: s.simMargin,
        revenue: s.revenue,
      })),
      bottom: bottomPerformers.map(s => ({
        name: s.productName.substring(0, 20) || s.sku.substring(0, 15),
        margin: s.margin,
        simMargin: s.simMargin,
        revenue: s.revenue,
      })),
    };
  }, [simulatedResults]);

  // Scatter plot data for margin vs revenue
  const scatterData = useMemo(() => {
    return simulatedResults.slice(0, 50).map(s => ({
      x: s.simRevenue,
      y: s.simMargin,
      z: s.simVolume,
      name: s.productName || s.sku,
      sku: s.sku,
    }));
  }, [simulatedResults]);

  const toggleSKU = (sku: string) => {
    const newSet = new Set(selectedSKUs);
    if (newSet.has(sku)) {
      newSet.delete(sku);
    } else {
      newSet.add(sku);
    }
    setSelectedSKUs(newSet);
  };

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

        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Biên lợi nhuận</p>
                <p className="text-2xl font-bold">{summary.simMargin.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  Hiện tại: {summary.baseMargin.toFixed(1)}%
                </p>
              </div>
              <Percent className="w-8 h-8 text-violet-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">SKU phân tích</p>
                <p className="text-2xl font-bold">{selectedSKUs.size || simulatedResults.length}</p>
                <p className="text-xs text-muted-foreground">
                  Tổng: {skuData.length} SKU
                </p>
              </div>
              <Package className="w-8 h-8 text-orange-500/50" />
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
              <Filter className="w-4 h-4" />
              Tham số mô phỏng
            </CardTitle>
            <CardDescription className="text-xs">
              Áp dụng cho {selectedSKUs.size > 0 ? `${selectedSKUs.size} SKU đã chọn` : 'tất cả SKU hiển thị'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {/* Price Change */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Thay đổi giá bán</Label>
                <span className="text-sm font-medium">{params.priceChange > 0 ? '+' : ''}{params.priceChange}%</span>
              </div>
              <Slider
                value={[params.priceChange]}
                onValueChange={([v]) => setParams(p => ({ ...p, priceChange: v }))}
                min={-30}
                max={30}
                step={1}
              />
            </div>

            {/* COGS Change */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Thay đổi giá vốn</Label>
                <span className="text-sm font-medium">{params.cogsChange > 0 ? '+' : ''}{params.cogsChange}%</span>
              </div>
              <Slider
                value={[params.cogsChange]}
                onValueChange={([v]) => setParams(p => ({ ...p, cogsChange: v }))}
                min={-30}
                max={30}
                step={1}
              />
            </div>

            {/* Volume Change */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Thay đổi sản lượng</Label>
                <span className="text-sm font-medium">{params.volumeChange > 0 ? '+' : ''}{params.volumeChange}%</span>
              </div>
              <Slider
                value={[params.volumeChange]}
                onValueChange={([v]) => setParams(p => ({ ...p, volumeChange: v }))}
                min={-50}
                max={100}
                step={5}
              />
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setParams({ priceChange: 0, cogsChange: 0, volumeChange: 0 })}
            >
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Right: Charts and Table */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="scatter">
            <TabsList>
              <TabsTrigger value="scatter">Ma trận SKU</TabsTrigger>
              <TabsTrigger value="top">Top / Bottom</TabsTrigger>
            </TabsList>

            <TabsContent value="scatter">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Doanh thu vs Biên lợi nhuận</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis 
                          dataKey="x" 
                          name="Doanh thu" 
                          tickFormatter={(v) => formatVNDCompact(v)}
                          className="text-xs"
                        />
                        <YAxis 
                          dataKey="y" 
                          name="Biên LN" 
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                          className="text-xs"
                        />
                        <ZAxis dataKey="z" range={[20, 400]} />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.[0]?.payload) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border rounded-lg p-2 shadow-lg text-xs">
                                <p className="font-medium">{data.name}</p>
                                <p>SKU: {data.sku}</p>
                                <p>Doanh thu: {formatVNDCompact(data.x)}</p>
                                <p>Biên LN: {data.y.toFixed(1)}%</p>
                              </div>
                            );
                          }}
                        />
                        <Scatter 
                          data={scatterData} 
                          fill="hsl(var(--primary))"
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="top">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">Top 5 Biên cao nhất</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData.top} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                          <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
                          <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                          <Bar dataKey="simMargin" fill="#22c55e" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600">Bottom 5 Biên thấp nhất</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData.bottom} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                          <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                          <Bar dataKey="simMargin" radius={[0, 4, 4, 0]}>
                            {performanceChartData.bottom.map((_, i) => (
                              <Cell key={i} fill={i < 2 ? '#ef4444' : '#f59e0b'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* SKU Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Chi tiết SKU</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 w-48"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy(s => s === 'revenue' ? 'profit' : s === 'profit' ? 'margin' : 'revenue')}
                >
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  {sortBy === 'revenue' ? 'Doanh thu' : sortBy === 'profit' ? 'Lợi nhuận' : 'Biên'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-xs">SKU / Sản phẩm</th>
                      <th className="text-right p-2 font-medium text-xs">Doanh thu</th>
                      <th className="text-right p-2 font-medium text-xs">Biên LN</th>
                      <th className="text-right p-2 font-medium text-xs">Thay đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {simulatedResults.slice(0, 20).map((sku) => (
                      <tr 
                        key={sku.sku}
                        className={`hover:bg-muted/20 cursor-pointer ${selectedSKUs.has(sku.sku) ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleSKU(sku.sku)}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {selectedSKUs.has(sku.sku) && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                            <div>
                              <p className="font-medium truncate max-w-[150px]">{sku.productName || sku.sku}</p>
                              <p className="text-xs text-muted-foreground">{sku.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right p-2">{formatVNDCompact(sku.simRevenue)}</td>
                        <td className="text-right p-2">
                          <Badge variant={sku.simMargin >= 20 ? 'default' : sku.simMargin >= 10 ? 'secondary' : 'destructive'}>
                            {sku.simMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">
                          <span className={sku.profitChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {sku.profitChange >= 0 ? '+' : ''}{formatVNDCompact(sku.profitChange)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
