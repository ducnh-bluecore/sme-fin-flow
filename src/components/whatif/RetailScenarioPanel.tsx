import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Percent,
  RefreshCw,
  Store,
  Globe,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatVNDCompact } from '@/lib/formatters';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { RetailChannelParamsPanel, defaultRetailParams, RetailChannelParams } from './RetailChannelParams';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, Cell
} from 'recharts';
import { NoDataOverlay, RETAIL_SIMULATION_REQUIREMENTS } from './NoDataOverlay';

const CHANNEL_COLORS: Record<string, string> = {
  offline: '#22c55e',
  online: '#3b82f6',
  shopee: '#EE4D2D',
  lazada: '#0F146D',
  tiki: '#1A94FF',
  tiktok: '#000000',
};

interface ChannelResult {
  name: string;
  displayName: string;
  baseRevenue: number;
  projectedRevenue: number;
  growth: number;
  commission: number;
  adsCost: number;
  netProfit: number;
  margin: number;
}

function calculateRetailScenario(
  baseRevenue: number,
  params: RetailChannelParams
) {
  const channels = Object.entries(params.channels)
    .filter(([_, config]) => config.enabled)
    .map(([channel, config]) => {
      const channelKey = channel as keyof typeof params.channels;
      const channelBaseRevenue = baseRevenue * (config.revenueShare / 100);
      const projectedRevenue = channelBaseRevenue * (1 + config.growthRate / 100);
      
      // Get commission rate (only for marketplaces)
      const commissionRate = ['shopee', 'lazada', 'tiki', 'tiktok'].includes(channel)
        ? params.costs.marketplaceCommission[channel as keyof typeof params.costs.marketplaceCommission] || 0
        : 0;
      
      // Get ads cost rate
      const adsCostRate = params.costs.marketingAdsCost[channelKey] || 0;
      
      // Calculate costs
      const cogs = projectedRevenue * (params.costs.cogsRate / 100);
      const commission = projectedRevenue * (commissionRate / 100);
      const adsCost = projectedRevenue * (adsCostRate / 100);
      
      // Calculate net profit
      const grossProfit = projectedRevenue - cogs - commission - adsCost;
      const margin = projectedRevenue > 0 ? (grossProfit / projectedRevenue) * 100 : 0;
      
      return {
        name: channel,
        displayName: channel === 'offline' ? 'Cửa hàng' 
          : channel === 'online' ? 'Website/App'
          : channel.charAt(0).toUpperCase() + channel.slice(1),
        baseRevenue: channelBaseRevenue,
        projectedRevenue,
        growth: config.growthRate,
        commission,
        adsCost,
        netProfit: grossProfit,
        margin,
      } as ChannelResult;
    });
  
  // Calculate totals
  let totalBaseRevenue = 0, totalProjectedRevenue = 0, totalCommission = 0, totalAdsCost = 0;
  for (const ch of channels) {
    totalBaseRevenue += ch.baseRevenue; totalProjectedRevenue += ch.projectedRevenue;
    totalCommission += ch.commission; totalAdsCost += ch.adsCost;
  }
  const totalCogs = totalProjectedRevenue * (params.costs.cogsRate / 100);
  
  // General marketing costs
  const generalMarketing = (
    params.costs.generalMarketingCost.facebookAds +
    params.costs.generalMarketingCost.googleAds +
    params.costs.generalMarketingCost.otherAds
  ) / 100 * totalProjectedRevenue;
  
  // === NEW: Offline rent cost (per store) ===
  const offlineRentCost = params.overhead.numberOfStores * params.costs.offlineRentCost;
  
  // Overhead costs (staff + warehouse + tech)
  const staffCost = params.overhead.numberOfStores * params.overhead.offlineStaffPerStore * params.overhead.avgStaffCost;
  const overheadCost = staffCost + params.overhead.warehouseRent + params.overhead.techInfraCost + offlineRentCost;
  
  // Operating costs
  const totalOrders = totalProjectedRevenue / params.operations.avgOrderValue;
  const shippingCost = totalOrders * params.costs.shippingCostPerOrder;
  const packagingCost = totalOrders * params.costs.packagingCostPerOrder;
  const returnCost = totalOrders * params.operations.returnRate / 100 * 
    params.operations.avgOrderValue * params.operations.returnCostPercent / 100;
  
  // === NEW: Customer Acquisition Cost ===
  // Estimate new customers based on conversion rate and repeat purchase rate
  // Total customers = totalOrders / (1 + repeatPurchaseRate * averageRepeatOrders)
  // Simplified: newCustomers ≈ totalOrders * (1 - repeatPurchaseRate/100)
  const repeatRate = params.operations.repeatPurchaseRate / 100;
  const newCustomers = totalOrders * (1 - repeatRate);
  const customerAcquisitionCost = newCustomers * params.operations.customerAcquisitionCost;
  
  // === NEW: Expansion costs & revenue (if enabled) ===
  let expansionCost = 0;
  let expansionRevenue = 0;
  if (params.expansion.enableExpansion) {
    const newStores = Math.max(0, params.expansion.targetStores - params.overhead.numberOfStores);
    // Setup cost for new stores
    expansionCost = newStores * params.expansion.setupCostPerStore;
    // Revenue from new stores (prorated by ramp-up and timeline)
    // Assume we're calculating for 12 months, with stores ramping up
    const avgMonthsOperating = Math.max(0, 12 - params.expansion.expansionMonths / 2);
    const rampUpFactor = Math.max(0.5, 1 - (params.expansion.rampUpMonths / 12));
    expansionRevenue = newStores * params.expansion.revenuePerStore * (avgMonthsOperating / 12) * rampUpFactor;
  }
  
  // Adjust projected revenue with expansion
  const totalProjectedRevenueWithExpansion = totalProjectedRevenue + expansionRevenue;
  
  const grossProfit = totalProjectedRevenueWithExpansion - totalCogs - (expansionRevenue * params.costs.cogsRate / 100);
  const operatingProfit = grossProfit - totalCommission - totalAdsCost - generalMarketing - 
    overheadCost - shippingCost - packagingCost - returnCost - customerAcquisitionCost - expansionCost;
  
  const grossMargin = totalProjectedRevenueWithExpansion > 0 ? (grossProfit / totalProjectedRevenueWithExpansion) * 100 : 0;
  const operatingMargin = totalProjectedRevenueWithExpansion > 0 ? (operatingProfit / totalProjectedRevenueWithExpansion) * 100 : 0;
  
  return {
    channels,
    summary: {
      totalBaseRevenue,
      totalProjectedRevenue: totalProjectedRevenueWithExpansion,
      revenueGrowth: totalBaseRevenue > 0 
        ? ((totalProjectedRevenueWithExpansion - totalBaseRevenue) / totalBaseRevenue) * 100 
        : 0,
      totalCogs: totalCogs + (expansionRevenue * params.costs.cogsRate / 100),
      grossProfit,
      grossMargin,
      totalFees: totalCommission + totalAdsCost + generalMarketing,
      operatingProfit,
      operatingMargin,
      overheadCost,
      totalOrders,
      // NEW: expose additional metrics
      customerAcquisitionCost,
      expansionCost,
      expansionRevenue,
      newCustomers,
    }
  };
}

