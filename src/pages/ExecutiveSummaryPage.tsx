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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardKPICache } from '@/hooks/useDashboardCache';
import { useCashRunway } from '@/hooks/useCashRunway';
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

interface HealthDimension {
  dimension: string;
  score: number;
  fullMark: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

// Financial Health Radar Component
function FinancialHealthRadar({ kpiData, runwayData }: { kpiData: any; runwayData: any }) {
  // Calculate individual health dimensions
  const calculateDimensions = (): HealthDimension[] => {
    // Liquidity Score (based on cash runway and current ratio)
    const runwayMonths = runwayData?.runwayMonths || 4;
    const liquidityScore = Math.min(100, runwayMonths * 15); // 6+ months = 90+
    
    // Receivables Health (based on DSO)
    const dso = kpiData?.dso || 45;
    const receivablesScore = Math.max(0, 100 - (dso - 30) * 2); // DSO 30 = 100, DSO 65 = 30
    
    // Profitability (based on gross margin)
    const grossMargin = kpiData?.grossMargin || 28;
    const profitabilityScore = Math.min(100, grossMargin * 2.5); // 40% margin = 100
    
    // Efficiency (based on CCC)
    const ccc = kpiData?.ccc || 45;
    const efficiencyScore = Math.max(0, 100 - ccc); // CCC 0 = 100, CCC 100 = 0
    
    // Growth (simulated - would come from revenue trends)
    const growthScore = 72; // Sample data
    
    // Stability (based on EBITDA margin)
    const ebitda = kpiData?.ebitda || 15;
    const stabilityScore = Math.min(100, ebitda * 4); // 25% EBITDA = 100

    return [
      { 
        dimension: 'Thanh khoản', 
        score: Math.round(liquidityScore), 
        fullMark: 100,
        status: liquidityScore >= 70 ? 'good' : liquidityScore >= 50 ? 'warning' : 'critical',
        description: `Cash runway: ${runwayMonths.toFixed(1)} tháng`
      },
      { 
        dimension: 'Công nợ', 
        score: Math.round(receivablesScore), 
        fullMark: 100,
        status: receivablesScore >= 70 ? 'good' : receivablesScore >= 50 ? 'warning' : 'critical',
        description: `DSO: ${dso} ngày`
      },
      { 
        dimension: 'Lợi nhuận', 
        score: Math.round(profitabilityScore), 
        fullMark: 100,
        status: profitabilityScore >= 70 ? 'good' : profitabilityScore >= 50 ? 'warning' : 'critical',
        description: `Gross Margin: ${grossMargin}%`
      },
      { 
        dimension: 'Hiệu quả', 
        score: Math.round(efficiencyScore), 
        fullMark: 100,
        status: efficiencyScore >= 70 ? 'good' : efficiencyScore >= 50 ? 'warning' : 'critical',
        description: `CCC: ${ccc} ngày`
      },
      { 
        dimension: 'Tăng trưởng', 
        score: growthScore, 
        fullMark: 100,
        status: growthScore >= 70 ? 'good' : growthScore >= 50 ? 'warning' : 'critical',
        description: 'Revenue YoY: +12%'
      },
      { 
        dimension: 'Ổn định', 
        score: Math.round(stabilityScore), 
        fullMark: 100,
        status: stabilityScore >= 70 ? 'good' : stabilityScore >= 50 ? 'warning' : 'critical',
        description: `EBITDA: ${ebitda}%`
      },
    ];
  };

  const dimensions = calculateDimensions();
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  
  const getOverallStatus = () => {
    if (overallScore >= 75) return { label: 'Tốt', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (overallScore >= 55) return { label: 'Trung bình', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    return { label: 'Cần cải thiện', color: 'text-red-500', bg: 'bg-red-500/10' };
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
            Financial Health Score
          </CardTitle>
          <div className={`px-3 py-1 rounded-full ${status.bg}`}>
            <span className={`text-sm font-semibold ${status.color}`}>
              {overallScore} điểm - {status.label}
            </span>
          </div>
        </div>
        <CardDescription>Đánh giá sức khỏe tài chính theo 6 chiều</CardDescription>
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
                            {data.score} điểm
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
                  <span className="text-sm font-medium">{dim.dimension}</span>
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
            <p className="text-xs text-muted-foreground">Chỉ số tốt</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {dimensions.filter(d => d.status === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">Cần theo dõi</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {dimensions.filter(d => d.status === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">Cần cải thiện</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Win Card
function QuickWinCard({ 
  title, 
  savings, 
  effort, 
  status 
}: { 
  title: string; 
  savings: number; 
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
}) {
  const effortColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    'in-progress': <Activity className="h-4 w-4 text-blue-500" />,
    done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className={`text-xs ${effortColors[effort]}`}>
            Effort: {effort === 'low' ? 'Thấp' : effort === 'medium' ? 'Trung bình' : 'Cao'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-green-500">+{formatVNDCompact(savings)}</span>
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
  const { data: kpiData, isLoading } = useDashboardKPICache();
  const { data: runwayData } = useCashRunway();

  // Calculate health score based on KPIs
  const calculateHealthScore = () => {
    if (!kpiData) return 72;
    let score = 70;
    if (kpiData.dso && kpiData.dso < 45) score += 10;
    if (kpiData.grossMargin && kpiData.grossMargin > 30) score += 10;
    if (runwayData?.runwayMonths && runwayData.runwayMonths > 6) score += 10;
    return Math.min(score, 100);
  };

  const healthScore = calculateHealthScore();

  // Sample quick wins
  const quickWins = [
    { title: 'Thu hồi AR quá hạn > 60 ngày', savings: 850000000, effort: 'low' as const, status: 'in-progress' as const },
    { title: 'Tối ưu inventory slow-moving', savings: 320000000, effort: 'medium' as const, status: 'pending' as const },
    { title: 'Đàm phán giảm phí sàn TMĐT', savings: 150000000, effort: 'low' as const, status: 'done' as const },
  ];

  // Sample risk alerts
  const riskAlerts = [
    { title: 'Cash Runway thấp', severity: 'warning' as const, description: 'Dự kiến hết tiền trong 4.5 tháng nếu không có biện pháp', metric: `Runway: ${runwayData?.runwayMonths?.toFixed(1) || '4.5'} tháng` },
    { title: 'DSO tăng', severity: 'warning' as const, description: 'DSO tăng 8 ngày so với tháng trước', metric: `DSO: ${kpiData?.dso || 52} ngày` },
    { title: 'Top 3 khách hàng chiếm 45% AR', severity: 'info' as const, description: 'Rủi ro tập trung cao, cần đa dạng hóa', metric: 'Concentration: 45%' },
  ];

  return (
    <>
      <Helmet>
        <title>Executive Summary | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('nav.executiveSummary')}
          subtitle="Tổng quan tài chính dành cho CEO/Board - cập nhật real-time"
        />

        {/* Top Row - Health Score Radar & Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <FinancialHealthRadar kpiData={kpiData} runwayData={runwayData} />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue MTD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(15200000000)}</div>
              <div className="flex items-center gap-1 text-sm text-green-500 mt-1">
                <TrendingUp className="h-4 w-4" />
                +12.5% vs LM
              </div>
              <Progress value={78} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">78% target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Cash Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(kpiData?.cashToday || 3200000000)}</div>
              <div className="flex items-center gap-1 text-sm text-yellow-500 mt-1">
                <Activity className="h-4 w-4" />
                Runway: {runwayData?.runwayMonths?.toFixed(1) || '4.5'} tháng
              </div>
              <Progress value={45} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">Min threshold: 2 tỷ</p>
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
                Quick Wins
              </CardTitle>
              <CardDescription>
                Cơ hội tiết kiệm/tăng revenue nhanh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickWins.map((win, index) => (
                <QuickWinCard key={index} {...win} />
              ))}
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tổng tiềm năng</span>
                  <span className="text-lg font-bold text-green-500">
                    +{formatVNDCompact(quickWins.reduce((sum, w) => sum + w.savings, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Risk Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Risk Alerts
            </CardTitle>
            <CardDescription>
              Các rủi ro tài chính cần lưu ý
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskAlerts.map((alert, index) => (
                <RiskAlertCard key={index} {...alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
