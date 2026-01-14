import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  UserCheck,
  UserX,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  MapPin,
  BarChart3,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  Wallet,
  TrendingDown as ChurnIcon,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { useAudienceData } from '@/hooks/useAudienceData';
import { Button } from '@/components/ui/button';
import { ExportAudienceDialog } from '@/components/mdp/audience/ExportAudienceDialog';

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

export default function AudienceInsightsPage() {
  const { 
    segments, 
    stats, 
    rfmSegments, 
    cohortData, 
    segmentProfitData, 
    churnRiskData, 
    actionableInsights,
    geographicData,
    isLoading, 
    error 
  } = useAudienceData();
  const [activeTab, setActiveTab] = useState('insights');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Prepare segments for export dialog
  const exportSegments = segments.map((s, idx) => ({
    id: `segment-${idx}`,
    name: s.name,
    count: s.size,
    description: `${s.percentage.toFixed(1)}% of customers, LTV: ${s.ltv.toLocaleString()}`
  }));

  const exportRfmSegments = rfmSegments.map(s => ({
    id: s.name.toLowerCase().replace(/\s+/g, '-'),
    name: s.name,
    count: s.count,
    description: s.description
  }));

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-muted-foreground">Không thể tải dữ liệu Audience</p>
        </div>
      </div>
    );
  }

  const priorityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const recommendationColors = {
    scale: 'bg-emerald-500/20 text-emerald-400',
    maintain: 'bg-blue-500/20 text-blue-400',
    optimize: 'bg-yellow-500/20 text-yellow-400',
    stop: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-violet-400" />
            Audience Insights
          </h1>
          <p className="text-muted-foreground mt-1">Phân tích RFM, Profit Attribution & Churn Risk theo MDP Manifesto</p>
        </div>
        <Button onClick={() => setExportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Import to Ads
        </Button>
      </div>

      {/* Export Audience Dialog */}
      <ExportAudienceDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        segments={exportSegments}
        rfmSegments={exportRfmSegments}
      />

      {/* Key Metrics - FDP Connected */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Users className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Customers</p>
                    <p className="text-xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contribution Margin</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalContributionMargin)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LTV:CAC Ratio</p>
                    <p className="text-xl font-bold">{stats.ltcCacRatio.toFixed(1)}x</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <UserCheck className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Champions</p>
                    <p className="text-xl font-bold">{rfmSegments.find(s => s.name === 'Champions')?.count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Wallet className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cash At Risk</p>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(stats.totalCashAtRisk)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <UserX className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Churn Risk Value</p>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(stats.churnRiskValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Actionable Insights
          </TabsTrigger>
          <TabsTrigger value="rfm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            RFM Analysis
          </TabsTrigger>
          <TabsTrigger value="profit" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Profit Attribution
          </TabsTrigger>
          <TabsTrigger value="churn" className="gap-2">
            <ChurnIcon className="h-4 w-4" />
            Churn Risk
          </TabsTrigger>
          <TabsTrigger value="cohort" className="gap-2">
            <Clock className="h-4 w-4" />
            Cohort
          </TabsTrigger>
          <TabsTrigger value="geography" className="gap-2">
            <MapPin className="h-4 w-4" />
            Geography
          </TabsTrigger>
        </TabsList>

        {/* Actionable Insights Tab */}
        <TabsContent value="insights" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : actionableInsights.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có insights. Cần thêm dữ liệu đơn hàng.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {actionableInsights.map((insight) => (
                <Card key={insight.id} className={cn('border-l-4', 
                  insight.priority === 'critical' ? 'border-l-red-500' :
                  insight.priority === 'high' ? 'border-l-orange-500' :
                  insight.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-slate-500'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {insight.type === 'opportunity' && <Zap className="h-5 w-5 text-emerald-400" />}
                          {insight.type === 'risk' && <AlertTriangle className="h-5 w-5 text-red-400" />}
                          {insight.type === 'action' && <Target className="h-5 w-5 text-blue-400" />}
                          <h3 className="font-semibold text-foreground">{insight.title}</h3>
                          <Badge variant="outline" className={priorityColors[insight.priority]}>
                            {insight.priority.toUpperCase()}
                          </Badge>
                          {insight.deadline && (
                            <Badge variant="outline" className="border-red-500/30 text-red-400">
                              <Clock className="h-3 w-3 mr-1" />
                              {insight.deadline}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Impact: </span>
                            <span className={cn('font-semibold',
                              insight.impactType === 'revenue' ? 'text-emerald-400' :
                              insight.impactType === 'cost' ? 'text-blue-400' : 'text-orange-400'
                            )}>
                              {formatCurrency(insight.impact)} ({insight.impactType})
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="gap-1">
                        {insight.action}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RFM Analysis Tab */}
        <TabsContent value="rfm" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-4">
              {rfmSegments.map((segment) => (
                <Card key={segment.name} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                          <h3 className="font-semibold text-foreground">{segment.name}</h3>
                          <Badge variant="outline" className={priorityColors[segment.priority]}>
                            {segment.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{segment.count.toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground">({segment.percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={segment.percentage} className="h-2 mt-2" />
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Avg Revenue</p>
                          <p className="font-semibold text-violet-400">{formatCurrency(segment.avgRevenue)}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Avg Frequency</p>
                          <p className="font-semibold">{segment.avgFrequency.toFixed(1)}x</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Potential Value</p>
                          <p className="font-semibold text-emerald-400">{formatCurrency(segment.potentialValue)}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Risk Value</p>
                          <p className="font-semibold text-red-400">{formatCurrency(segment.riskValue)}</p>
                        </div>
                      </div>
                      <div className="lg:w-48">
                        <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
                        <p className="text-sm font-medium">{segment.recommendedAction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profit Attribution Tab */}
        <TabsContent value="profit" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : segmentProfitData.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có dữ liệu profit attribution</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentProfitData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="segment" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" />
                    <Bar dataKey="contributionMargin" name="Contribution Margin" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid gap-4">
                {segmentProfitData.map((segment) => (
                  <Card key={segment.segment} className="border-border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{segment.segment}</h3>
                        <Badge className={recommendationColors[segment.recommendation]}>
                          {segment.recommendation.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">{formatCurrency(segment.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">COGS</p>
                          <p className="font-semibold text-red-400">-{formatCurrency(segment.cogs)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Marketing Cost</p>
                          <p className="font-semibold text-orange-400">-{formatCurrency(segment.marketingCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contribution Margin</p>
                          <p className={cn('font-semibold', segment.contributionMargin >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {formatCurrency(segment.contributionMargin)} ({segment.marginPercent.toFixed(1)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cash At Risk</p>
                          <p className="font-semibold text-orange-400">{formatCurrency(segment.cashAtRisk)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Churn Risk Tab */}
        <TabsContent value="churn" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : churnRiskData.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <UserCheck className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Không có khách hàng có nguy cơ churn cao</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {churnRiskData.map((risk) => (
                <Card key={risk.segment} className={cn('border-l-4',
                  risk.urgency === 'critical' ? 'border-l-red-500' :
                  risk.urgency === 'high' ? 'border-l-orange-500' : 'border-l-yellow-500'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{risk.segment}</h3>
                          <Badge variant="outline" className={priorityColors[risk.urgency]}>
                            {risk.urgency.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Customers At Risk</p>
                            <p className="text-xl font-bold">{risk.customersAtRisk}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Potential Loss</p>
                            <p className="text-xl font-bold text-red-400">{formatCurrency(risk.potentialLoss)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Days Inactive</p>
                            <p className="text-xl font-bold">{Math.round(risk.daysInactive)} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Win-back Probability</p>
                            <p className={cn('text-xl font-bold', 
                              risk.winBackProbability >= 50 ? 'text-emerald-400' :
                              risk.winBackProbability >= 30 ? 'text-yellow-400' : 'text-red-400'
                            )}>{risk.winBackProbability}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-2">Recommended Action</p>
                        <p className="text-sm font-medium max-w-xs">{risk.recommendedAction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Cohort Tab */}
        <TabsContent value="cohort" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : cohortData.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có dữ liệu cohort</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Cohort Retention Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Cohort</th>
                        <th className="text-center p-2">Customers</th>
                        <th className="text-center p-2">Avg LTV</th>
                        <th className="text-center p-2">M0</th>
                        <th className="text-center p-2">M1</th>
                        <th className="text-center p-2">M2</th>
                        <th className="text-center p-2">M3</th>
                        <th className="text-center p-2">M4</th>
                        <th className="text-center p-2">M5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((cohort) => (
                        <tr key={cohort.cohort} className="border-b border-border/50">
                          <td className="p-2 font-medium">{cohort.cohort}</td>
                          <td className="text-center p-2">{cohort.totalCustomers}</td>
                          <td className="text-center p-2">{formatCurrency(cohort.avgLTV)}</td>
                          {[cohort.month0, cohort.month1, cohort.month2, cohort.month3, cohort.month4, cohort.month5].map((val, idx) => (
                            <td key={idx} className="text-center p-2">
                              <span className={cn(
                                'px-2 py-1 rounded text-xs font-medium',
                                val >= 50 ? 'bg-emerald-500/20 text-emerald-400' :
                                val >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                                val > 0 ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground'
                              )}>
                                {val > 0 ? `${val.toFixed(0)}%` : '-'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : geographicData.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có dữ liệu địa lý</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {geographicData.slice(0, 10).map((loc, idx) => (
                <Card key={idx} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{loc.city}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm',
                              loc.growthRate >= 0 ? 'text-emerald-400' : 'text-red-400'
                            )}>
                              {loc.growthRate >= 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                              {Math.abs(loc.growthRate).toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground">{loc.percentage.toFixed(1)}% share</span>
                          </div>
                        </div>
                        <Progress value={loc.percentage} className="h-2" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right min-w-[300px]">
                        <div>
                          <p className="text-xs text-muted-foreground">Customers</p>
                          <p className="font-semibold">{loc.customers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-semibold">{formatCurrency(loc.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CM</p>
                          <p className="font-semibold text-emerald-400">{formatCurrency(loc.contributionMargin)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
