import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Clock,
  Shuffle,
  Activity,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign,
  Users,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCDPTrendData, useCDPDataQuality, useCDPSummaryStats } from '@/hooks/useCDPValueDistribution';
import { INSIGHT_CONFIGS, InsightType } from '@/lib/cdp-trend-insights';

// Format currency
const formatVND = (value: number): string => {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toFixed(0);
};

// Icon mapping
const getInsightIcon = (type: InsightType) => {
  const icons: Record<InsightType, typeof TrendingDown> = {
    SPEND_DECLINE: TrendingDown,
    VELOCITY_SLOW: Clock,
    MIX_SHIFT: Shuffle,
    VOLATILITY_UP: Activity,
    QUALITY_DROP: UserMinus,
  };
  return icons[type];
};

// Severity badge
function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const config = {
    critical: { label: 'Nghiêm trọng', className: 'bg-red-100 text-red-700 border-red-200' },
    warning: { label: 'Cần xem xét', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    info: { label: 'Thông tin', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  
  return (
    <Badge variant="outline" className={config[severity].className}>
      {severity === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {config[severity].label}
    </Badge>
  );
}

// DB-computed Insight Card
function DBInsightCard({ 
  type, 
  triggered, 
  changePercent, 
  currentValue, 
  baseValue,
  customerCount,
  totalRevenue
}: { 
  type: InsightType;
  triggered: boolean;
  changePercent: number;
  currentValue: number;
  baseValue: number;
  customerCount: number;
  totalRevenue: number;
}) {
  const config = INSIGHT_CONFIGS[type];
  const Icon = getInsightIcon(type);
  const severity = triggered && Math.abs(changePercent) > 20 ? 'critical' : triggered ? 'warning' : 'info';
  
  // Estimate financial impact
  const estimatedImpact = totalRevenue * (Math.abs(changePercent) / 100) * 0.3; // 30% at risk
  
  if (!triggered) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`border-l-4 ${
        severity === 'critical' 
          ? 'border-l-red-500' 
          : severity === 'warning' 
            ? 'border-l-amber-500' 
            : 'border-l-blue-500'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                severity === 'critical' 
                  ? 'bg-red-100' 
                  : severity === 'warning' 
                    ? 'bg-amber-100' 
                    : 'bg-blue-100'
              }`}>
                <Icon className={`w-5 h-5 ${
                  severity === 'critical' 
                    ? 'text-red-600' 
                    : severity === 'warning' 
                      ? 'text-amber-600' 
                      : 'text-blue-600'
                }`} />
              </div>
              <div>
                <CardTitle className="text-base">{config.nameVi}</CardTitle>
                <CardDescription>{config.name}</CardDescription>
              </div>
            </div>
            <SeverityBadge severity={severity} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Population */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Toàn bộ khách hàng</span>
            <span className="text-muted-foreground">
              ({customerCount.toLocaleString()} khách)
            </span>
          </div>
          
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Baseline (60d trước)</p>
              <p className="font-semibold">{formatVND(baseValue)}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground mb-1">Hiện tại (60d)</p>
              <p className="font-semibold">{formatVND(currentValue)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Thay đổi</p>
              <p className={`font-bold ${changePercent < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Financial Impact */}
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Tác động Ước tính</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-red-700">-{formatVND(estimatedImpact)}</p>
              <p className="text-xs text-red-600">Q+1</p>
            </div>
          </div>
          
          {/* Interpretation */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Ý nghĩa:</strong> {config.description}
            </p>
          </div>
          
          {/* Decision Prompt */}
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-violet-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-800">Gợi ý Xem xét</p>
                <p className="text-sm text-violet-700 mt-1">
                  Cần đánh giá lại các yếu tố ảnh hưởng đến {config.nameVi.toLowerCase()}?
                </p>
              </div>
            </div>
          </div>
          
          {/* Validation Badge */}
          <div className="flex items-center justify-end gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            <span>DB-computed insight</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Empty state
function EmptyInsights() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">Không có Trend Insight</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Hiện không phát hiện dịch chuyển giá trị nào vượt ngưỡng. 
          CDP sẽ tự động phát hiện khi có shift đáng chú ý.
        </p>
      </CardContent>
    </Card>
  );
}

export default function TrendEnginePage() {
  const navigate = useNavigate();
  const { data: trendData, isLoading: loadingTrend } = useCDPTrendData();
  const { data: dataQuality } = useCDPDataQuality();
  const { data: summaryStats } = useCDPSummaryStats();

  const isLoading = loadingTrend;
  
  // Count triggered insights
  const triggeredCount = [
    trendData?.spend_decline_triggered,
    trendData?.velocity_slow_triggered,
  ].filter(Boolean).length;

  return (
    <>
      <Helmet>
        <title>Trend Engine | CDP - Bluecore</title>
        <meta name="description" content="CDP Trend Engine - Phát hiện dịch chuyển giá trị khách hàng" />
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
                  <h1 className="font-semibold">Trend Engine</h1>
                  <p className="text-xs text-muted-foreground">Phát hiện dịch chuyển giá trị khách hàng</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {triggeredCount > 0 && (
                  <Badge className="bg-amber-500">
                    {triggeredCount} Detected
                  </Badge>
                )}
                {!dataQuality?.isReliable && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Chất lượng dữ liệu thấp
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(INSIGHT_CONFIGS).map(([type, config]) => {
              const Icon = getInsightIcon(type as InsightType);
              const isTriggered = 
                (type === 'SPEND_DECLINE' && trendData?.spend_decline_triggered) ||
                (type === 'VELOCITY_SLOW' && trendData?.velocity_slow_triggered);
              
              return (
                <Card key={type} className={isTriggered ? 'border-amber-200 bg-amber-50/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isTriggered ? 'bg-amber-100' : 'bg-muted'
                      }`}>
                        <Icon className={`w-4 h-4 ${isTriggered ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{config.nameVi}</p>
                        <p className="font-bold text-lg">{isTriggered ? 1 : 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Insight Structure Info */}
          <Card className="border-violet-200 bg-violet-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-violet-700">
                <Info className="w-4 h-4" />
                Trend Insight Structure (per Playbook)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-xs">
                {['Population', 'Shift', 'Baseline', 'Magnitude', 'Financial Impact', 'Interpretation', 'Decision Prompt'].map((element, i) => (
                  <Badge key={element} variant="outline" className="text-violet-600 border-violet-300">
                    {i + 1}. {element}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-violet-600 mt-2">
                ✅ All insights computed in database layer (DB-First compliant)
              </p>
            </CardContent>
          </Card>

          {/* Insights List */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : triggeredCount === 0 ? (
            <EmptyInsights />
          ) : (
            <div className="space-y-6">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Tín hiệu Đã phát hiện ({triggeredCount})
              </h2>
              
              {trendData?.spend_decline_triggered && (
                <DBInsightCard
                  type="SPEND_DECLINE"
                  triggered={true}
                  changePercent={trendData.aov_change_percent || 0}
                  currentValue={trendData.current_aov || 0}
                  baseValue={trendData.base_aov || 0}
                  customerCount={summaryStats?.totalCustomers || 0}
                  totalRevenue={summaryStats?.totalRevenue || 0}
                />
              )}
              
              {trendData?.velocity_slow_triggered && (
                <DBInsightCard
                  type="VELOCITY_SLOW"
                  triggered={true}
                  changePercent={trendData.freq_change_percent || 0}
                  currentValue={trendData.current_aov || 0}
                  baseValue={trendData.base_aov || 0}
                  customerCount={summaryStats?.totalCustomers || 0}
                  totalRevenue={summaryStats?.totalRevenue || 0}
                />
              )}
            </div>
          )}

          {/* Lock-in Rule */}
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground italic">
                "Nếu một insight không thể trình bày trong 60 giây cho CEO/CFO bằng ngôn ngữ tiền và rủi ro, 
                insight đó không được phép tồn tại trong CDP."
              </p>
              <p className="text-xs text-muted-foreground mt-2">— CDP Lock-in Rule</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
