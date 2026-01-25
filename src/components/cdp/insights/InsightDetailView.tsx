import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  FileText,
  Activity,
  Eye,
  Clock,
  Link2,
  Shield,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface InsightDetailData {
  // Summary
  code: string;
  title: string;
  topic: string;
  populationName: string;
  populationSize: number;
  revenueContribution: number;
  severity: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  status: 'active' | 'cooldown';
  
  // What changed
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  changeDirection: 'up' | 'down';
  metricName: string;
  periodCurrent: string;
  periodBaseline: string;
  
  // Business meaning
  businessImplication: string;
  
  // Leading indicators
  drivers: Array<{
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  // Evidence
  sampleCustomers: Array<{
    anonymousId: string;
    previousValue: number;
    currentValue: number;
  }>;
  snapshotDate: string;
  
  // Decision link
  linkedDecisionCardId?: string;
  linkedDecisionCardStatus?: string;
  
  // Detection info
  detectedAt: string;
  cooldownUntil?: string;
}

interface InsightDetailViewProps {
  insight: InsightDetailData;
  onCreateDecisionCard: () => void;
}

const severityConfig = {
  low: { label: 'Thấp', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Trung bình', className: 'bg-warning/10 text-warning-foreground border-warning/30' },
  high: { label: 'Cao', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const confidenceConfig = {
  low: { label: 'Thấp' },
  medium: { label: 'Trung bình' },
  high: { label: 'Cao' },
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString('vi-VN') + ' đ';
}

export function InsightDetailView({ insight, onCreateDecisionCard }: InsightDetailViewProps) {
  const navigate = useNavigate();
  const severity = severityConfig[insight.severity];
  const confidence = confidenceConfig[insight.confidence];
  const isNegative = insight.changeDirection === 'down';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/cdp/insights')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại Dòng Insight
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono">{insight.code}</Badge>
            <h1 className="text-xl font-semibold">{insight.title}</h1>
            <Badge className={severity.className}>
              {severity.label}
            </Badge>
            {insight.status === 'cooldown' && (
              <Badge variant="outline" className="bg-muted">Cooldown</Badge>
            )}
          </div>
        </div>
        {!insight.linkedDecisionCardId && (
          <Button size="sm" onClick={onCreateDecisionCard}>
            <FileText className="w-4 h-4 mr-2" />
            Tạo Thẻ Quyết định
          </Button>
        )}
      </div>

      {/* [A] Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tóm tắt Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Chủ đề</p>
              <p className="font-medium">{insight.topic}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Tập khách hàng</p>
              <p className="font-medium">{insight.populationName}</p>
              <p className="text-xs text-muted-foreground">
                {insight.populationSize.toLocaleString()} khách • {insight.revenueContribution}% doanh thu
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Độ tin cậy</p>
              <p className="font-medium">{confidence.label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* [B] What Changed */}
      <Card className={cn(
        'border-l-4',
        isNegative ? 'border-l-destructive' : 'border-l-success'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isNegative ? (
              <TrendingDown className="w-5 h-5 text-destructive" />
            ) : (
              <TrendingUp className="w-5 h-5 text-success" />
            )}
            Điều gì đã thay đổi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Giá trị hiện tại</p>
              <p className="text-2xl font-bold">{formatCurrency(insight.currentValue)}</p>
              <p className="text-xs text-muted-foreground">{insight.periodCurrent}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Baseline</p>
              <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(insight.baselineValue)}</p>
              <p className="text-xs text-muted-foreground">{insight.periodBaseline}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Thay đổi</p>
              <p className={cn(
                'text-2xl font-bold',
                isNegative ? 'text-destructive' : 'text-success'
              )}>
                {insight.changePercent > 0 ? '+' : ''}{insight.changePercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{insight.metricName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* [C] Why This Matters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-foreground" />
            Ý nghĩa kinh doanh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            {insight.businessImplication}
          </p>
          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">📊 Nguồn dữ liệu:</span> Phân tích dựa trên giao dịch thực tế từ {insight.periodBaseline} đến {insight.periodCurrent}. 
              Độ tin cậy: {confidenceConfig[insight.confidence].label}. Quyết định cuối cùng thuộc về doanh nghiệp.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* [D] Leading Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Các chỉ số dẫn dắt
          </CardTitle>
          <CardDescription>Các chỉ số góp phần tạo nên insight này</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {insight.drivers.map((driver) => (
              <div key={driver.name} className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{driver.name}</p>
                <div className="flex items-center gap-2">
                  {driver.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
                  {driver.trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
                  <span className={cn(
                    'text-lg font-semibold',
                    driver.trend === 'down' ? 'text-destructive' : 
                    driver.trend === 'up' ? 'text-success' : 'text-muted-foreground'
                  )}>
                    {driver.value > 0 ? '+' : ''}{driver.value}{driver.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* [E] Evidence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Bằng chứng
          </CardTitle>
          <CardDescription>Khách hàng mẫu minh họa xu hướng (chỉ để kiểm chứng, không để hành động)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insight.sampleCustomers.map((customer) => (
              <div 
                key={customer.anonymousId} 
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => navigate(`/cdp/audit/${customer.anonymousId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                    <Users className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <span className="font-mono text-sm group-hover:text-primary transition-colors">{customer.anonymousId}</span>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3" />
                      Xem hồ sơ kiểm chứng
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">{formatCurrency(customer.previousValue)}</p>
                    <p className="text-xs text-muted-foreground">Trước</p>
                  </div>
                  {customer.currentValue < customer.previousValue ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-success" />
                  )}
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(customer.currentValue)}</p>
                    <p className="text-xs text-muted-foreground">Hiện tại</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Snapshot: {insight.snapshotDate}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Chỉ đọc • Không có hành động
            </span>
          </div>
        </CardContent>
      </Card>

      {/* [F] Decision Link */}
      {insight.linkedDecisionCardId ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Đã tạo Thẻ Quyết định</p>
                  <p className="text-xs text-muted-foreground">
                    Mã: {insight.linkedDecisionCardId} • Trạng thái: {insight.linkedDecisionCardStatus}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/cdp/decisions')}>
                Xem Thẻ
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Chưa có Thẻ Quyết định</p>
                  <p className="text-xs text-muted-foreground">
                    Nếu insight này cần được xem xét ở cấp điều hành, bạn có thể tạo thẻ quyết định
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Bỏ qua insight này
                </Button>
                <Button size="sm" onClick={onCreateDecisionCard}>
                  Tạo Thẻ Quyết định
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detection Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Phát hiện: {insight.detectedAt}
              </span>
              {insight.cooldownUntil && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Cooldown đến: {insight.cooldownUntil}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