function KPICard({
  title,
  value,
  change,
  format = 'currency',
  icon: Icon,
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10',
}: {
  title: string;
  value: number;
  change?: number;
  format?: 'currency' | 'percent';
  icon: React.ElementType;
  colorClass?: string;
  bgClass?: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold tracking-tight">
                {format === 'currency' ? formatVNDCompact(value) : `${value.toFixed(1)}%`}
              </p>
              {change !== undefined && (
                <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </div>
              )}
            </div>
            <div className={`p-2.5 rounded-xl ${bgClass}`}>
              <Icon className={`w-5 h-5 ${colorClass}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RetailScenarioPanel() {
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();
  const [params, setParams] = useState<RetailChannelParams>(defaultRetailParams);
  
  // Map snapshot to legacy kpiData shape for compatibility
  const kpiData = snapshot ? { 
    totalRevenue: snapshot.netRevenue,
    ebitda: snapshot.ebitda,
  } : undefined;
  
  // Base revenue from KPI data or default
  const baseRevenue = kpiData?.totalRevenue || 10_000_000_000; // 10 tỷ default
  
  const results = useMemo(() => {
    return calculateRetailScenario(baseRevenue, params);
  }, [baseRevenue, params]);
  
  const resetParams = () => {
    setParams(defaultRetailParams);
  };
  
  // Check if params have changed from default
  const hasChanges = JSON.stringify(params) !== JSON.stringify(defaultRetailParams);
  
  // Chart data for channel comparison
  const channelChartData = results.channels.map(ch => ({
    name: ch.displayName,
    'Doanh thu dự kiến': ch.projectedRevenue,
    'Lợi nhuận gộp': ch.netProfit,
    'Biên lợi nhuận': ch.margin,
  }));

  const hasData = !!kpiData?.totalRevenue && kpiData.totalRevenue > 0;

  if (!hasData && !isLoading) {
    const requirements = RETAIL_SIMULATION_REQUIREMENTS({
      hasOrders: false,
      hasRevenue: !!kpiData?.totalRevenue,
      hasChannels: false,
      hasCosts: !!kpiData?.ebitda,
    });

    return (
      <div className="relative h-[500px]">
        <NoDataOverlay requirements={requirements} />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Reset Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetParams}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Doanh thu dự kiến"
          value={results.summary.totalProjectedRevenue}
          change={results.summary.revenueGrowth}
          icon={DollarSign}
          colorClass="text-blue-600"
          bgClass="bg-blue-500/10"
        />
        <KPICard
          title="Lợi nhuận gộp"
          value={results.summary.grossProfit}
          icon={TrendingUp}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-500/10"
        />
        <KPICard
          title="Biên lợi nhuận gộp"
          value={results.summary.grossMargin}
          format="percent"
          icon={Percent}
          colorClass="text-violet-600"
          bgClass="bg-violet-500/10"
        />
        <KPICard
          title="Lợi nhuận hoạt động"
          value={results.summary.operatingProfit}
          icon={Package}
          colorClass="text-amber-600"
          bgClass="bg-amber-500/10"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Parameters */}
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Tham số kịch bản</CardTitle>
                <CardDescription className="text-xs">Điều chỉnh các kênh và chi phí</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto p-4">
            <RetailChannelParamsPanel
              params={params}
              onChange={setParams}
              baseRevenue={baseRevenue}
            />
          </CardContent>
        </Card>

        {/* Right: Results */}
        <div className="space-y-6">
          {/* Channel Performance Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <Store className="w-4 h-4 text-orange-600" />
                </div>
                <CardTitle className="text-base">Hiệu suất theo kênh</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={channelChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs" 
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(v) => formatVNDCompact(v)}
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 50]}
                      className="text-xs"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'Biên lợi nhuận') return [`${value.toFixed(1)}%`, name];
                        return [formatVNDCompact(value), name];
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '12px' }} />
                    <Bar yAxisId="left" dataKey="Doanh thu dự kiến" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                      {channelChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHANNEL_COLORS[results.channels[index]?.name] || 'hsl(var(--primary))'} 
                        />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="Biên lợi nhuận" 
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Channel Breakdown Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Globe className="w-4 h-4 text-blue-600" />
                </div>
                <CardTitle className="text-base">Chi tiết theo kênh</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Kênh</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Doanh thu</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Tăng trưởng</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Lợi nhuận</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Biên LN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {results.channels.map((channel) => (
                      <tr 
                        key={channel.name} 
                        className="hover:bg-muted/20 transition-colors animate-fade-in"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-3 h-3 rounded-full shadow-sm" 
                              style={{ 
                                backgroundColor: CHANNEL_COLORS[channel.name] || '#6366f1',
                                boxShadow: `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${CHANNEL_COLORS[channel.name] || '#6366f1'}30`,
                              }}
                            />
                            <span className="font-medium">{channel.displayName}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">{formatVNDCompact(channel.projectedRevenue)}</td>
                        <td className="text-right py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            channel.growth >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {channel.growth >= 0 ? '+' : ''}{channel.growth}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">{formatVNDCompact(channel.netProfit)}</td>
                        <td className="text-right py-3 px-4">
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                            channel.margin >= 15 ? 'bg-emerald-500/10 text-emerald-600' : 
                            channel.margin >= 5 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {channel.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold bg-gradient-to-r from-primary/5 to-primary/10">
                      <td className="py-3 px-4">Tổng cộng</td>
                      <td className="text-right py-3 px-4">{formatVNDCompact(results.summary.totalProjectedRevenue)}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          results.summary.revenueGrowth >= 0 ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'
                        }`}>
                          {results.summary.revenueGrowth >= 0 ? '+' : ''}{results.summary.revenueGrowth.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">{formatVNDCompact(results.summary.operatingProfit)}</td>
                      <td className="text-right py-3 px-4">{results.summary.operatingMargin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
