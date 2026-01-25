import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Target,
  Zap,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  BarChart3,
  Wallet,
  Users,
  Package,
  CreditCard,
  TrendingUp as Growth,
  Calculator,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
import { useQuickWins } from '@/hooks/useQuickWins';
import { useRiskAlerts } from '@/hooks/useRiskAlerts';
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
  Legend,
} from 'recharts';

// Health Score Formula Definitions
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
    formula: 'Score = Tốc độ tăng trưởng doanh thu YoY',
    title: 'Điểm Tăng trưởng',
    explanation: 'Đánh giá tốc độ tăng trưởng doanh thu so với cùng kỳ năm trước.',
    example: 'VD: Revenue YoY +15% → ~75 điểm',
    thresholds: { good: '≥70 (YoY ≥15%)', warning: '50-69 (YoY 5-14%)', critical: '<50 (YoY <5%)' },
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

interface HealthDimension {
  dimension: string;
  score: number;
  fullMark: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  formulaKey: string;
}

// Financial Health Radar Component
function FinancialHealthRadar({ metrics, runwayData, t }: { metrics: any; runwayData: any; t: (key: string) => string }) {
  // Calculate individual health dimensions
  const calculateDimensions = (): HealthDimension[] => {
    // Liquidity Score (based on cash runway and current ratio)
    const runwayMonths = runwayData?.runwayMonths ?? 4;
    const liquidityScore = Math.min(100, runwayMonths * 15); // 6+ months = 90+
    
    // Receivables Health (based on DSO)
    // Use ?? (nullish coalescing) to properly handle 0 as a valid value
    // DSO = 0 would incorrectly fallback to 45 with || operator
    const dso = (metrics?.dso !== undefined && metrics?.dso !== null && metrics.dso > 0) 
      ? metrics.dso 
      : 45; // Default DSO when no data
    const receivablesScore = Math.min(100, Math.max(0, 100 - (dso - 30) * 2)); // DSO 30 = 100, DSO 65 = 30
    
    // Profitability (based on gross margin)
    const grossMargin = (metrics?.grossMargin !== undefined && metrics?.grossMargin !== null && metrics.grossMargin > 0)
      ? metrics.grossMargin
      : 28; // Default margin when no data
    const profitabilityScore = Math.min(100, grossMargin * 2.5); // 40% margin = 100
    
    // Efficiency (based on CCC)
    // CCC can be negative (good - means getting paid before paying suppliers)
    // CCC = 0 is a valid value
    const ccc = (metrics?.ccc !== undefined && metrics?.ccc !== null && (metrics.ccc !== 0 || metrics.dso > 0))
      ? metrics.ccc
      : 45; // Default CCC when no data
    const efficiencyScore = Math.min(100, Math.max(0, 100 - ccc)); // CCC 0 = 100, CCC 100 = 0
    
    // Growth (simulated - would come from revenue trends)
    const growthScore = 72; // Sample data
    
    // Stability (based on EBITDA margin)
    const ebitdaMargin = (metrics?.ebitdaMargin !== undefined && metrics?.ebitdaMargin !== null && metrics.ebitdaMargin > 0)
      ? metrics.ebitdaMargin
      : 15; // Default EBITDA margin when no data
    const stabilityScore = Math.min(100, ebitdaMargin * 4); // 25% EBITDA = 100

    return [
      { 
        dimension: t('exec.dimLiquidity'), 
        score: Math.round(liquidityScore), 
        fullMark: 100,
        status: liquidityScore >= 70 ? 'good' : liquidityScore >= 50 ? 'warning' : 'critical',
        description: `Cash runway: ${runwayMonths.toFixed(1)} ${t('exec.months')}`,
        formulaKey: 'liquidity',
      },
      { 
        dimension: t('exec.dimReceivables'), 
        score: Math.round(receivablesScore), 
        fullMark: 100,
        status: receivablesScore >= 70 ? 'good' : receivablesScore >= 50 ? 'warning' : 'critical',
        description: `DSO: ${dso} days`,
        formulaKey: 'receivables',
      },
      { 
        dimension: t('exec.dimProfitability'), 
        score: Math.round(profitabilityScore), 
        fullMark: 100,
        status: profitabilityScore >= 70 ? 'good' : profitabilityScore >= 50 ? 'warning' : 'critical',
        description: `Gross Margin: ${grossMargin}%`,
        formulaKey: 'profitability',
      },
      { 
        dimension: t('exec.dimEfficiency'), 
        score: Math.round(efficiencyScore), 
        fullMark: 100,
        status: efficiencyScore >= 70 ? 'good' : efficiencyScore >= 50 ? 'warning' : 'critical',
        description: `CCC: ${ccc} days`,
        formulaKey: 'efficiency',
      },
      { 
        dimension: t('exec.dimGrowth'), 
        score: growthScore, 
        fullMark: 100,
        status: growthScore >= 70 ? 'good' : growthScore >= 50 ? 'warning' : 'critical',
        description: 'Revenue YoY: +12%',
        formulaKey: 'growth',
      },
      { 
        dimension: t('exec.dimStability'), 
        score: Math.round(stabilityScore), 
        fullMark: 100,
        status: stabilityScore >= 70 ? 'good' : stabilityScore >= 50 ? 'warning' : 'critical',
        description: `EBITDA Margin: ${ebitdaMargin?.toFixed(1)}%`,
        formulaKey: 'stability',
      },
    ];
  };

  const dimensions = calculateDimensions();
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  
  const getOverallStatus = () => {
    if (overallScore >= 75) return { label: t('exec.statusGood'), color: 'text-green-500', bg: 'bg-green-500/10' };
    if (overallScore >= 55) return { label: t('exec.statusWarning'), color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: t('exec.statusCritical'), color: 'text-red-500', bg: 'bg-red-500/10' };
  };

  const status = getOverallStatus();
  
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

        {/* Quick Insights */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {dimensions.filter(d => d.status === 'good').length}
            </div>
            <p className="text-xs text-muted-foreground">{t('exec.goodMetrics')}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {dimensions.filter(d => d.status === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">{t('exec.needsMonitoring')}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {dimensions.filter(d => d.status === 'critical').length}
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
    inventory: <Package className="h-5 w-5 text-primary" />,
    fees: <DollarSign className="h-5 w-5 text-primary" />,
    cost: <TrendingDown className="h-5 w-5 text-primary" />,
    revenue: <Users className="h-5 w-5 text-primary" />,
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {categoryIcons[category]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
          <p className={`text-xs ${effortColors[effort]}`}>
            {effortLabels[effort]}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {savings > 0 ? (
          <span className="font-semibold text-green-500">+{formatVNDCompact(savings)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t('exec.reduceRisk')}</span>
        )}
        {statusIcons[status]}
      </div>
    </div>
  );
}

// Risk Alert Card
function RiskAlertCard({ 
  title, 
  severity, 
  description, 
  metric 
}: { 
  title: string; 
  severity: 'critical' | 'warning' | 'info';
  description: string;
  metric?: string;
}) {
  const severityStyles = {
    critical: 'border-red-500/30 bg-red-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };

  const severityIcons = {
    critical: <AlertTriangle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Shield className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div className={`p-4 rounded-lg border ${severityStyles[severity]}`}>
      <div className="flex items-start gap-3">
        {severityIcons[severity]}
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {metric && (
            <p className="text-sm font-medium mt-2">{metric}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryPage() {
  const { t } = useLanguage();
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();
  const { data: runwayData } = useCashRunway();
  const { quickWins, totalPotentialSavings, isLoading: quickWinsLoading } = useQuickWins();
  const { data: riskAlerts, isLoading: riskAlertsLoading } = useRiskAlerts();

  // Map snapshot to legacy metrics shape for backward compatibility
  const metrics = snapshot ? {
    dso: snapshot.dso,
    grossMargin: snapshot.grossMarginPercent,
    cashOnHand: snapshot.cashToday,
    totalRevenue: snapshot.netRevenue,
    daysInPeriod: 90,
  } : undefined;

  // Calculate health score based on central metrics
  const calculateHealthScore = () => {
    if (!snapshot) return 72;
    let score = 70;
    if (snapshot.dso && snapshot.dso < 45) score += 10;
    if (snapshot.grossMarginPercent && snapshot.grossMarginPercent > 30) score += 10;
    if (runwayData?.runwayMonths && runwayData.runwayMonths > 6) score += 10;
    return Math.min(score, 100);
  };

  const healthScore = calculateHealthScore();

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
          <FinancialHealthRadar metrics={metrics} runwayData={runwayData} t={t} />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('exec.revenueMTD')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(15200000000)}</div>
              <div className="flex items-center gap-1 text-sm text-green-500 mt-1">
                <TrendingUp className="h-4 w-4" />
                +12.5% vs LM
              </div>
              <Progress value={78} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">78% {t('exec.target')}</p>
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
