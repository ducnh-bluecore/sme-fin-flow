import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FlaskConical, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Play,
  Pause,
  Plus,
  Users,
  DollarSign,
  Target,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useABTestingData, ABTest } from '@/hooks/useABTestingData';

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
  const { abTests, stats, isLoading, error, toggleTestStatus } = useABTestingData();
  const [activeTab, setActiveTab] = useState('all');

  const filteredTests = activeTab === 'all' 
    ? abTests 
    : abTests.filter(t => t.status === activeTab);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-muted-foreground">Không thể tải dữ liệu A/B Testing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-violet-400" />
            A/B Testing Hub
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý và theo dõi các thử nghiệm marketing</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Tạo Test Mới
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
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
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.totalRevenueLift > 0 ? '+' : ''}{formatCurrency(stats.totalRevenueLift)}đ
                    </p>
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
                    <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tests List */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">Tất cả ({abTests.length})</TabsTrigger>
              <TabsTrigger value="running">Đang chạy ({stats.running})</TabsTrigger>
              <TabsTrigger value="completed">Hoàn thành ({stats.completed})</TabsTrigger>
              <TabsTrigger value="paused">Tạm dừng ({stats.paused})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Chưa có test nào</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Tạo test đầu tiên
              </Button>
            </div>
          ) : (
            filteredTests.map((test) => {
              const statusConfig = getStatusConfig(test.status);
              const StatusIcon = statusConfig.icon;
              const progress = (test.sampleSize / test.targetSampleSize) * 100;
              const winningVariant = test.variants.find(v => v.isWinner);
              const controlVariant = test.variants.find(v => v.isControl);
              const improvement = controlVariant && winningVariant && controlVariant.conversions > 0 && controlVariant.traffic > 0
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
                            Bắt đầu: {new Date(test.startDate).toLocaleDateString('vi-VN')} 
                            {test.endDate && ` • Kết thúc: ${new Date(test.endDate).toLocaleDateString('vi-VN')}`}
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sample size</span>
                          <span className="font-medium">{test.sampleSize.toLocaleString()} / {test.targetSampleSize.toLocaleString()}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
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
                                CVR: {variant.traffic > 0 ? ((variant.conversions / variant.traffic) * 100).toFixed(2) : 0}%
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
                          {test.confidence.toFixed(1)}%
                        </p>
                      </div>
                      {improvement !== 0 && (
                        <div className="text-center pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Conversion Lift</p>
                          <p className={cn(
                            "text-xl font-bold flex items-center justify-center gap-1",
                            improvement > 0 ? "text-emerald-400" : "text-red-400"
                          )}>
                            <TrendingUp className="h-4 w-4" />
                            {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {test.status === 'running' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => toggleTestStatus.mutate({ testId: test.id, action: 'pause' })}
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </Button>
                        )}
                        {test.status === 'paused' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => toggleTestStatus.mutate({ testId: test.id, action: 'resume' })}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="flex-1">
                          Chi tiết
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
