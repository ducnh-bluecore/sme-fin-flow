import { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Target,
  Zap,
  PieChart,
  RefreshCw,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Layers,
  Users,
  Leaf,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatVNDCompact, formatVND } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';

interface ChannelData {
  name: string;
  key: string;
  revenue: number;
  channelCost: number;
  grossProfit: number;
  margin: number;
  share: number;
  growth: number;
  commission: number;
}

interface OptimizationRecommendation {
  channel: string;
  currentShare: number;
  recommendedShare: number;
  change: string;
  rationale: string;
  expectedImpact: string;
  retentionStrategy?: string;
  sustainabilityNote?: string;
}

interface RetentionInsights {
  overview: string;
  bestRetentionChannel: string;
  worstRetentionChannel: string;
  avgRetentionRate: number;
  recommendations: string[];
}

interface SustainabilityAnalysis {
  overallScore: number;
  assessment: string;
  risks: string[];
  opportunities: string[];
  longTermStrategy: string;
}

interface OptimizationResult {
  summary: string;
  recommendations: OptimizationRecommendation[];
  actionItems: string[];
  sustainableGrowthPlan?: string[];
  warnings: string[];
  retentionInsights?: RetentionInsights;
  sustainabilityAnalysis?: SustainabilityAnalysis;
  projectedResults: {
    currentROI: number;
    projectedROI: number;
    revenueIncrease: string;
    costSaving: string;
    retentionImprovement?: string;
    sustainabilityImprovement?: string;
  };
  channelAnalysis: {
    name: string;
    key: string;
    roi: number;
    efficiency: number;
    scalabilityScore: number;
    currentBudget: number;
    revenue: number;
    margin: number;
    returnRate?: number;
    estimatedCLV?: number;
    cac?: number;
    clvCacRatio?: number;
    sustainabilityScore?: number;
    totalCustomers?: number;
    repeatCustomers?: number;
    newCustomers?: number;
    dataSource?: 'real' | 'estimated';
  }[];
  dataQuality?: {
    realDataChannels: number;
    estimatedDataChannels: number;
    totalChannels: number;
    dataReliability: 'high' | 'medium' | 'low';
  };
  dataQualityNote?: string;
  generatedAt: string;
}

