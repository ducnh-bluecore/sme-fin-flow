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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardKPIs } from '@/hooks/useDashboardCache';
import { useCashRunway } from '@/hooks/useCashRunway';
import { formatVNDCompact } from '@/lib/formatters';

// Health Score Component
function HealthScoreCard({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Tốt';
    if (s >= 60) return 'Trung bình';
    return 'Cần cải thiện';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(score)}</p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {trend === 'up' && <ArrowUpRight className="h-8 w-8 text-green-500" />}
              {trend === 'down' && <ArrowDownRight className="h-8 w-8 text-red-500" />}
              {trend === 'stable' && <Activity className="h-8 w-8 text-yellow-500" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Decision Card Component
function DecisionCard({ 
  title, 
  description, 
  priority, 
  impact, 
  deadline 
}: { 
  title: string; 
  description: string; 
  priority: 'high' | 'medium' | 'low';
  impact: string;
  deadline: string;
}) {
  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{title}</h4>
        <Badge variant="outline" className={priorityColors[priority]}>
          {priority === 'high' ? 'Ưu tiên cao' : priority === 'medium' ? 'Trung bình' : 'Thấp'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {impact}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {deadline}
        </span>
      </div>
    </motion.div>
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
  const { data: kpiData, isLoading } = useDashboardKPIs();
  const { data: runwayData } = useCashRunway();

  // Calculate health score based on KPIs
  const calculateHealthScore = () => {
    if (!kpiData) return 72;
    let score = 70;
    if (kpiData.dso && kpiData.dso < 45) score += 10;
    if (kpiData.grossMargin && kpiData.grossMargin > 30) score += 10;
    if (runwayData?.months && runwayData.months > 6) score += 10;
    return Math.min(score, 100);
  };

  const healthScore = calculateHealthScore();

  // Sample decisions data
  const pendingDecisions = [
    {
      title: 'Phê duyệt đầu tư mở rộng kho Bình Dương',
      description: 'Đề xuất CAPEX 5 tỷ VND cho kho mới, ROI dự kiến 25%',
      priority: 'high' as const,
      impact: 'Revenue +15%',
      deadline: '15/01/2026',
    },
    {
      title: 'Đàm phán lại điều khoản thanh toán với Supplier A',
      description: 'Kéo dài Net 30 → Net 45 để cải thiện CCC',
      priority: 'medium' as const,
      impact: 'CCC -5 ngày',
      deadline: '20/01/2026',
    },
    {
      title: 'Đánh giá đóng kênh Lazada',
      description: 'Margin âm 3 tháng liên tiếp, cần quyết định tiếp tục/dừng',
      priority: 'high' as const,
      impact: 'Margin +2%',
      deadline: '10/01/2026',
    },
  ];

  // Sample quick wins
  const quickWins = [
    { title: 'Thu hồi AR quá hạn > 60 ngày', savings: 850000000, effort: 'low' as const, status: 'in-progress' as const },
    { title: 'Tối ưu inventory slow-moving', savings: 320000000, effort: 'medium' as const, status: 'pending' as const },
    { title: 'Đàm phán giảm phí sàn TMĐT', savings: 150000000, effort: 'low' as const, status: 'done' as const },
  ];

  // Sample risk alerts
  const riskAlerts = [
    { title: 'Cash Runway thấp', severity: 'warning' as const, description: 'Dự kiến hết tiền trong 4.5 tháng nếu không có biện pháp', metric: `Runway: ${runwayData?.months?.toFixed(1) || '4.5'} tháng` },
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

        {/* Top Row - Health Score & Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <HealthScoreCard score={healthScore} trend="up" />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue MTD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVNDCompact(kpiData?.totalRevenue || 15200000000)}</div>
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
                <PieChart className="h-4 w-4" />
                Gross Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(kpiData?.grossMargin || 28.5).toFixed(1)}%</div>
              <div className="flex items-center gap-1 text-sm text-red-500 mt-1">
                <TrendingDown className="h-4 w-4" />
                -1.2% vs LM
              </div>
              <Progress value={85} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">Target: 32%</p>
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
                Runway: {runwayData?.months?.toFixed(1) || '4.5'} tháng
              </div>
              <Progress value={45} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-1">Min threshold: 2 tỷ</p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Decisions & Quick Wins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Decisions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Quyết định cần đưa ra
              </CardTitle>
              <CardDescription>
                {pendingDecisions.length} quyết định đang chờ phê duyệt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDecisions.map((decision, index) => (
                <DecisionCard key={index} {...decision} />
              ))}
              <Button variant="outline" className="w-full mt-2">
                Xem tất cả quyết định
              </Button>
            </CardContent>
          </Card>

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
