import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, 
  TrendingUp,
  Minus,
  AlertTriangle,
  ArrowRight,
  Users,
  Clock,
  DollarSign,
  ShieldAlert,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CDPLayout } from '@/components/layout/CDPLayout';
import { useCDPInsightDetection } from '@/hooks/useCDPInsightDetection';

// Direction indicator component
function DirectionIndicator({ direction, magnitude }: { direction: 'up' | 'down' | 'stable'; magnitude: number }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center text-success">
        <TrendingUp className="w-4 h-4 mr-1" />
        +{magnitude.toFixed(1)}%
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center text-destructive">
        <TrendingDown className="w-4 h-4 mr-1" />
        {magnitude.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-muted-foreground">
      <Minus className="w-4 h-4 mr-1" />
      Ổn định
    </span>
  );
}

// Severity badge for insights
function SeverityIndicator({ severity }: { severity: 'critical' | 'high' | 'medium' }) {
  const styles = {
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    high: 'bg-warning/10 text-warning-foreground border-warning/20',
    medium: 'bg-muted text-muted-foreground border-border'
  };
  
  const labels = {
    critical: 'NGHIÊM TRỌNG',
    high: 'CAO',
    medium: 'TRUNG BÌNH'
  };
  
  return (
    <Badge variant="outline" className={styles[severity]}>
      {labels[severity]}
    </Badge>
  );
}

// Insight highlight card
function InsightHighlightCard({ 
  headline, 
  population, 
  direction, 
  magnitude, 
  implication,
  severity
}: { 
  headline: string;
  population: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  implication: string;
  severity: 'critical' | 'high' | 'medium';
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="font-medium text-sm leading-tight">{headline}</h4>
          <SeverityIndicator severity={severity} />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {population}
          </span>
          <DirectionIndicator direction={direction} magnitude={magnitude} />
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          {implication}
        </p>
      </CardContent>
    </Card>
  );
}

// Data confidence summary
function DataConfidenceSummary({ 
  identityCoverage, 
  cogsCoverage,
  isReliable 
}: { 
  identityCoverage: number;
  cogsCoverage: number;
  isReliable: boolean;
}) {
  return (
    <Card className={isReliable ? 'border-success/30' : 'border-warning/30'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          Độ tin cậy dữ liệu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Độ phủ Identity</p>
            <p className="font-semibold">{identityCoverage.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Độ phủ COGS</p>
            <p className="font-semibold">{cogsCoverage.toFixed(1)}%</p>
          </div>
        </div>
        {!isReliable && (
          <p className="text-xs text-warning-foreground mt-3">
            ⚠️ Độ phủ thấp có thể ảnh hưởng độ chính xác của tín hiệu
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CDPOverviewPage() {
  const navigate = useNavigate();
  const { insights, summary, dataQuality, isLoading } = useCDPInsightDetection();

  // Transform insights into highlight cards (top 6)
  const topInsights = insights
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return severityOrder[a.definition.risk.severity] - severityOrder[b.definition.risk.severity];
    })
    .slice(0, 6);

  // Category summary for navigation
  const categorySummary = [
    { 
      label: 'Giá trị & Doanh thu', 
      count: summary.byCategory.value || 0,
      icon: DollarSign,
      path: '/cdp/insights'
    },
    { 
      label: 'Tần suất mua', 
      count: summary.byCategory.velocity || 0,
      icon: Clock,
      path: '/cdp/insights'
    },
    { 
      label: 'Cơ cấu sản phẩm', 
      count: summary.byCategory.mix || 0,
      icon: TrendingUp,
      path: '/cdp/insights'
    },
    { 
      label: 'Tín hiệu rủi ro', 
      count: (summary.byCategory.risk || 0) + (summary.byCategory.quality || 0),
      icon: ShieldAlert,
      path: '/cdp/insights'
    },
  ];

  return (
    <CDPLayout>
      <Helmet>
        <title>Tổng quan CDP | Bluecore</title>
        <meta name="description" content="Nền tảng Dữ liệu Khách hàng - Tổng quan điều hành" />
      </Helmet>

      <div className="space-y-8 max-w-5xl">
        {/* Strategic Brief Header */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Có gì thay đổi gần đây?</h2>
              <p className="text-sm text-muted-foreground">
                {summary.triggered} dịch chuyển hành vi được phát hiện trong tập khách hàng
              </p>
            </div>
            {summary.bySeverity.critical > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {summary.bySeverity.critical} Nghiêm trọng
              </Badge>
            )}
          </div>

          {/* Category Navigation */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {categorySummary.map((cat) => (
              <Card 
                key={cat.label}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  cat.count > 0 ? 'border-warning/30' : ''
                }`}
                onClick={() => navigate(cat.path)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{cat.label}</span>
                    </div>
                    <span className={`font-semibold ${cat.count > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                      {cat.count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Insight Highlights */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tín hiệu nổi bật</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/cdp/insights')}
              className="text-sm text-muted-foreground"
            >
              Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-32 animate-pulse bg-muted" />
              ))}
            </div>
          ) : topInsights.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <AlertTriangle className="w-8 h-8 text-success mx-auto mb-3" />
                <p className="font-medium">Không có dịch chuyển đáng kể</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tất cả chỉ số khách hàng đang trong ngưỡng bình thường
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topInsights.map((insight) => (
                <InsightHighlightCard
                  key={insight.code}
                  headline={insight.definition.nameVi || insight.definition.name}
                  population={insight.population.description}
                  direction={insight.detection.direction}
                  magnitude={Math.abs(insight.detection.changePercent)}
                  implication={insight.statement}
                  severity={insight.definition.risk.severity}
                />
              ))}
            </div>
          )}
        </section>

        {/* Data Confidence Summary */}
        <section>
          <h3 className="font-semibold mb-4">Độ tin cậy dữ liệu</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DataConfidenceSummary
              identityCoverage={dataQuality.identityCoverage}
              cogsCoverage={dataQuality.cogsCoverage}
              isReliable={dataQuality.isReliable}
            />
            
            <Card className="md:col-span-2">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">Cách tính độ tin cậy</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Độ phủ Identity cho biết % giao dịch được liên kết với khách hàng đã định danh. 
                      Độ phủ COGS cho biết độ tin cậy của tính toán biên lợi nhuận. 
                      Tín hiệu được đánh dấu "Cần xem xét" khi độ phủ dưới 70%.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </CDPLayout>
  );
}
