import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  Percent,
  Activity,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatVNDCompact } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { StressTestingPanel } from '@/components/risk/StressTestingPanel';

// Risk Score Card
function RiskScoreCard({ 
  title, 
  score, 
  maxScore, 
  trend, 
  icon: Icon,
  description,
  severity,
}: { 
  title: string; 
  score: number; 
  maxScore: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  const severityColors = {
    low: 'text-green-500 bg-green-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    high: 'text-orange-500 bg-orange-500/10',
    critical: 'text-red-500 bg-red-500/10',
  };

  const getSeverityLabel = (s: string) => {
    switch (s) {
      case 'low': return 'Thấp';
      case 'medium': return 'Trung bình';
      case 'high': return 'Cao';
      case 'critical': return 'Nghiêm trọng';
      default: return s;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border bg-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${severityColors[severity]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={severityColors[severity]}>
          {getSeverityLabel(severity)}
        </Badge>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{score}</span>
          <span className="text-sm text-muted-foreground">/ {maxScore}</span>
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-yellow-500'
        }`}>
          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
          {trend === 'stable' && <Activity className="h-4 w-4" />}
          {trend === 'up' ? 'Tăng' : trend === 'down' ? 'Giảm' : 'Ổn định'}
        </div>
      </div>
      <Progress 
        value={(score / maxScore) * 100} 
        className="mt-3 h-2"
      />
    </motion.div>
  );
}

// Concentration Risk Component
function ConcentrationRisk() {
  const customerConcentration = [
    { name: 'Khách hàng A', value: 25, revenue: 12500000000 },
    { name: 'Khách hàng B', value: 15, revenue: 7500000000 },
    { name: 'Khách hàng C', value: 10, revenue: 5000000000 },
    { name: 'Khác', value: 50, revenue: 25000000000 },
  ];

  const vendorConcentration = [
    { name: 'Supplier A', value: 35, spend: 8750000000 },
    { name: 'Supplier B', value: 20, spend: 5000000000 },
    { name: 'Supplier C', value: 15, spend: 3750000000 },
    { name: 'Khác', value: 30, spend: 7500000000 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#94a3b8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Rủi ro tập trung khách hàng
          </CardTitle>
          <CardDescription>Top 3 khách hàng chiếm 50% doanh thu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerConcentration}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {customerConcentration.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name, props) => [formatVNDCompact(props.payload.revenue), 'Doanh thu']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Cảnh báo: Nên đa dạng hóa khách hàng</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-500" />
            Rủi ro tập trung nhà cung cấp
          </CardTitle>
          <CardDescription>Top 3 supplier chiếm 70% chi phí mua hàng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorConcentration}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {vendorConcentration.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name, props) => [formatVNDCompact(props.payload.spend), 'Chi phí']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Cao: Supplier A chiếm 35% - cần backup plan</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stress Test Component
function StressTestPanel() {
  const stressScenarios = [
    {
      name: 'Mất top 1 khách hàng',
      impact: -25,
      cashImpact: -12500000000,
      probability: 'low',
      mitigationStatus: 'in-progress',
    },
    {
      name: 'Tăng lãi suất +2%',
      impact: -8,
      cashImpact: -800000000,
      probability: 'medium',
      mitigationStatus: 'done',
    },
    {
      name: 'Supplier A ngừng cung cấp',
      impact: -15,
      cashImpact: -3500000000,
      probability: 'low',
      mitigationStatus: 'pending',
    },
    {
      name: 'VND mất giá 5%',
      impact: -5,
      cashImpact: -1200000000,
      probability: 'high',
      mitigationStatus: 'in-progress',
    },
    {
      name: 'Doanh thu giảm 20%',
      impact: -20,
      cashImpact: -10000000000,
      probability: 'medium',
      mitigationStatus: 'pending',
    },
  ];

  const getProbabilityBadge = (prob: string) => {
    switch (prob) {
      case 'low':
        return <Badge className="bg-green-500/10 text-green-500">Thấp</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/10 text-yellow-500">Trung bình</Badge>;
      case 'high':
        return <Badge className="bg-red-500/10 text-red-500">Cao</Badge>;
      default:
        return <Badge variant="outline">{prob}</Badge>;
    }
  };

  const getMitigationStatus = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="h-4 w-4" />Đã có kế hoạch</span>;
      case 'in-progress':
        return <span className="flex items-center gap-1 text-blue-500"><RefreshCw className="h-4 w-4" />Đang xử lý</span>;
      case 'pending':
        return <span className="flex items-center gap-1 text-yellow-500"><Clock className="h-4 w-4" />Chờ xử lý</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Stress Testing
        </CardTitle>
        <CardDescription>Mô phỏng tác động của các kịch bản rủi ro</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stressScenarios.map((scenario, index) => (
            <div key={index} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{scenario.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Tác động: {formatVNDCompact(scenario.cashImpact)}
                  </p>
                </div>
                {getProbabilityBadge(scenario.probability)}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${scenario.impact < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {scenario.impact > 0 ? '+' : ''}{scenario.impact}%
                  </span>
                  <Progress 
                    value={Math.abs(scenario.impact)} 
                    className="w-24 h-2"
                  />
                </div>
                <div className="text-sm">
                  {getMitigationStatus(scenario.mitigationStatus)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Risk Radar Component
function RiskRadar() {
  const riskData = [
    { category: 'Thanh khoản', score: 65, fullMark: 100 },
    { category: 'Tín dụng', score: 45, fullMark: 100 },
    { category: 'Thị trường', score: 70, fullMark: 100 },
    { category: 'Hoạt động', score: 55, fullMark: 100 },
    { category: 'Tuân thủ', score: 30, fullMark: 100 },
    { category: 'Chiến lược', score: 50, fullMark: 100 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Risk Profile
        </CardTitle>
        <CardDescription>Đánh giá tổng thể các loại rủi ro</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={riskData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar 
                name="Risk Score" 
                dataKey="score" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.3} 
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-green-500/10 text-center">
            <p className="text-xs text-muted-foreground">Thấp (0-40)</p>
            <p className="font-medium text-green-500">2 chỉ số</p>
          </div>
          <div className="p-2 rounded bg-yellow-500/10 text-center">
            <p className="text-xs text-muted-foreground">Trung bình (40-60)</p>
            <p className="font-medium text-yellow-500">2 chỉ số</p>
          </div>
          <div className="p-2 rounded bg-orange-500/10 text-center">
            <p className="text-xs text-muted-foreground">Cao (60-80)</p>
            <p className="font-medium text-orange-500">2 chỉ số</p>
          </div>
          <div className="p-2 rounded bg-red-500/10 text-center">
            <p className="text-xs text-muted-foreground">Nghiêm trọng (80+)</p>
            <p className="font-medium text-red-500">0 chỉ số</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RiskDashboardPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  const riskScores = [
    {
      title: 'Rủi ro thanh khoản',
      score: 65,
      maxScore: 100,
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Cash runway giảm, cần theo dõi sát',
      severity: 'medium' as const,
    },
    {
      title: 'Rủi ro tín dụng',
      score: 45,
      maxScore: 100,
      trend: 'stable' as const,
      icon: Users,
      description: 'AR quá hạn trong tầm kiểm soát',
      severity: 'low' as const,
    },
    {
      title: 'Rủi ro tập trung',
      score: 72,
      maxScore: 100,
      trend: 'up' as const,
      icon: Building2,
      description: 'Phụ thuộc nhiều vào top khách hàng',
      severity: 'high' as const,
    },
    {
      title: 'Rủi ro lãi suất',
      score: 55,
      maxScore: 100,
      trend: 'down' as const,
      icon: Percent,
      description: 'Đã hedge 60% khoản vay',
      severity: 'medium' as const,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Risk Dashboard | Bluecore FDP</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title={t('nav.riskDashboard')}
          subtitle="Giám sát và quản lý rủi ro tài chính toàn diện"
          actions={
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Xem báo cáo chi tiết
            </Button>
          }
        />

        {/* Overall Risk Score */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Overall Risk Score</h2>
                <p className="text-muted-foreground">Tính đến ngày hôm nay</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-5xl font-bold text-yellow-500">59</div>
                  <p className="text-sm text-muted-foreground">/ 100 (Trung bình)</p>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-yellow-500 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-yellow-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskScores.map((risk, index) => (
            <RiskScoreCard key={index} {...risk} />
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Risk Profile</TabsTrigger>
            <TabsTrigger value="concentration">Rủi ro tập trung</TabsTrigger>
            <TabsTrigger value="stress">Stress Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <RiskRadar />
          </TabsContent>

          <TabsContent value="concentration" className="mt-4">
            <ConcentrationRisk />
          </TabsContent>

          <TabsContent value="stress" className="mt-4">
            <StressTestingPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
