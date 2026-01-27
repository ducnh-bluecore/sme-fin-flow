import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Zap,
  Activity,
  BarChart3,
  CreditCard,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/PageHeader';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useCashRunway } from '@/hooks/useCashRunway';
import { useRiskAlerts } from '@/hooks/useRiskAlerts';
import { useExecutiveHealthScores, HealthDimension } from '@/hooks/useExecutiveHealthScores';
import { formatVNDCompact } from '@/lib/formatters';
import { PendingDecisionsPanel } from '@/components/executive/PendingDecisionsPanel';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// Health Score Formula Definitions - DISPLAY ONLY (logic is in DB)
const HEALTH_FORMULAS: Record<string, {
  formula: string;
  title: string;
  explanation: string;
  example?: string;
  thresholds: { good: string; warning: string; critical: string };
}> = {
  liquidity: {
    formula: 'Score = min(100, Cash Runway (tháng) × 15)',
    title: 'Điểm Thanh khoản',
    explanation: 'Đánh giá khả năng duy trì hoạt động dựa trên số tháng có thể tồn tại với tiền mặt hiện có.',
    example: 'VD: 6 tháng runway → 6 × 15 = 90 điểm',
    thresholds: { good: '≥70 (≥4.7 tháng)', warning: '50-69 (3.3-4.6 tháng)', critical: '<50 (<3.3 tháng)' },
  },
  receivables: {
    formula: 'Score = max(0, 100 - (DSO - 30) × 2)',
    title: 'Điểm Công nợ phải thu',
    explanation: 'Đánh giá hiệu quả thu hồi công nợ. DSO càng thấp, điểm càng cao.',
    example: 'VD: DSO = 45 ngày → 100 - (45-30) × 2 = 70 điểm',
    thresholds: { good: '≥70 (DSO ≤45)', warning: '50-69 (DSO 46-55)', critical: '<50 (DSO >55)' },
  },
  profitability: {
    formula: 'Score = min(100, Gross Margin (%) × 2.5)',
    title: 'Điểm Lợi nhuận',
    explanation: 'Đánh giá khả năng sinh lời dựa trên biên lợi nhuận gộp.',
    example: 'VD: Gross Margin = 35% → 35 × 2.5 = 87.5 điểm',
    thresholds: { good: '≥70 (GM ≥28%)', warning: '50-69 (GM 20-27%)', critical: '<50 (GM <20%)' },
  },
  efficiency: {
    formula: 'Score = max(0, 100 - CCC)',
    title: 'Điểm Hiệu quả vốn lưu động',
    explanation: 'Đánh giá chu kỳ chuyển đổi tiền mặt (Cash Conversion Cycle). CCC càng ngắn, vốn quay vòng càng nhanh.',
    example: 'VD: CCC = 35 ngày → 100 - 35 = 65 điểm',
    thresholds: { good: '≥70 (CCC ≤30)', warning: '50-69 (CCC 31-50)', critical: '<50 (CCC >50)' },
  },
  growth: {
    formula: 'Score = 50 + (YoY % × 1.75)',
    title: 'Điểm Tăng trưởng',
    explanation: 'Đánh giá tốc độ tăng trưởng doanh thu so với cùng kỳ năm trước.',
    example: 'VD: Revenue YoY +15% → 50 + 26 = 76 điểm',
    thresholds: { good: '≥70 (YoY ≥11%)', warning: '50-69 (YoY 0-11%)', critical: '<50 (YoY <0%)' },
  },
  stability: {
    formula: 'Score = min(100, EBITDA Margin (%) × 4)',
    title: 'Điểm Ổn định lợi nhuận',
    explanation: 'Đánh giá khả năng tạo ra lợi nhuận hoạt động ổn định qua biên EBITDA.',
    example: 'VD: EBITDA Margin = 18% → 18 × 4 = 72 điểm',
    thresholds: { good: '≥70 (EBITDA ≥17.5%)', warning: '50-69 (EBITDA 12.5-17.4%)', critical: '<50 (EBITDA <12.5%)' },
  },
};