interface BudgetOptimizationPanelProps {
  channels: ChannelData[];
  totalBudget: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function BudgetOptimizationPanel({ channels, totalBudget }: BudgetOptimizationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recommendations');

  const handleOptimize = async () => {
    if (channels.length === 0) {
      toast.error('Không có dữ liệu kênh để phân tích');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('optimize-channel-budget', {
        body: {
          channels,
          totalBudget,
          targetROI: 300,
        },
      });

      if (invokeError) throw invokeError;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast.success('Đã tạo đề xuất tối ưu ngân sách');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate before/after comparison data
  const comparisonData = useMemo(() => {
    if (!result || !result.recommendations) return null;

    const channelMap = new Map(channels.map(c => [c.name, c]));
    
    // Build comparison for each channel
    const channelComparison = result.recommendations.map(rec => {
      const channel = channelMap.get(rec.channel);
      const currentBudget = (rec.currentShare / 100) * totalBudget;
      const newBudget = (rec.recommendedShare / 100) * totalBudget;
      const budgetChange = newBudget - currentBudget;
      
      // Estimate metrics based on current performance
      const currentRevenue = channel?.revenue || 0;
      const currentMargin = channel?.margin || 0;
      const currentProfit = channel?.grossProfit || 0;
      
      // Parse expected impact to estimate improvements
      const changePercent = parseFloat(rec.change.replace(/[^0-9.-]/g, '')) || 0;
      const isIncrease = rec.change.startsWith('+');
      
      // Estimate new metrics (simplified projection)
      let projectedRevenueChange = 0;
      let projectedProfitChange = 0;
      
      if (isIncrease) {
        // More budget → more potential revenue (with diminishing returns)
        projectedRevenueChange = currentRevenue * (Math.abs(changePercent) / 100) * 0.7;
        projectedProfitChange = currentProfit * (Math.abs(changePercent) / 100) * 0.5;
      } else {
        // Less budget → reduced but not proportionally
        projectedRevenueChange = -currentRevenue * (Math.abs(changePercent) / 100) * 0.3;
        projectedProfitChange = -currentProfit * (Math.abs(changePercent) / 100) * 0.2;
      }
      
      const newRevenue = currentRevenue + projectedRevenueChange;
      const newProfit = currentProfit + projectedProfitChange;
      const newROI = newBudget > 0 ? (newProfit / newBudget) * 100 : 0;
      const currentROI = currentBudget > 0 ? (currentProfit / currentBudget) * 100 : 0;

      return {
        name: rec.channel,
        currentBudget,
        newBudget,
        budgetChange,
        budgetChangePercent: currentBudget > 0 ? (budgetChange / currentBudget) * 100 : 0,
        currentRevenue,
        newRevenue,
        revenueChange: projectedRevenueChange,
        revenueChangePercent: currentRevenue > 0 ? (projectedRevenueChange / currentRevenue) * 100 : 0,
        currentProfit,
        newProfit,
        profitChange: projectedProfitChange,
        profitChangePercent: currentProfit > 0 ? (projectedProfitChange / currentProfit) * 100 : 0,
        currentROI,
        newROI,
        roiChange: newROI - currentROI,
        currentMargin,
        newMargin: newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0,
      };
    });

    // Calculate totals
    const totalsBefore = {
      budget: channelComparison.reduce((sum, c) => sum + c.currentBudget, 0),
      revenue: channelComparison.reduce((sum, c) => sum + c.currentRevenue, 0),
      profit: channelComparison.reduce((sum, c) => sum + c.currentProfit, 0),
    };
    
    const totalsAfter = {
      budget: channelComparison.reduce((sum, c) => sum + c.newBudget, 0),
      revenue: channelComparison.reduce((sum, c) => sum + c.newRevenue, 0),
      profit: channelComparison.reduce((sum, c) => sum + c.newProfit, 0),
    };

    const overallROIBefore = totalsBefore.budget > 0 ? (totalsBefore.profit / totalsBefore.budget) * 100 : 0;
    const overallROIAfter = totalsAfter.budget > 0 ? (totalsAfter.profit / totalsAfter.budget) * 100 : 0;

    return {
      channels: channelComparison,
      totalsBefore,
      totalsAfter,
      overallROIBefore,
      overallROIAfter,
      roiImprovement: overallROIAfter - overallROIBefore,
      revenueImprovement: totalsAfter.revenue - totalsBefore.revenue,
      profitImprovement: totalsAfter.profit - totalsBefore.profit,
    };
  }, [result, channels, totalBudget]);

  // Chart data for comparison
  const budgetComparisonChartData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.channels.map(c => ({
      name: c.name.length > 8 ? c.name.substring(0, 8) + '...' : c.name,
      fullName: c.name,
      'Trước': c.currentBudget / 1000000,
      'Sau': c.newBudget / 1000000,
    }));
  }, [comparisonData]);

  const metricsComparisonChartData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.channels.map(c => ({
      name: c.name.length > 8 ? c.name.substring(0, 8) + '...' : c.name,
      fullName: c.name,
      'DT Trước': c.currentRevenue / 1000000,
      'DT Sau': c.newRevenue / 1000000,
      'LN Trước': c.currentProfit / 1000000,
      'LN Sau': c.newProfit / 1000000,
    }));
  }, [comparisonData]);

  const roiComparisonData = useMemo(() => {
    if (!comparisonData) return [];
    return comparisonData.channels.map(c => ({
      name: c.name,
      'ROI Trước': Math.min(c.currentROI, 500),
      'ROI Sau': Math.min(c.newROI, 500),
      change: c.roiChange,
    }));
  }, [comparisonData]);

  if (!result && !isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Tối ưu ngân sách Marketing</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sử dụng AI để phân tích ROI từng kênh và đề xuất phân bổ ngân sách tối ưu
          </p>
          <Button onClick={handleOptimize} disabled={isLoading || channels.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Phân tích & Đề xuất
              </>
            )}
          </Button>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">AI đang phân tích dữ liệu kênh...</p>
          <p className="text-xs text-muted-foreground mt-2">Có thể mất 10-20 giây</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Đề xuất tối ưu từ AI</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleOptimize} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          Phân tích lại
        </Button>
      </div>

      {/* Summary with Data Quality */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm">{result.summary}</p>
          {result.dataQuality && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge 
                  variant="outline" 
                  className={cn(
                    result.dataQuality.dataReliability === 'high' && 'bg-success/10 text-success border-success/30',
                    result.dataQuality.dataReliability === 'medium' && 'bg-warning/10 text-warning border-warning/30',
                    result.dataQuality.dataReliability === 'low' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {result.dataQuality.dataReliability === 'high' && 'Dữ liệu tin cậy cao'}
                  {result.dataQuality.dataReliability === 'medium' && 'Dữ liệu tin cậy TB'}
                  {result.dataQuality.dataReliability === 'low' && 'Dữ liệu ước tính'}
                </Badge>
                <span className="text-muted-foreground">
                  {result.dataQuality.realDataChannels > 0 
                    ? `${result.dataQuality.realDataChannels}/${result.dataQuality.totalChannels} kênh có dữ liệu thực từ database`
                    : 'Chưa có đủ dữ liệu khách hàng, đang sử dụng ước tính'}
                </span>
              </div>
              {result.dataQualityNote && (
                <p className="text-xs text-muted-foreground mt-2">{result.dataQualityNote}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="recommendations" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Đề xuất
          </TabsTrigger>
          <TabsTrigger value="retention" className="text-xs">
            <Heart className="w-3 h-3 mr-1" />
            Retention
          </TabsTrigger>
          <TabsTrigger value="sustainability" className="text-xs">
            <Leaf className="w-3 h-3 mr-1" />
            Bền vững
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs">
            <Scale className="w-3 h-3 mr-1" />
            So sánh
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Chi tiết
          </TabsTrigger>
        </TabsList>

        {/* Tab: Recommendations */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {/* Projected Results - Enhanced with Retention & Sustainability */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">ROI Hiện tại</p>
                <p className="text-xl font-bold">{result.projectedResults.currentROI}%</p>
              </CardContent>
            </Card>
            <Card className="bg-success/10 border-success/30">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">ROI Dự kiến</p>
                <p className="text-xl font-bold text-success">{result.projectedResults.projectedROI}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tăng DT</p>
                <p className="text-xl font-bold text-success">{result.projectedResults.revenueIncrease}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tiết kiệm</p>
                <p className="text-xl font-bold">{result.projectedResults.costSaving}</p>
              </CardContent>
            </Card>
            {result.projectedResults.retentionImprovement && (
              <Card className="bg-pink-500/10 border-pink-500/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Retention</p>
                  <p className="text-xl font-bold text-pink-500">{result.projectedResults.retentionImprovement}</p>
                </CardContent>
              </Card>
            )}
            {result.projectedResults.sustainabilityImprovement && (
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Bền vững</p>
                  <p className="text-xl font-bold text-emerald-500">{result.projectedResults.sustainabilityImprovement}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Channel Analysis */}
          {result.channelAnalysis && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  ROI theo kênh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.channelAnalysis.slice(0, 6).map((channel, idx) => (
                  <div key={channel.key} className="flex items-center gap-3">
                    <span className="text-xs w-20 truncate">{channel.name}</span>
                    <div className="flex-1">
                      <Progress 
                        value={Math.min(channel.roi, 500) / 5} 
                        className="h-2"
                      />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs w-16 justify-center',
                        channel.roi >= 200 && 'border-success/50 text-success bg-success/10',
                        channel.roi >= 100 && channel.roi < 200 && 'border-warning/50 text-warning bg-warning/10',
                        channel.roi < 100 && 'border-destructive/50 text-destructive bg-destructive/10'
                      )}
                    >
                      {channel.roi.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Đề xuất phân bổ ngân sách
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.recommendations.map((rec, idx) => {
                const isIncrease = rec.change.startsWith('+');
                const isDecrease = rec.change.startsWith('-');
                
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{rec.channel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{rec.currentShare}%</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Badge 
                          className={cn(
                            isIncrease && 'bg-success/20 text-success border-success/30',
                            isDecrease && 'bg-destructive/20 text-destructive border-destructive/30',
                            !isIncrease && !isDecrease && 'bg-muted'
                          )}
                        >
                          {rec.recommendedShare}% ({rec.change})
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                    <p className="text-xs text-primary mt-1">→ {rec.expectedImpact}</p>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Hành động ưu tiên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-4 h-4" />
                  Lưu ý
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Retention Analysis */}
        <TabsContent value="retention" className="space-y-4 mt-4">
          {/* Retention Overview */}
          {result.retentionInsights && (
            <Card className="bg-gradient-to-br from-pink-500/5 to-pink-500/10 border-pink-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Phân tích tỷ lệ khách quay lại
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{result.retentionInsights.overview}</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Kênh tốt nhất</p>
                    <p className="font-semibold text-success text-sm">{result.retentionInsights.bestRetentionChannel}</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Cần cải thiện</p>
                    <p className="font-semibold text-warning text-sm">{result.retentionInsights.worstRetentionChannel}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Tỷ lệ quay lại trung bình</p>
                  <p className="text-2xl font-bold text-pink-500">{result.retentionInsights.avgRetentionRate}%</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel Retention Rates */}
          {result.channelAnalysis && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tỷ lệ khách quay lại theo kênh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.channelAnalysis.slice(0, 6).map((channel, idx) => (
                  <div key={channel.key} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{channel.name}</span>
                        {channel.dataSource === 'real' ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                            Dữ liệu thực
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                            Ước tính
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            (channel.returnRate || 0) >= 40 && 'border-success/50 text-success bg-success/10',
                            (channel.returnRate || 0) >= 25 && (channel.returnRate || 0) < 40 && 'border-warning/50 text-warning bg-warning/10',
                            (channel.returnRate || 0) < 25 && 'border-destructive/50 text-destructive bg-destructive/10'
                          )}
                        >
                          {(channel.returnRate || 0).toFixed(1)}% quay lại
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {channel.totalCustomers !== undefined && (
                        <div>
                          <span className="block">Khách hàng</span>
                          <span className="font-medium text-foreground">
                            {channel.repeatCustomers || 0}/{channel.totalCustomers}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="block">CLV</span>
                        <span className="font-medium text-foreground">
                          {channel.estimatedCLV ? formatVNDCompact(channel.estimatedCLV) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block">CAC</span>
                        <span className="font-medium text-foreground">
                          {channel.cac ? formatVNDCompact(channel.cac) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block">CLV/CAC</span>
                        <span className={cn(
                          "font-medium",
                          (channel.clvCacRatio || 0) >= 3 ? 'text-success' : 
                          (channel.clvCacRatio || 0) >= 1.5 ? 'text-warning' : 'text-destructive'
                        )}>
                          {(channel.clvCacRatio || 0).toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Retention Improvement Recommendations */}
          {result.retentionInsights?.recommendations && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Đề xuất cải thiện Retention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.retentionInsights.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Sustainability Analysis */}
        <TabsContent value="sustainability" className="space-y-4 mt-4">
          {/* Sustainability Overview */}
          {result.sustainabilityAnalysis && (
            <>
              <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    Đánh giá phát triển bền vững
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 flex items-center justify-center bg-emerald-500/10">
                      <span className="text-2xl font-bold text-emerald-500">
                        {result.sustainabilityAnalysis.overallScore}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Điểm bền vững tổng thể</p>
                      <Progress 
                        value={result.sustainabilityAnalysis.overallScore} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.sustainabilityAnalysis.overallScore >= 70 ? 'Tốt' : 
                         result.sustainabilityAnalysis.overallScore >= 50 ? 'Trung bình' : 'Cần cải thiện'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{result.sustainabilityAnalysis.assessment}</p>
                </CardContent>
              </Card>

              {/* Channel Sustainability Scores */}
              {result.channelAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Điểm bền vững theo kênh
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.channelAnalysis
                      .sort((a, b) => (b.sustainabilityScore || 0) - (a.sustainabilityScore || 0))
                      .slice(0, 6)
                      .map((channel, idx) => (
                        <div key={channel.key} className="flex items-center gap-3">
                          <span className="text-xs w-24 truncate">{channel.name}</span>
                          <div className="flex-1">
                            <Progress 
                              value={channel.sustainabilityScore || 0} 
                              className="h-2"
                            />
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs w-14 justify-center',
                              (channel.sustainabilityScore || 0) >= 70 && 'border-success/50 text-success bg-success/10',
                              (channel.sustainabilityScore || 0) >= 50 && (channel.sustainabilityScore || 0) < 70 && 'border-warning/50 text-warning bg-warning/10',
                              (channel.sustainabilityScore || 0) < 50 && 'border-destructive/50 text-destructive bg-destructive/10'
                            )}
                          >
                            {(channel.sustainabilityScore || 0).toFixed(0)}
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Risks & Opportunities */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Rủi ro cần lưu ý
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.sustainabilityAnalysis.risks.map((risk, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-success/30 bg-success/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-success">
                      <TrendingUp className="w-4 h-4" />
                      Cơ hội phát triển
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.sustainabilityAnalysis.opportunities.map((opp, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {opp}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Long Term Strategy */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Chiến lược dài hạn (3-5 năm)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.sustainabilityAnalysis.longTermStrategy}</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Sustainable Growth Plan */}
          {result.sustainableGrowthPlan && result.sustainableGrowthPlan.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Kế hoạch phát triển bền vững
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.sustainableGrowthPlan.map((plan, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{plan}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Before/After Comparison */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          {comparisonData && (
            <>
              {/* Overall Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Cải thiện ROI</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-success">
                        +{comparisonData.roiImprovement.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comparisonData.overallROIBefore.toFixed(0)}% → {comparisonData.overallROIAfter.toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Tăng doanh thu</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        comparisonData.revenueImprovement >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {comparisonData.revenueImprovement >= 0 ? '+' : ''}{formatVNDCompact(comparisonData.revenueImprovement)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comparisonData.totalsBefore.revenue > 0 
                        ? `${((comparisonData.revenueImprovement / comparisonData.totalsBefore.revenue) * 100).toFixed(1)}% so với hiện tại`
                        : 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">Tăng lợi nhuận</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        comparisonData.profitImprovement >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {comparisonData.profitImprovement >= 0 ? '+' : ''}{formatVNDCompact(comparisonData.profitImprovement)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comparisonData.totalsBefore.profit > 0
                        ? `${((comparisonData.profitImprovement / comparisonData.totalsBefore.profit) * 100).toFixed(1)}% so với hiện tại`
                        : 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Ngân sách</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {formatVNDCompact(comparisonData.totalsAfter.budget)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Phân bổ lại hiệu quả hơn
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Budget Comparison Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    So sánh phân bổ ngân sách
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetComparisonChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          type="number" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}M`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={80}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)} triệu`,
                            name
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Trước" fill="hsl(var(--muted-foreground))" opacity={0.5} />
                        <Bar dataKey="Sau" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue & Profit Comparison Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    So sánh doanh thu & lợi nhuận
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metricsComparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}M`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)} triệu`,
                            name
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="DT Trước" fill="hsl(var(--muted-foreground))" opacity={0.4} />
                        <Bar dataKey="DT Sau" fill="#3b82f6" />
                        <Bar dataKey="LN Trước" fill="hsl(var(--muted-foreground))" opacity={0.4} />
                        <Bar dataKey="LN Sau" fill="#10b981" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ROI Comparison Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    So sánh ROI theo kênh
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roiComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 9 }}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="ROI Trước" fill="hsl(var(--muted-foreground))" opacity={0.5} />
                        <Bar dataKey="ROI Sau" fill="hsl(var(--success))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab: Detailed Table */}
        <TabsContent value="details" className="space-y-4 mt-4">
          {comparisonData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Bảng so sánh chi tiết theo kênh
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Kênh</th>
                      <th className="text-right p-2 font-medium">NS Trước</th>
                      <th className="text-right p-2 font-medium">NS Sau</th>
                      <th className="text-right p-2 font-medium">Thay đổi</th>
                      <th className="text-right p-2 font-medium">DT Trước</th>
                      <th className="text-right p-2 font-medium">DT Sau</th>
                      <th className="text-right p-2 font-medium">LN Trước</th>
                      <th className="text-right p-2 font-medium">LN Sau</th>
                      <th className="text-right p-2 font-medium">ROI Trước</th>
                      <th className="text-right p-2 font-medium">ROI Sau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.channels.map((channel, idx) => (
                      <motion.tr
                        key={channel.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-2 font-medium">{channel.name}</td>
                        <td className="text-right p-2 text-muted-foreground">
                          {formatVNDCompact(channel.currentBudget)}
                        </td>
                        <td className="text-right p-2">
                          {formatVNDCompact(channel.newBudget)}
                        </td>
                        <td className={cn(
                          "text-right p-2 font-medium",
                          channel.budgetChange > 0 && "text-success",
                          channel.budgetChange < 0 && "text-destructive"
                        )}>
                          <span className="flex items-center justify-end gap-1">
                            {channel.budgetChange > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : channel.budgetChange < 0 ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : null}
                            {channel.budgetChangePercent.toFixed(0)}%
                          </span>
                        </td>
                        <td className="text-right p-2 text-muted-foreground">
                          {formatVNDCompact(channel.currentRevenue)}
                        </td>
                        <td className={cn(
                          "text-right p-2",
                          channel.revenueChange > 0 && "text-success",
                          channel.revenueChange < 0 && "text-destructive"
                        )}>
                          {formatVNDCompact(channel.newRevenue)}
                        </td>
                        <td className="text-right p-2 text-muted-foreground">
                          {formatVNDCompact(channel.currentProfit)}
                        </td>
                        <td className={cn(
                          "text-right p-2",
                          channel.profitChange > 0 && "text-success",
                          channel.profitChange < 0 && "text-destructive"
                        )}>
                          {formatVNDCompact(channel.newProfit)}
                        </td>
                        <td className="text-right p-2 text-muted-foreground">
                          {channel.currentROI.toFixed(0)}%
                        </td>
                        <td className={cn(
                          "text-right p-2 font-medium",
                          channel.roiChange > 0 && "text-success",
                          channel.roiChange < 0 && "text-destructive"
                        )}>
                          {channel.newROI.toFixed(0)}%
                        </td>
                      </motion.tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-2">Tổng cộng</td>
                      <td className="text-right p-2">
                        {formatVNDCompact(comparisonData.totalsBefore.budget)}
                      </td>
                      <td className="text-right p-2">
                        {formatVNDCompact(comparisonData.totalsAfter.budget)}
                      </td>
                      <td className="text-right p-2">-</td>
                      <td className="text-right p-2">
                        {formatVNDCompact(comparisonData.totalsBefore.revenue)}
                      </td>
                      <td className={cn(
                        "text-right p-2",
                        comparisonData.revenueImprovement > 0 && "text-success"
                      )}>
                        {formatVNDCompact(comparisonData.totalsAfter.revenue)}
                      </td>
                      <td className="text-right p-2">
                        {formatVNDCompact(comparisonData.totalsBefore.profit)}
                      </td>
                      <td className={cn(
                        "text-right p-2",
                        comparisonData.profitImprovement > 0 && "text-success"
                      )}>
                        {formatVNDCompact(comparisonData.totalsAfter.profit)}
                      </td>
                      <td className="text-right p-2">
                        {comparisonData.overallROIBefore.toFixed(0)}%
                      </td>
                      <td className={cn(
                        "text-right p-2",
                        comparisonData.roiImprovement > 0 && "text-success"
                      )}>
                        {comparisonData.overallROIAfter.toFixed(0)}%
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <span><strong>NS</strong> = Ngân sách</span>
                  <span><strong>DT</strong> = Doanh thu</span>
                  <span><strong>LN</strong> = Lợi nhuận gộp</span>
                  <span><strong>ROI</strong> = Return on Investment</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Insights */}
          {comparisonData && (
            <Card className="bg-gradient-to-r from-success/5 to-primary/5 border-success/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  Kết luận
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  • ROI tổng thể dự kiến tăng từ <strong>{comparisonData.overallROIBefore.toFixed(0)}%</strong> lên <strong className="text-success">{comparisonData.overallROIAfter.toFixed(0)}%</strong> (cải thiện {comparisonData.roiImprovement.toFixed(1)}%)
                </p>
                <p>
                  • Doanh thu dự kiến tăng thêm <strong className="text-success">{formatVNDCompact(comparisonData.revenueImprovement)}</strong>
                </p>
                <p>
                  • Lợi nhuận gộp dự kiến tăng thêm <strong className="text-success">{formatVNDCompact(comparisonData.profitImprovement)}</strong>
                </p>
                {comparisonData.channels
                  .filter(c => c.budgetChangePercent > 20)
                  .slice(0, 2)
                  .map(c => (
                    <p key={c.name}>
                      • Nên <strong className="text-success">tăng đầu tư</strong> vào <strong>{c.name}</strong> (+{c.budgetChangePercent.toFixed(0)}% ngân sách)
                    </p>
                  ))
                }
                {comparisonData.channels
                  .filter(c => c.budgetChangePercent < -20)
                  .slice(0, 2)
                  .map(c => (
                    <p key={c.name}>
                      • Nên <strong className="text-warning">giảm đầu tư</strong> vào <strong>{c.name}</strong> ({c.budgetChangePercent.toFixed(0)}% ngân sách)
                    </p>
                  ))
                }
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Phân tích lúc {new Date(result.generatedAt).toLocaleString('vi-VN')}
      </p>
    </motion.div>
  );
}
