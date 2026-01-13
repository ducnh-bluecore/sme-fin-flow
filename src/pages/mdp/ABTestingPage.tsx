import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Plus,
  BarChart3,
  DollarSign,
  Users,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused' | 'draft';
  channel: string;
  startDate: string;
  endDate?: string;
  variants: {
    name: string;
    traffic: number;
    conversions: number;
    revenue: number;
    cpa: number;
    isWinner?: boolean;
  }[];
  confidence: number;
  sampleSize: number;
  targetSampleSize: number;
}

const mockTests: ABTest[] = [
  {
    id: '1',
    name: 'Landing Page - CTA Button Color',
    status: 'running',
    channel: 'Facebook Ads',
    startDate: '2024-01-10',
    variants: [
      { name: 'Control (Blue)', traffic: 15420, conversions: 462, revenue: 185000000, cpa: 125000, isWinner: false },
      { name: 'Variant A (Orange)', traffic: 15380, conversions: 538, revenue: 215200000, cpa: 108000, isWinner: true },
    ],
    confidence: 94.5,
    sampleSize: 30800,
    targetSampleSize: 35000,
  },
  {
    id: '2',
    name: 'Email Subject Line Test',
    status: 'completed',
    channel: 'Email Marketing',
    startDate: '2024-01-05',
    endDate: '2024-01-12',
    variants: [
      { name: 'Control: "Ưu đãi đặc biệt"', traffic: 25000, conversions: 875, revenue: 350000000, cpa: 95000, isWinner: false },
      { name: 'Variant: "Chỉ hôm nay - Giảm 50%"', traffic: 25000, conversions: 1125, revenue: 450000000, cpa: 85000, isWinner: true },
    ],
    confidence: 99.2,
    sampleSize: 50000,
    targetSampleSize: 50000,
  },
  {
    id: '3',
    name: 'Product Page Layout',
    status: 'running',
    channel: 'Google Ads',
    startDate: '2024-01-15',
    variants: [
      { name: 'Control (Grid)', traffic: 8500, conversions: 255, revenue: 102000000, cpa: 135000, isWinner: false },
      { name: 'Variant A (List)', traffic: 8450, conversions: 287, revenue: 114800000, cpa: 120000, isWinner: true },
      { name: 'Variant B (Carousel)', traffic: 8520, conversions: 230, revenue: 92000000, cpa: 145000, isWinner: false },
    ],
    confidence: 78.3,
    sampleSize: 25470,
    targetSampleSize: 45000,
  },
  {
    id: '4',
    name: 'Checkout Flow Optimization',
    status: 'paused',
    channel: 'TikTok Ads',
    startDate: '2024-01-08',
    variants: [
      { name: 'Control (3-step)', traffic: 5200, conversions: 156, revenue: 62400000, cpa: 142000, isWinner: false },
      { name: 'Variant (1-step)', traffic: 5180, conversions: 181, revenue: 72400000, cpa: 125000, isWinner: true },
    ],
    confidence: 65.2,
    sampleSize: 10380,
    targetSampleSize: 30000,
  },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

const getStatusConfig = (status: ABTest['status']) => {
  const configs = {
    running: { label: 'Đang chạy', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play },
    completed: { label: 'Hoàn thành', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2 },
    paused: { label: 'Tạm dừng', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Pause },
    draft: { label: 'Nháp', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Clock },
  };
  return configs[status];
};

export default function ABTestingPage() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredTests = activeTab === 'all' 
    ? mockTests 
    : mockTests.filter(t => t.status === activeTab);

  const stats = {
    running: mockTests.filter(t => t.status === 'running').length,
    completed: mockTests.filter(t => t.status === 'completed').length,
    totalRevenueLift: 115200000 + 100000000, // Revenue improvement from winners
    avgConfidence: 84.3,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-violet-400" />
            A/B Testing Hub
          </h1>
          <p className="text-slate-400 mt-1">Quản lý và theo dõi các thử nghiệm marketing</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Tạo Test Mới
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Play className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang chạy</p>
                <p className="text-2xl font-bold">{stats.running}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
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
                <p className="text-sm text-muted-foreground">Revenue Lift</p>
                <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(stats.totalRevenueLift)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Target className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">Tất cả ({mockTests.length})</TabsTrigger>
              <TabsTrigger value="running">Đang chạy ({stats.running})</TabsTrigger>
              <TabsTrigger value="completed">Hoàn thành ({stats.completed})</TabsTrigger>
              <TabsTrigger value="paused">Tạm dừng</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredTests.map((test) => {
            const statusConfig = getStatusConfig(test.status);
            const StatusIcon = statusConfig.icon;
            const progress = (test.sampleSize / test.targetSampleSize) * 100;
            const winningVariant = test.variants.find(v => v.isWinner);
            const controlVariant = test.variants.find(v => !v.isWinner);
            const improvement = controlVariant && winningVariant
              ? ((winningVariant.conversions / winningVariant.traffic) - (controlVariant.conversions / controlVariant.traffic)) / (controlVariant.conversions / controlVariant.traffic) * 100
              : 0;

            return (
              <div 
                key={test.id} 
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Test Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{test.name}</h3>
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {test.channel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Bắt đầu: {test.startDate} {test.endDate && `• Kết thúc: ${test.endDate}`}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sample size</span>
                        <span className="font-medium">{test.sampleSize.toLocaleString()} / {test.targetSampleSize.toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Variants */}
                    <div className="grid gap-2">
                      {test.variants.map((variant, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-sm",
                            variant.isWinner ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {variant.isWinner && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            <span className={variant.isWinner ? "font-medium text-emerald-400" : "text-muted-foreground"}>
                              {variant.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              <Users className="h-3 w-3 inline mr-1" />
                              {variant.traffic.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              CVR: {((variant.conversions / variant.traffic) * 100).toFixed(2)}%
                            </span>
                            <span className="text-muted-foreground">
                              <DollarSign className="h-3 w-3 inline" />
                              {formatCurrency(variant.revenue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="lg:w-48 space-y-3 p-3 rounded-lg bg-muted/50">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Statistical Confidence</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        test.confidence >= 95 ? "text-emerald-400" :
                        test.confidence >= 80 ? "text-yellow-400" : "text-slate-400"
                      )}>
                        {test.confidence}%
                      </p>
                    </div>
                    {improvement > 0 && (
                      <div className="text-center pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Conversion Lift</p>
                        <p className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          +{improvement.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full">
                      Xem chi tiết
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
