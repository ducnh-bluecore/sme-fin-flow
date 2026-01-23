import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  ArrowLeft,
  ShoppingCart,
  Info,
  AlertTriangle,
  CheckCircle2,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  useCDPValueDistribution, 
  useCDPSegmentSummaries, 
  useCDPSummaryStats,
  useCDPDataQuality,
  PercentileDistribution, 
  SegmentSummary 
} from '@/hooks/useCDPValueDistribution';

// Format currency
const formatVND = (value: number): string => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
};

// Percentile bar component
function PercentileBar({ 
  distribution, 
  label, 
  formatValue = (v: number) => formatVND(v),
  unit = ''
}: { 
  distribution: PercentileDistribution; 
  label: string;
  formatValue?: (v: number) => string;
  unit?: string;
}) {
  const percentiles = [
    { key: 'p10', label: 'P10', value: distribution.p10, color: 'bg-red-500' },
    { key: 'p25', label: 'P25', value: distribution.p25, color: 'bg-orange-500' },
    { key: 'p50', label: 'P50', value: distribution.p50, color: 'bg-yellow-500' },
    { key: 'p75', label: 'P75', value: distribution.p75, color: 'bg-emerald-500' },
    { key: 'p90', label: 'P90', value: distribution.p90, color: 'bg-violet-500' },
  ];

  const range = distribution.max - distribution.min;
  const getPosition = (value: number) => {
    if (range === 0) return 50;
    return ((value - distribution.min) / range) * 100;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          Mean: {formatValue(distribution.mean)}{unit}
        </span>
      </div>
      
      {/* Distribution bar */}
      <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
        {/* Range indicator */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          {/* Gradient background */}
          <div 
            className="h-4 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-violet-500/30 rounded"
            style={{ 
              marginLeft: `${getPosition(distribution.p10)}%`,
              width: `${getPosition(distribution.p90) - getPosition(distribution.p10)}%`
            }}
          />
        </div>
        
        {/* Percentile markers */}
        {percentiles.map((p) => (
          <TooltipProvider key={p.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-1 bottom-1 w-1 ${p.color} rounded-full cursor-pointer hover:w-1.5 transition-all`}
                  style={{ left: `${getPosition(p.value)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{p.label}: {formatValue(p.value)}{unit}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatValue(distribution.min)}{unit}</span>
        <div className="flex gap-4">
          {percentiles.map((p) => (
            <span key={p.key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${p.color}`} />
              {p.label}
            </span>
          ))}
        </div>
        <span>{formatValue(distribution.max)}{unit}</span>
      </div>
    </div>
  );
}

// Segment row component
function SegmentRow({ segment, totalRevenue }: { segment: SegmentSummary; totalRevenue: number }) {
  const revenueContribution = totalRevenue > 0 ? (segment.totalRevenue / totalRevenue) * 100 : 0;
  
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-32">
        <span className="font-medium text-sm">{segment.name}</span>
      </div>
      
      <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold">{segment.customerCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Customers</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold">{segment.percentOfTotal.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">of Total</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-emerald-600">{formatVND(segment.totalRevenue)}</div>
          <div className="text-xs text-muted-foreground">Revenue</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold">{revenueContribution.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Rev Share</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold">{formatVND(segment.avgRevenue)}</div>
          <div className="text-xs text-muted-foreground">Avg Value</div>
        </div>
      </div>
      
      <div className="w-20 text-right">
        {segment.trend === 'up' && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            <TrendingUp className="w-3 h-3 mr-1" />
            {segment.trendPercent}%
          </Badge>
        )}
        {segment.trend === 'down' && (
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
            <TrendingDown className="w-3 h-3 mr-1" />
            {segment.trendPercent}%
          </Badge>
        )}
        {segment.trend === 'stable' && (
          <Badge variant="outline" className="text-muted-foreground">
            Stable
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function ValueDistributionPage() {
  const navigate = useNavigate();
  const { data: valueDistribution, isLoading: loadingDistribution } = useCDPValueDistribution();
  const { data: segmentSummaries = [], isLoading: loadingSegments } = useCDPSegmentSummaries();
  const { data: summaryStats, isLoading: loadingStats } = useCDPSummaryStats();
  const { data: dataQuality, isLoading: loadingQuality } = useCDPDataQuality();

  const isLoading = loadingDistribution || loadingSegments || loadingStats || loadingQuality;
  
  const stats = summaryStats || {
    totalCustomers: 0,
    totalRevenue: 0,
    avgCustomerValue: 0,
    avgOrderValue: 0,
    avgFrequency: 0,
    top20Revenue: 0,
    top20Percent: 0,
  };

  const quality = dataQuality || {
    identityCoverage: 0,
    cogsCoverage: 0,
    isReliable: false,
  };

  return (
    <>
      <Helmet>
        <title>Value Distribution | CDP - Bluecore</title>
        <meta name="description" content="Customer value distribution analysis by percentiles" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/cdp')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  CDP
                </Button>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="font-semibold">Value Distribution</h1>
                  <p className="text-xs text-muted-foreground">Phân phối giá trị khách hàng theo percentile</p>
                </div>
              </div>
              <Badge variant="outline" className="text-violet-600 border-violet-300">
                {stats.totalCustomers.toLocaleString()} Customers
              </Badge>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Total Customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalCustomers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique customers with orders
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total Revenue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatVND(stats.totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: {formatVND(stats.avgCustomerValue)}/customer
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Avg Order Value
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatVND(stats.avgOrderValue)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Freq: {stats.avgFrequency.toFixed(1)} orders
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-violet-200 bg-violet-50/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-violet-700">
                      <BarChart3 className="w-4 h-4" />
                      Top 20% Contribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-violet-700">
                      {stats.top20Percent.toFixed(1)}%
                    </div>
                    <p className="text-xs text-violet-600/70 mt-1">
                      = {formatVND(stats.top20Revenue)} revenue
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="distribution" className="space-y-6">
            <TabsList>
              <TabsTrigger value="distribution">Percentile Distribution</TabsTrigger>
              <TabsTrigger value="segments">Value Segments</TabsTrigger>
              <TabsTrigger value="quality">Data Quality</TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="space-y-6">
              {isLoading || !valueDistribution ? (
                <Skeleton className="h-96 rounded-lg" />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-violet-500" />
                            Customer Value Distribution
                          </CardTitle>
                          <CardDescription>
                            Phân phối giá trị theo P10 / P25 / P50 / P75 / P90
                          </CardDescription>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>P50 = Median: 50% khách hàng có giá trị thấp hơn số này</p>
                              <p className="mt-1">P90 = Top 10%: Chỉ 10% khách có giá trị cao hơn</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <PercentileBar 
                        distribution={valueDistribution.revenue} 
                        label="Revenue (Total Spend)"
                        formatValue={formatVND}
                      />
                      
                      <PercentileBar 
                        distribution={valueDistribution.aov} 
                        label="Average Order Value"
                        formatValue={formatVND}
                      />
                      
                      <PercentileBar 
                        distribution={valueDistribution.frequency} 
                        label="Purchase Frequency"
                        formatValue={(v) => v.toFixed(2)}
                        unit=" orders"
                      />
                      
                      <PercentileBar 
                        distribution={valueDistribution.margin} 
                        label="Gross Margin"
                        formatValue={(v) => v.toFixed(1)}
                        unit="%"
                      />
                      
                      <PercentileBar 
                        distribution={valueDistribution.returnRate} 
                        label="Return Rate"
                        formatValue={(v) => v.toFixed(1)}
                        unit="%"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Insight Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      💡 CDP Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-900">
                      <strong>Top 20% khách hàng</strong> đóng góp <strong>{stats.top20Percent.toFixed(1)}%</strong> doanh thu.
                      {stats.top20Percent > 80 && (
                        <span className="block mt-2">
                          ⚠️ Concentration risk cao. Nếu mất 10% khách VIP = -{formatVND(stats.top20Revenue * 0.1)} revenue impact.
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="segments" className="space-y-6">
              {isLoading || segmentSummaries.length === 0 ? (
                <Skeleton className="h-96 rounded-lg" />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-500" />
                        Value Segments
                      </CardTitle>
                      <CardDescription>
                        Phân khúc khách hàng theo percentile giá trị
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {segmentSummaries.map((segment) => (
                        <SegmentRow 
                          key={segment.name} 
                          segment={segment} 
                          totalRevenue={stats.totalRevenue}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            {/* Data Quality Tab */}
            <TabsContent value="quality" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      Data Quality Indicators
                    </CardTitle>
                    <CardDescription>
                      Độ tin cậy của dữ liệu CDP
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Identity Coverage</span>
                          {quality.identityCoverage >= 80 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="text-3xl font-bold">{quality.identityCoverage.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Threshold: 80%</p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">COGS Coverage</span>
                          {quality.cogsCoverage >= 70 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="text-3xl font-bold">{quality.cogsCoverage.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Threshold: 70%</p>
                      </div>
                    </div>

                    <div className={`mt-6 p-4 rounded-lg ${quality.isReliable ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border`}>
                      <div className="flex items-center gap-2">
                        {quality.isReliable ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        )}
                        <span className={`font-medium ${quality.isReliable ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {quality.isReliable 
                            ? 'Data Quality: Reliable' 
                            : 'Data Quality: Needs Review'
                          }
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${quality.isReliable ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {quality.isReliable 
                          ? 'All thresholds met. Insights can be trusted for decisions.'
                          : 'Some coverage metrics below threshold. Insights may need additional validation.'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
