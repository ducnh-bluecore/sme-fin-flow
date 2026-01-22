import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  FileText,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CDPLayout } from '@/components/layout/CDPLayout';

// Mock insight detail
const mockInsight = {
  code: 'V01',
  name: 'Chi tiêu giảm mạnh',
  nameVi: 'Core Spend Decline',
  category: 'value',
  severity: 'critical' as const,
  status: 'active',
  
  // What changed
  currentValue: 1850000,
  baselineValue: 2200000,
  changePercent: -15.9,
  metric: 'AOV trung bình',
  
  // Population
  population: {
    name: 'Top 20% khách hàng',
    size: 2456,
    revenueContribution: 65,
  },
  
  // Leading indicators
  leadingIndicators: [
    { name: 'Tần suất mua', value: -8.2, unit: '%' },
    { name: 'Số lượng/đơn', value: -12.5, unit: '%' },
    { name: 'Giá trị giỏ hàng', value: -15.9, unit: '%' },
  ],
  
  // Business meaning
  businessImplication: 'Nhóm khách hàng giá trị cao đang giảm mức chi tiêu trung bình. Nếu xu hướng này tiếp tục, doanh thu từ phân khúc này có thể giảm 12-15% trong Q1/2025.',
  
  // Evidence
  evidence: {
    sampleCustomers: [
      { name: 'Nguyễn Văn A', prevAOV: 2500000, currentAOV: 1800000 },
      { name: 'Trần Thị B', prevAOV: 2200000, currentAOV: 1650000 },
      { name: 'Lê Hoàng C', prevAOV: 2800000, currentAOV: 2100000 },
    ],
    snapshotDate: '2025-01-20',
  },
  
  // Linked decision card
  linkedDecisionCard: 'DC-001',
  
  // Detection info
  detectedAt: '2025-01-18',
  cooldownUntil: '2025-02-01',
};

const severityLabels = {
  critical: 'NGHIÊM TRỌNG',
  high: 'CAO',
  medium: 'TRUNG BÌNH'
};

const severityStyles = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-warning/10 text-warning-foreground border-warning/20',
  medium: 'bg-muted text-muted-foreground border-border'
};

function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN') + ' đ';
}

export default function InsightDetailPage() {
  const { insightCode } = useParams();
  const navigate = useNavigate();

  // In real app, fetch insight by code
  const insight = mockInsight;

  return (
    <CDPLayout>
      <Helmet>
        <title>{insight.code} - {insight.nameVi} | CDP - Bluecore</title>
        <meta name="description" content={`Chi tiết insight ${insight.code}`} />
      </Helmet>

      <div className="space-y-6 max-w-4xl">
        {/* Back button + Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/cdp/insights')}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{insight.code}</Badge>
              <h1 className="text-xl font-semibold">{insight.nameVi}</h1>
              <Badge className={severityStyles[insight.severity]}>
                {severityLabels[insight.severity]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{insight.name}</p>
          </div>
          <Button size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Tạo Thẻ Quyết định
          </Button>
        </div>

        {/* What Changed */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
              Điều gì đã thay đổi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Giá trị hiện tại</p>
                <p className="text-2xl font-bold">{formatCurrency(insight.currentValue)}</p>
                <p className="text-xs text-muted-foreground">{insight.metric}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Baseline</p>
                <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(insight.baselineValue)}</p>
                <p className="text-xs text-muted-foreground">30 ngày trước</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Thay đổi</p>
                <p className="text-2xl font-bold text-destructive">{insight.changePercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Population Affected */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tập khách hàng bị ảnh hưởng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tập khách hàng</p>
                <p className="font-semibold">{insight.population.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quy mô</p>
                <p className="font-semibold">{insight.population.size.toLocaleString()} khách</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tỷ trọng doanh thu</p>
                <p className="font-semibold">{insight.population.revenueContribution}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leading Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Các chỉ số dẫn dắt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {insight.leadingIndicators.map((indicator) => (
                <div key={indicator.name} className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{indicator.name}</p>
                  <p className={`text-lg font-semibold ${indicator.value < 0 ? 'text-destructive' : 'text-success'}`}>
                    {indicator.value > 0 ? '+' : ''}{indicator.value}{indicator.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Business Implication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning-foreground" />
              Ý nghĩa kinh doanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{insight.businessImplication}</p>
          </CardContent>
        </Card>

        {/* Evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bằng chứng</CardTitle>
            <CardDescription>Khách hàng mẫu minh họa xu hướng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insight.evidence.sampleCustomers.map((customer) => (
                <div key={customer.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">{formatCurrency(customer.prevAOV)}</p>
                      <p className="text-xs text-muted-foreground">Trước</p>
                    </div>
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.currentAOV)}</p>
                      <p className="text-xs text-muted-foreground">Hiện tại</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Snapshot: {insight.evidence.snapshotDate}</span>
              <span>Chỉ đọc • Không có hành động</span>
            </div>
          </CardContent>
        </Card>

        {/* Linked Decision Card */}
        {insight.linkedDecisionCard && (
          <Card className="border-info/30 bg-info/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-info" />
                  <div>
                    <p className="font-medium">Đã tạo Thẻ Quyết định</p>
                    <p className="text-xs text-muted-foreground">Mã: {insight.linkedDecisionCard}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/cdp/decisions')}>
                  Xem Thẻ
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detection Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Phát hiện: {insight.detectedAt}
                </span>
                <span className="text-muted-foreground">
                  Cooldown đến: {insight.cooldownUntil}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CDPLayout>
  );
}
