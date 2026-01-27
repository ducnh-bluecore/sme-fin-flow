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
  FileText,
  Download,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { useRiskRadarData, type RiskScoreItem } from '@/hooks/useRiskRadarData';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  // SSOT: Fetch from v_risk_radar_summary view
  const { riskScores, lowCount, mediumCount, highCount, criticalCount, isLoading } = useRiskRadarData();

  if (isLoading) {
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
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no data, show empty state
  if (riskScores.length === 0) {
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
          <div className="h-[350px] flex items-center justify-center">
            <p className="text-muted-foreground">Chưa có dữ liệu risk scores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <RadarChart data={riskScores}>
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
              <Tooltip 
                formatter={(value: number, name: string, props: { payload?: { details?: string } }) => [
                  `${value}%`,
                  props.payload?.details || name
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-green-500/10 text-center">
            <p className="text-xs text-muted-foreground">Thấp (0-40)</p>
            <p className="font-medium text-green-500">{lowCount} chỉ số</p>
          </div>
          <div className="p-2 rounded bg-yellow-500/10 text-center">
            <p className="text-xs text-muted-foreground">Trung bình (40-70)</p>
            <p className="font-medium text-yellow-500">{mediumCount} chỉ số</p>
          </div>
          <div className="p-2 rounded bg-orange-500/10 text-center">
            <p className="text-xs text-muted-foreground">Cao (70+)</p>
            <p className="font-medium text-orange-500">{highCount} chỉ số</p>
          </div>
          <div className="p-2 rounded bg-red-500/10 text-center">
            <p className="text-xs text-muted-foreground">Nghiêm trọng</p>
            <p className="font-medium text-red-500">{criticalCount} chỉ số</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Risk Report Dialog Component
function RiskReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const reportDate = format(new Date(), 'dd/MM/yyyy', { locale: vi });
  
  const riskSummary = {
    overallScore: 59,
    riskLevel: 'Trung bình',
    trend: 'Tăng nhẹ so với tháng trước (+3 điểm)',
  };

  const detailedRisks = [
    {
      category: 'Rủi ro thanh khoản',
      score: 65,
      status: 'Cảnh báo',
      details: 'Cash runway hiện tại: 4.2 tháng. Dòng tiền từ hoạt động kinh doanh giảm 15% so với cùng kỳ.',
      recommendations: [
        'Đẩy mạnh thu hồi công nợ quá hạn',
        'Đàm phán gia hạn thanh toán với nhà cung cấp',
        'Xem xét hạn mức tín dụng ngân hàng',
      ],
    },
    {
      category: 'Rủi ro tín dụng',
      score: 45,
      status: 'Ổn định',
      details: 'Tỷ lệ nợ xấu: 2.3%. AR quá hạn > 90 ngày: 1.2 tỷ VND (chiếm 3.5% tổng AR).',
      recommendations: [
        'Tiếp tục theo dõi khách hàng có lịch sử thanh toán chậm',
        'Cập nhật chính sách tín dụng cho khách hàng mới',
      ],
    },
    {
      category: 'Rủi ro tập trung',
      score: 72,
      status: 'Cao',
      details: 'Top 3 khách hàng chiếm 50% doanh thu. Supplier A chiếm 35% tổng chi phí mua hàng.',
      recommendations: [
        'Mở rộng danh sách khách hàng tiềm năng',
        'Tìm kiếm nhà cung cấp thay thế cho Supplier A',
        'Xây dựng kế hoạch dự phòng nếu mất top customer',
      ],
    },
    {
      category: 'Rủi ro lãi suất',
      score: 55,
      status: 'Trung bình',
      details: 'Tổng dư nợ vay: 25 tỷ VND. Đã hedge 60% với lãi suất cố định. 40% còn lại theo lãi suất thả nổi.',
      recommendations: [
        'Xem xét chuyển đổi thêm sang lãi suất cố định',
        'Theo dõi xu hướng lãi suất thị trường',
      ],
    },
    {
      category: 'Rủi ro tỷ giá',
      score: 48,
      status: 'Ổn định',
      details: 'Doanh thu USD chiếm 30%. Chi phí nhập khẩu USD chiếm 45%. Natural hedge: +15% exposure.',
      recommendations: [
        'Duy trì natural hedge hiện tại',
        'Xem xét forward contract nếu USD biến động mạnh',
      ],
    },
  ];

  const actionItems = [
    { priority: 'Cao', action: 'Lập kế hoạch đa dạng hóa nhà cung cấp', deadline: '15/02/2026', owner: 'Phòng Mua hàng' },
    { priority: 'Cao', action: 'Thu hồi AR quá hạn > 60 ngày', deadline: '31/01/2026', owner: 'Phòng Kế toán' },
    { priority: 'Trung bình', action: 'Đánh giá lại hạn mức tín dụng khách hàng', deadline: '28/02/2026', owner: 'Phòng Tín dụng' },
    { priority: 'Trung bình', action: 'Chuẩn bị phương án hedge lãi suất', deadline: '15/02/2026', owner: 'CFO' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Báo cáo Rủi ro Chi tiết
          </DialogTitle>
          <DialogDescription>
            Ngày lập: {reportDate}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Summary Section */}
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tổng quan Rủi ro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-500">{riskSummary.overallScore}</div>
                    <p className="text-sm text-muted-foreground">Điểm rủi ro tổng thể</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-yellow-500/20 text-yellow-600 text-lg py-1 px-3">
                      {riskSummary.riskLevel}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">Mức độ rủi ro</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-orange-500">{riskSummary.trend}</p>
                    <p className="text-sm text-muted-foreground">Xu hướng</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Detailed Risks */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Phân tích Chi tiết theo Loại Rủi ro</h3>
              <div className="space-y-4">
                {detailedRisks.map((risk, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{risk.category}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{risk.score}/100</span>
                          <Badge variant={
                            risk.status === 'Cao' ? 'destructive' : 
                            risk.status === 'Cảnh báo' ? 'default' : 
                            'secondary'
                          }>
                            {risk.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{risk.details}</p>
                      <div>
                        <p className="text-sm font-medium mb-1">Khuyến nghị:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {risk.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hành động Cần thực hiện</h3>
              <div className="rounded-lg border">
                <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 font-medium text-sm">
                  <div>Ưu tiên</div>
                  <div>Hành động</div>
                  <div>Hạn chót</div>
                  <div>Phụ trách</div>
                </div>
                {actionItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-3 border-t text-sm">
                    <div>
                      <Badge variant={item.priority === 'Cao' ? 'destructive' : 'secondary'}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div>{item.action}</div>
                    <div>{item.deadline}</div>
                    <div className="text-muted-foreground">{item.owner}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                In báo cáo
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Xuất PDF
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function RiskDashboardPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // SSOT: Fetch risk scores from database
  const { riskScores: radarScores, overallScore, isLoading: riskLoading } = useRiskRadarData();

  // Map radar scores to risk card format
  const riskScores = radarScores.length > 0 ? [
    {
      title: 'Rủi ro thanh khoản',
      score: radarScores.find(r => r.category === 'Liquidity')?.score || 0,
      maxScore: 100,
      trend: 'stable' as const,
      icon: DollarSign,
      description: 'Cash runway và dòng tiền hoạt động',
      severity: (radarScores.find(r => r.category === 'Liquidity')?.severity || 'low') as 'low' | 'medium' | 'high',
    },
    {
      title: 'Rủi ro tín dụng',
      score: radarScores.find(r => r.category === 'Credit')?.score || 0,
      maxScore: 100,
      trend: 'stable' as const,
      icon: Users,
      description: 'AR quá hạn và nợ xấu',
      severity: (radarScores.find(r => r.category === 'Credit')?.severity || 'low') as 'low' | 'medium' | 'high',
    },
    {
      title: 'Rủi ro thị trường',
      score: radarScores.find(r => r.category === 'Market')?.score || 0,
      maxScore: 100,
      trend: 'stable' as const,
      icon: Building2,
      description: 'Biến động thị trường và tỷ giá',
      severity: (radarScores.find(r => r.category === 'Market')?.severity || 'low') as 'low' | 'medium' | 'high',
    },
    {
      title: 'Rủi ro vận hành',
      score: radarScores.find(r => r.category === 'Operational')?.score || 0,
      maxScore: 100,
      trend: 'stable' as const,
      icon: Percent,
      description: 'Quy trình và hệ thống nội bộ',
      severity: (radarScores.find(r => r.category === 'Operational')?.severity || 'low') as 'low' | 'medium' | 'high',
    },
  ] : [];

  return (
    <>
      <Helmet>
        <title>Risk Dashboard | Bluecore FDP</title>
      </Helmet>

      <RiskReportDialog open={showReportDialog} onOpenChange={setShowReportDialog} />

      <div className="space-y-6">
        <PageHeader
          title={t('nav.riskDashboard')}
          subtitle="Giám sát và quản lý rủi ro tài chính toàn diện"
          actions={
            <Button variant="outline" onClick={() => setShowReportDialog(true)}>
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
                  <div className={`text-5xl font-bold ${
                    overallScore < 40 ? 'text-green-500' :
                    overallScore < 70 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {riskLoading ? '...' : overallScore}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    / 100 ({overallScore < 40 ? 'Thấp' : overallScore < 70 ? 'Trung bình' : 'Cao'})
                  </p>
                </div>
                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                  overallScore < 40 ? 'border-green-500' :
                  overallScore < 70 ? 'border-yellow-500' : 'border-red-500'
                }`}>
                  <Shield className={`h-10 w-10 ${
                    overallScore < 40 ? 'text-green-500' :
                    overallScore < 70 ? 'text-yellow-500' : 'text-red-500'
                  }`} />
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