// Formula Tooltip Component for Health Score
function HealthFormulaTooltip({ 
  formulaKey, 
  children 
}: { 
  formulaKey: string; 
  children: React.ReactNode;
}) {
  const formula = HEALTH_FORMULAS[formulaKey];
  if (!formula) return <>{children}</>;

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{formula.title}</span>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs whitespace-pre-line">
            {formula.formula}
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            {formula.explanation}
          </p>
          
          {formula.example && (
            <p className="text-xs text-primary/80 italic">
              {formula.example}
            </p>
          )}
          
          <Separator />
          
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Ngưỡng đánh giá:</p>
            <div className="grid gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Tốt: {formula.thresholds.good}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Cảnh báo: {formula.thresholds.warning}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Nguy hiểm: {formula.thresholds.critical}</span>
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ✅ REFACTORED: Now uses useExecutiveHealthScores hook - NO client-side calculations
function FinancialHealthRadar({ t }: { t: (key: string) => string }) {
  const { data: healthData, isLoading } = useExecutiveHealthScores();
  
  const dimensions = healthData?.dimensions || [];
  const overallScore = healthData?.overallScore || 0;
  const overallStatus = healthData?.overallStatus || 'critical';
  const goodCount = healthData?.goodCount || 0;
  const warningCount = healthData?.warningCount || 0;
  const criticalCount = healthData?.criticalCount || 0;
  
  const getStatusConfig = () => {
    if (overallStatus === 'good') return { label: t('exec.statusGood'), color: 'text-green-500', bg: 'bg-green-500/10' };
    if (overallStatus === 'warning') return { label: t('exec.statusWarning'), color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: t('exec.statusCritical'), color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const status = getStatusConfig();
  
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };

  const statusBg = {
    good: 'bg-green-500/10',
    warning: 'bg-yellow-500/10',
    critical: 'bg-red-500/10',
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('exec.healthScore')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Đang tải...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('exec.healthScore')}
          </CardTitle>
          <div className={`px-3 py-1 rounded-full ${status.bg}`}>
            <span className={`text-sm font-semibold ${status.color}`}>
              {overallScore} {t('exec.points')} - {status.label}
            </span>
          </div>
        </div>
        <CardDescription>{t('exec.healthDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Radar Chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={dimensions}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="dimension" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar
                  name="Health Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload as HealthDimension;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.dimension}</p>
                          <p className={`text-lg font-bold ${statusColors[data.status]}`}>
                            {data.score} {t('exec.points')}
                          </p>
                          <p className="text-xs text-muted-foreground">{data.description}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Dimension Details */}
          <div className="space-y-2">
            {dimensions.map((dim, index) => (
              <motion.div
                key={dim.dimension}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${statusBg[dim.status]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <HealthFormulaTooltip formulaKey={dim.formulaKey}>
                    <span className="text-sm font-medium hover:text-primary transition-colors">
                      {dim.dimension}
                    </span>
                  </HealthFormulaTooltip>
                  <span className={`text-sm font-bold ${statusColors[dim.status]}`}>
                    {dim.score}
                  </span>
                </div>
                <Progress 
                  value={dim.score} 
                  className="h-1.5 mb-1"
                />
                <p className="text-xs text-muted-foreground">{dim.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Insights - Now using pre-computed counts from DB */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {goodCount}
            </div>
            <p className="text-xs text-muted-foreground">{t('exec.goodMetrics')}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {warningCount}
            </div>
            <p className="text-xs text-muted-foreground">{t('exec.needsMonitoring')}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {criticalCount}
            </div>
            <p className="text-xs text-muted-foreground">{t('exec.needsImprovement')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Win Card
function QuickWinCard({ 
  title, 
  description,
  savings, 
  effort, 
  status,
  category,
  t,
}: { 
  title: string;
  description?: string;
  savings: number; 
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
  category: 'ar' | 'inventory' | 'fees' | 'cost' | 'revenue';
  t: (key: string) => string;
}) {
  const effortColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const effortLabels = {
    low: t('exec.effortLow'),
    medium: t('exec.effortMedium'),
    high: t('exec.effortHigh'),
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    'in-progress': <Activity className="h-4 w-4 text-blue-500" />,
    done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  };

  const categoryIcons = {
    ar: <CreditCard className="h-5 w-5 text-primary" />,
    inventory: <BarChart3 className="h-5 w-5 text-primary" />,
    fees: <DollarSign className="h-5 w-5 text-primary" />,
    cost: <TrendingUp className="h-5 w-5 text-primary" />,
    revenue: <Zap className="h-5 w-5 text-primary" />,
  };

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {categoryIcons[category]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium truncate">{title}</h4>
            {statusIcons[status]}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-semibold text-green-500">
              +{formatVNDCompact(savings)}
            </span>
            <span className={`text-xs ${effortColors[effort]}`}>
              {t('exec.effort')}: {effortLabels[effort]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Risk Alert Card - Supports both legacy and new severity types
function RiskAlertCard({ 
  severity, 
  title, 
  description, 
  metric,
  threshold,
}: { 
  id: string;
  severity: 'high' | 'medium' | 'low' | 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
  threshold?: string;
  category?: string;
}) {
  // Map new severity types to display config
  const getSeverityConfig = () => {
    switch (severity) {
      case 'high':
      case 'critical':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertTriangle className="h-5 w-5 text-red-500" /> };
      case 'medium':
      case 'warning':
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <AlertTriangle className="h-5 w-5 text-yellow-500" /> };
      case 'low':
      case 'info':
      default:
        return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <Activity className="h-5 w-5 text-blue-500" /> };
    }
  };

  const config = getSeverityConfig();

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          {metric && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Hiện tại: </span>
              <span className="font-medium">{metric}</span>
              {threshold && (
                <>
                  <span className="text-muted-foreground"> / Ngưỡng: </span>
                  <span className="font-medium">{threshold}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function ExecutiveSummaryPage() {
  const { t } = useLanguage();
  const { data: snapshot } = useFinanceTruthSnapshot();
  const { data: runwayData } = useCashRunway();
  
  // Static placeholders - to be replaced with real data
  const quickWins: Array<{ id: string; title: string; description: string; savings: number; effort: 'low' | 'medium' | 'high'; status: 'pending' | 'in-progress' | 'done'; category: 'ar' | 'cost' | 'fees' | 'inventory' | 'revenue' }> = [];
  const totalPotentialSavings = 0;
  const quickWinsLoading = false;
  const { data: riskAlerts, isLoading: riskAlertsLoading } = useRiskAlerts();

  // Map snapshot to legacy metrics shape for backward compatibility
  const metrics = snapshot ? {
    dso: snapshot.dso,
    grossMargin: snapshot.grossMarginPercent,
    cashOnHand: snapshot.cashToday,
    totalRevenue: snapshot.netRevenue,
    daysInPeriod: 90,
  } : undefined;

  return (
    <>
      <Helmet>
        <title>Executive Summary | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('nav.executiveSummary')}
          subtitle={t('exec.subtitle')}
        />

        {/* Top Row - Health Score Radar & Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ✅ REFACTORED: No longer passes metrics/runwayData props */}
          <FinancialHealthRadar t={t} />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('exec.revenueMTD')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(snapshot?.netRevenue || 0)}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <TrendingUp className="h-4 w-4" />
                {t('exec.allTimePeriod')}
              </div>
              <Progress value={Math.min(100, ((snapshot?.netRevenue || 0) / 5000000000) * 100)} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(((snapshot?.netRevenue || 0) / 5000000000) * 100)}% {t('exec.target')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('exec.cashPosition')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(metrics?.cashOnHand || 0)}</div>
              <div className="flex items-center gap-1 text-sm text-yellow-500 mt-1">
                <Activity className="h-4 w-4" />
                {t('exec.runway')}: {runwayData?.runwayMonths?.toFixed(1) || '4.5'} {t('exec.months')}
              </div>
              <Progress value={45} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{t('exec.minThreshold')}: 2 tỷ</p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Decisions & Quick Wins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Decisions - Now uses real data from DB */}
          <PendingDecisionsPanel />

          {/* Quick Wins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {t('exec.quickWins')}
              </CardTitle>
              <CardDescription>
                {t('exec.quickWinsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickWinsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : quickWins.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p>{t('exec.noQuickWins')}</p>
                </div>
              ) : (
                <>
                  {quickWins.slice(0, 4).map((win) => (
                    <QuickWinCard 
                      key={win.id} 
                      title={win.title}
                      description={win.description}
                      savings={win.savings}
                      effort={win.effort}
                      status={win.status}
                      category={win.category}
                      t={t}
                    />
                  ))}
                  <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('exec.totalPotential')}</span>
                      <span className="text-lg font-bold text-green-500">
                        +{formatVNDCompact(totalPotentialSavings)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Risk Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('exec.riskAlerts')}
            </CardTitle>
            <CardDescription>
              {t('exec.riskAlertsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskAlertsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : riskAlerts && riskAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {riskAlerts.slice(0, 6).map((alert) => (
                  <RiskAlertCard key={alert.id} {...alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p>{t('exec.noRiskAlerts')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
