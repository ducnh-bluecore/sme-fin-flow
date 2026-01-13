import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

interface ChannelBudget {
  channel: string;
  currentBudget: number;
  suggestedBudget: number;
  currentROAS: number;
  projectedROAS: number;
  currentRevenue: number;
  projectedRevenue: number;
  confidence: number;
  action: 'increase' | 'decrease' | 'maintain';
}

const channelBudgets: ChannelBudget[] = [
  {
    channel: 'Facebook Ads',
    currentBudget: 450000000,
    suggestedBudget: 580000000,
    currentROAS: 3.2,
    projectedROAS: 3.8,
    currentRevenue: 1440000000,
    projectedRevenue: 2204000000,
    confidence: 92,
    action: 'increase',
  },
  {
    channel: 'Google Ads',
    currentBudget: 380000000,
    suggestedBudget: 420000000,
    currentROAS: 4.1,
    projectedROAS: 4.3,
    currentRevenue: 1558000000,
    projectedRevenue: 1806000000,
    confidence: 88,
    action: 'increase',
  },
  {
    channel: 'TikTok Ads',
    currentBudget: 280000000,
    suggestedBudget: 180000000,
    currentROAS: 1.8,
    projectedROAS: 2.4,
    currentRevenue: 504000000,
    projectedRevenue: 432000000,
    confidence: 75,
    action: 'decrease',
  },
  {
    channel: 'Email Marketing',
    currentBudget: 85000000,
    suggestedBudget: 120000000,
    currentROAS: 8.5,
    projectedROAS: 7.8,
    currentRevenue: 722500000,
    projectedRevenue: 936000000,
    confidence: 95,
    action: 'increase',
  },
  {
    channel: 'Shopee Ads',
    currentBudget: 220000000,
    suggestedBudget: 220000000,
    currentROAS: 2.8,
    projectedROAS: 2.9,
    currentRevenue: 616000000,
    projectedRevenue: 638000000,
    confidence: 82,
    action: 'maintain',
  },
  {
    channel: 'Lazada Ads',
    currentBudget: 185000000,
    suggestedBudget: 140000000,
    currentROAS: 2.1,
    projectedROAS: 2.6,
    currentRevenue: 388500000,
    projectedRevenue: 364000000,
    confidence: 78,
    action: 'decrease',
  },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

const getActionConfig = (action: ChannelBudget['action']) => {
  const configs = {
    increase: { label: 'Tăng', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: TrendingUp },
    decrease: { label: 'Giảm', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown },
    maintain: { label: 'Giữ', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Target },
  };
  return configs[action];
};

export default function BudgetOptimizerPage() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [optimizationGoal, setOptimizationGoal] = useState<'revenue' | 'roas' | 'profit'>('profit');
  const [riskTolerance, setRiskTolerance] = useState([50]);
  const [autoApply, setAutoApply] = useState(false);

  const totalCurrentBudget = channelBudgets.reduce((acc, c) => acc + c.currentBudget, 0);
  const totalSuggestedBudget = channelBudgets.reduce((acc, c) => acc + c.suggestedBudget, 0);
  const totalCurrentRevenue = channelBudgets.reduce((acc, c) => acc + c.currentRevenue, 0);
  const totalProjectedRevenue = channelBudgets.reduce((acc, c) => acc + c.projectedRevenue, 0);
  const avgConfidence = channelBudgets.reduce((acc, c) => acc + c.confidence, 0) / channelBudgets.length;
  const revenueLift = totalProjectedRevenue - totalCurrentRevenue;
  const budgetChange = totalSuggestedBudget - totalCurrentBudget;

  const budgetDistributionData = channelBudgets.map(c => ({
    name: c.channel,
    current: c.currentBudget / 1000000,
    suggested: c.suggestedBudget / 1000000,
  }));

  const pieData = channelBudgets.map((c, idx) => ({
    name: c.channel,
    value: c.suggestedBudget,
    color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'][idx],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="h-7 w-7 text-violet-400" />
            Budget Optimizer
          </h1>
          <p className="text-slate-400 mt-1">AI gợi ý phân bổ ngân sách tối ưu theo mục tiêu</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tính lại
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Sparkles className="h-4 w-4" />
            Áp dụng đề xuất
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Wallet className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đề xuất ngân sách</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSuggestedBudget)}</p>
                <p className={cn(
                  "text-xs",
                  budgetChange >= 0 ? "text-yellow-400" : "text-emerald-400"
                )}>
                  {budgetChange >= 0 ? '+' : ''}{formatCurrency(budgetChange)} vs hiện tại
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue Lift dự kiến</p>
                <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(revenueLift)}</p>
                <p className="text-xs text-muted-foreground">
                  +{((revenueLift / totalCurrentRevenue) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projected ROAS</p>
                <p className="text-2xl font-bold">3.9x</p>
                <p className="text-xs text-emerald-400">+0.5x vs hiện tại</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Target className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence Score</p>
                <p className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">AI prediction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Settings */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-400" />
            Cài đặt tối ưu hóa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Optimization Goal */}
            <div className="space-y-3">
              <Label>Mục tiêu tối ưu</Label>
              <div className="flex gap-2">
                {[
                  { value: 'profit', label: 'Profit', icon: DollarSign },
                  { value: 'revenue', label: 'Revenue', icon: TrendingUp },
                  { value: 'roas', label: 'ROAS', icon: Target },
                ].map((goal) => (
                  <Button
                    key={goal.value}
                    variant={optimizationGoal === goal.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOptimizationGoal(goal.value as typeof optimizationGoal)}
                    className={cn(
                      "flex-1",
                      optimizationGoal === goal.value && "bg-violet-600 hover:bg-violet-700"
                    )}
                  >
                    <goal.icon className="h-4 w-4 mr-1" />
                    {goal.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Risk Tolerance */}
            <div className="space-y-3">
              <Label>Mức độ chấp nhận rủi ro</Label>
              <div className="space-y-2">
                <Slider
                  value={riskTolerance}
                  onValueChange={setRiskTolerance}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Thận trọng</span>
                  <span className="font-medium text-violet-400">{riskTolerance}%</span>
                  <span>Mạo hiểm</span>
                </div>
              </div>
            </div>

            {/* Auto Apply */}
            <div className="space-y-3">
              <Label>Tự động áp dụng</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-apply"
                  checked={autoApply}
                  onCheckedChange={setAutoApply}
                />
                <Label htmlFor="auto-apply" className="text-sm text-muted-foreground">
                  Tự động cập nhật ngân sách theo đề xuất hàng tuần
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="recommendations">Đề xuất theo kênh</TabsTrigger>
          <TabsTrigger value="comparison">So sánh</TabsTrigger>
          <TabsTrigger value="distribution">Phân bổ</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-6 space-y-4">
          {channelBudgets.map((channel, idx) => {
            const actionConfig = getActionConfig(channel.action);
            const ActionIcon = actionConfig.icon;
            const budgetDiff = channel.suggestedBudget - channel.currentBudget;
            const revenueDiff = channel.projectedRevenue - channel.currentRevenue;

            return (
              <Card key={idx} className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Channel Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{channel.channel}</h3>
                        <Badge variant="outline" className={actionConfig.color}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {actionConfig.label}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          Confidence: {channel.confidence}%
                        </Badge>
                      </div>
                      
                      {/* Budget Change Visualization */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Hiện tại</p>
                          <p className="font-semibold">{formatCurrency(channel.currentBudget)}</p>
                        </div>
                        <ArrowRight className={cn(
                          "h-5 w-5",
                          channel.action === 'increase' ? "text-emerald-400" :
                          channel.action === 'decrease' ? "text-red-400" : "text-slate-400"
                        )} />
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Đề xuất</p>
                          <p className={cn(
                            "font-semibold",
                            channel.action === 'increase' ? "text-emerald-400" :
                            channel.action === 'decrease' ? "text-red-400" : ""
                          )}>
                            {formatCurrency(channel.suggestedBudget)}
                          </p>
                        </div>
                        <Badge className={cn(
                          "ml-2",
                          budgetDiff > 0 ? "bg-emerald-500/20 text-emerald-400" :
                          budgetDiff < 0 ? "bg-red-500/20 text-red-400" : "bg-slate-500/20 text-slate-400"
                        )}>
                          {budgetDiff > 0 ? '+' : ''}{formatCurrency(budgetDiff)}
                        </Badge>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">ROAS hiện tại</p>
                        <p className="font-semibold">{channel.currentROAS}x</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">ROAS dự kiến</p>
                        <p className={cn(
                          "font-semibold",
                          channel.projectedROAS > channel.currentROAS ? "text-emerald-400" : "text-red-400"
                        )}>
                          {channel.projectedROAS}x
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Revenue dự kiến</p>
                        <p className="font-semibold text-violet-400">{formatCurrency(channel.projectedRevenue)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Revenue Lift</p>
                        <p className={cn(
                          "font-semibold",
                          revenueDiff >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {revenueDiff >= 0 ? '+' : ''}{formatCurrency(revenueDiff)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">So sánh ngân sách hiện tại vs đề xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetDistributionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}M`} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(value: number) => [`${value.toFixed(0)}M`, '']}
                    />
                    <Legend />
                    <Bar dataKey="current" name="Hiện tại" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="suggested" name="Đề xuất" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Phân bổ ngân sách đề xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
