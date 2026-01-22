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
  ChevronRight,
  DollarSign,
  Users,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useCDPTrendInsights } from '@/hooks/useCDPTrendInsights';
import { TrendInsight, INSIGHT_CONFIGS, InsightType } from '@/lib/cdp-trend-insights';

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
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
    warning: { label: 'Warning', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    info: { label: 'Info', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  
  return (
    <Badge variant="outline" className={config[severity].className}>
      {severity === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {config[severity].label}
    </Badge>
  );
}

// Insight Card Component
function InsightCard({ insight }: { insight: TrendInsight }) {
  const Icon = getInsightIcon(insight.type);
  const config = INSIGHT_CONFIGS[insight.type];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`border-l-4 ${
        insight.severity === 'critical' 
          ? 'border-l-red-500' 
          : insight.severity === 'warning' 
            ? 'border-l-amber-500' 
            : 'border-l-blue-500'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                insight.severity === 'critical' 
                  ? 'bg-red-100' 
                  : insight.severity === 'warning' 
                    ? 'bg-amber-100' 
                    : 'bg-blue-100'
              }`}>
                <Icon className={`w-5 h-5 ${
                  insight.severity === 'critical' 
                    ? 'text-red-600' 
                    : insight.severity === 'warning' 
                      ? 'text-amber-600' 
                      : 'text-blue-600'
                }`} />
              </div>
              <div>
                <CardTitle className="text-base">{config.nameVi}</CardTitle>
                <CardDescription>{config.name}</CardDescription>
              </div>
            </div>
            <SeverityBadge severity={insight.severity} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 7 Mandatory Elements Display */}
          
          {/* 1. Population */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{insight.population.segment}</span>
            <span className="text-muted-foreground">
              ({insight.population.customerCount.toLocaleString()} khách, 
              đóng góp {insight.population.revenueContribution.toFixed(1)}% doanh thu)
            </span>
          </div>
          
          {/* 2-4. Shift + Baseline + Magnitude */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Baseline</p>
              <p className="font-semibold">
                {insight.shift.metricCode.includes('VAL') 
                  ? formatVND(insight.baseline.value)
                  : `${insight.baseline.value.toFixed(1)}${insight.shift.metricCode.includes('RSK') ? '%' : ''}`
                }
              </p>
              <p className="text-xs text-muted-foreground">{insight.baseline.period}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="font-semibold">
                {insight.shift.metricCode.includes('VAL') 
                  ? formatVND(insight.magnitude.currentValue)
                  : `${insight.magnitude.currentValue.toFixed(1)}${insight.shift.metricCode.includes('RSK') ? '%' : ''}`
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Change</p>
              <p className={`font-bold ${
                insight.shift.direction === 'down' 
                  ? 'text-red-600' 
                  : insight.magnitude.changePercent > 0 && insight.type !== 'SPEND_DECLINE'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}>
                {insight.magnitude.changePercent > 0 ? '+' : ''}{insight.magnitude.changePercent.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* 5. Financial Impact */}
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Financial Impact</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-red-700">
                {insight.financialImpact.projectedImpact > 0 ? '-' : ''}
                {formatVND(Math.abs(insight.financialImpact.projectedImpact))}
              </p>
              <p className="text-xs text-red-600">{insight.financialImpact.timeHorizon}</p>
            </div>
          </div>
          
          {/* 6. Interpretation */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>📊 Insight:</strong> {insight.interpretation}
            </p>
          </div>
          
          {/* 7. Decision Prompt */}
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-violet-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-800">Decision Prompt</p>
                <p className="text-sm text-violet-700 mt-1">{insight.decisionPrompt}</p>
              </div>
            </div>
          </div>
          
          {/* Validation Badge */}
          {insight.isValid && (
            <div className="flex items-center justify-end gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Valid (7/7 elements)</span>
            </div>
          )}
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
  const { insights, insightSummary, isLoading, dataQuality } = useCDPTrendInsights();

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
                {insightSummary.critical > 0 && (
                  <Badge className="bg-red-500">
                    {insightSummary.critical} Critical
                  </Badge>
                )}
                {insightSummary.warning > 0 && (
                  <Badge className="bg-amber-500">
                    {insightSummary.warning} Warning
                  </Badge>
                )}
                {!dataQuality?.isReliable && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Low Data Quality
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
              const count = insightSummary.byType[type as InsightType] || 0;
              const Icon = getInsightIcon(type as InsightType);
              
              return (
                <Card key={type} className={count > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        count > 0 ? 'bg-amber-100' : 'bg-muted'
                      }`}>
                        <Icon className={`w-4 h-4 ${count > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{config.nameVi}</p>
                        <p className="font-bold text-lg">{count}</p>
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
                ⚠️ Insight không đủ 7 thành phần = không hợp lệ
              </p>
            </CardContent>
          </Card>

          {/* Insights List */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <EmptyInsights />
          ) : (
            <div className="space-y-6">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Detected Insights ({insights.length})
              </h2>
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
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
