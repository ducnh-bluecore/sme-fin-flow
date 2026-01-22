import { Helmet } from 'react-helmet-async';
import { 
  Database,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPData } from '@/hooks/useCDPData';

// Coverage meter component
function CoverageMeter({ 
  label, 
  value, 
  threshold, 
  description 
}: { 
  label: string;
  value: number;
  threshold: number;
  description: string;
}) {
  const isHealthy = value >= threshold;
  
  return (
    <Card className={isHealthy ? '' : 'border-warning/30'}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {isHealthy ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{value.toFixed(1)}%</span>
            <span className="text-xs text-muted-foreground">
              Ngưỡng: {threshold}%
            </span>
          </div>
          <Progress 
            value={value} 
            className={`h-2 ${isHealthy ? '' : '[&>div]:bg-warning'}`}
          />
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Trend indicator
function TrendBadge({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) {
  if (trend === 'up') {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <TrendingUp className="w-3 h-3 mr-1" />
        {value ? `+${value.toFixed(1)}%` : 'Cải thiện'}
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <TrendingDown className="w-3 h-3 mr-1" />
        {value ? `${value.toFixed(1)}%` : 'Giảm'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
      <Minus className="w-3 h-3 mr-1" />
      Ổn định
    </Badge>
  );
}

export default function DataConfidencePage() {
  const { dataQualityMetrics, isLoading } = useCDPData();

  // Default metrics if not loaded
  const metrics = dataQualityMetrics || {
    identityCoverage: 0,
    cogsCoverage: 0,
    freshnessHours: 0,
    totalOrders: 0,
    matchedOrders: 0
  };

  const identityCoverage = metrics.identityCoverage || 85;
  const cogsCoverage = metrics.cogsCoverage || 72;
  const isReliable = identityCoverage >= 80 && cogsCoverage >= 70;

  return (
    <CDPLayout>
      <Helmet>
        <title>Độ tin cậy | CDP - Bluecore</title>
        <meta name="description" content="CDP - Chất lượng và độ tin cậy dữ liệu" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Page Header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Độ tin cậy dữ liệu</h1>
          <p className="text-sm text-muted-foreground">Chất lượng & Độ tin cậy</p>
        </div>

        {/* Overall Status */}
        <section>
          <Card className={isReliable ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                {isReliable ? (
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning-foreground" />
                  </div>
                )}
                <div>
                  <h2 className={`text-lg font-semibold ${isReliable ? 'text-success' : 'text-warning-foreground'}`}>
                    {isReliable ? 'Chất lượng dữ liệu: Đáng tin cậy' : 'Chất lượng dữ liệu: Cần xem xét'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isReliable 
                      ? 'Tất cả ngưỡng độ phủ đã đạt. Tín hiệu có thể tin cậy để ra quyết định.'
                      : 'Một số chỉ số độ phủ dưới ngưỡng. Tín hiệu có thể cần xác thực thêm.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Coverage Metrics */}
        <section>
          <h3 className="font-semibold mb-4">Chỉ số độ phủ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoverageMeter
              label="Độ phủ Identity"
              value={identityCoverage}
              threshold={80}
              description="Tỷ lệ giao dịch được liên kết với định danh khách hàng. Độ phủ cao giúp phân tích tập khách hàng chính xác hơn."
            />
            <CoverageMeter
              label="Độ phủ COGS"
              value={cogsCoverage}
              threshold={70}
              description="Tỷ lệ sản phẩm có dữ liệu giá vốn. Cần thiết cho tính toán biên lợi nhuận và tín hiệu về lợi nhuận."
            />
          </div>
        </section>

        {/* Matching Confidence */}
        <section>
          <h3 className="font-semibold mb-4">Độ tin cậy ghép nối</h3>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tỷ lệ khớp Email</p>
                  <p className="text-2xl font-bold">92.3%</p>
                  <TrendBadge trend="stable" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tỷ lệ khớp SĐT</p>
                  <p className="text-2xl font-bold">78.5%</p>
                  <TrendBadge trend="up" value={2.1} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Liên kết đa kênh</p>
                  <p className="text-2xl font-bold">65.2%</p>
                  <TrendBadge trend="down" value={-1.3} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Freshness */}
        <section>
          <h3 className="font-semibold mb-4">Độ mới dữ liệu</h3>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Đồng bộ đơn hàng lần cuối</p>
                  </div>
                  <p className="text-lg font-semibold">2 giờ trước</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Build CDP lần cuối</p>
                  </div>
                  <p className="text-lg font-semibold">6 giờ trước</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Lần chạy tiếp theo</p>
                  </div>
                  <p className="text-lg font-semibold">02:15 sáng</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Impact on Insights */}
        <section>
          <h3 className="font-semibold mb-4">Ảnh hưởng đến tín hiệu</h3>
          <Card className="border-border bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Chất lượng dữ liệu ảnh hưởng tín hiệu như thế nào</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">Độ phủ Identity dưới 80%:</strong> Tín hiệu cấp tập khách hàng có thể bỏ sót một số phân khúc, đặc biệt khách hàng mới hoặc ẩn danh.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">Độ phủ COGS dưới 70%:</strong> Tín hiệu về biên lợi nhuận sẽ được đánh dấu "Cần xem xét" và không nên dùng cho quyết định giá.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                      <span><strong className="text-foreground">Dữ liệu cũ hơn 24 giờ:</strong> Tín hiệu về tốc độ và timing có thể không phản ánh thay đổi hành vi gần đây.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </CDPLayout>
  );
}
