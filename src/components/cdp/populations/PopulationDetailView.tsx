import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ExternalLink,
  Users,
  DollarSign,
  RefreshCw,
  Percent,
  AlertCircle,
  Eye
} from 'lucide-react';
import { formatVNDCompact, formatPercent, formatNumber } from '@/lib/formatters';
import { Link } from 'react-router-dom';

export interface PopulationDetail {
  id: string;
  name: string;
  type: 'segment' | 'cohort' | 'tier';
  definition: string;
  naturalLanguageDescription: string;
  
  // Classification logic
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  
  // Metrics
  size: number;
  revenueShare: number;
  equityShare: number;
  aov: number;
  purchaseCycle: number;
  returnRate: number;
  estimatedEquity: number;
  
  // Trends
  sizeTrend: { value: number; direction: 'up' | 'down' | 'stable' };
  aovTrend: { value: number; direction: 'up' | 'down' | 'stable' };
  
  // Stability
  stability: 'stable' | 'drifting' | 'volatile';
  stabilityNote: string;
  
  // Related insights
  relatedInsights: Array<{
    code: string;
    name: string;
    severity: 'critical' | 'high' | 'medium';
  }>;
  
  // Version info
  version: string;
  lastUpdated: string;
}

interface PopulationDetailViewProps {
  population: PopulationDetail;
  onViewEvidence?: () => void;
}

function StabilityBadge({ stability }: { stability: 'stable' | 'drifting' | 'volatile' }) {
  const styles = {
    stable: { 
      bg: 'bg-success/10', 
      text: 'text-success', 
      border: 'border-success/20', 
      icon: Minus, 
      label: 'Ổn định' 
    },
    drifting: { 
      bg: 'bg-warning/10', 
      text: 'text-warning-foreground', 
      border: 'border-warning/20', 
      icon: TrendingUp, 
      label: 'Đang biến động' 
    },
    volatile: { 
      bg: 'bg-destructive/10', 
      text: 'text-destructive', 
      border: 'border-destructive/20', 
      icon: TrendingDown, 
      label: 'Biến động mạnh' 
    }
  };
  
  const style = styles[stability];
  const Icon = style.icon;
  
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {style.label}
    </Badge>
  );
}

function TrendIndicator({ value, direction }: { value: number; direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'stable') {
    return <span className="text-muted-foreground text-xs">— ổn định</span>;
  }
  
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  const color = direction === 'up' ? 'text-success' : 'text-destructive';
  
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      {direction === 'up' ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function getSeverityColor(severity: 'critical' | 'high' | 'medium') {
  switch (severity) {
    case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'high': return 'bg-warning/10 text-warning-foreground border-warning/20';
    case 'medium': return 'bg-info/10 text-info border-info/20';
  }
}

export function PopulationDetailView({ population, onViewEvidence }: PopulationDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{population.name}</CardTitle>
              <CardDescription className="mt-1">
                Phiên bản {population.version} • Cập nhật {population.lastUpdated}
              </CardDescription>
            </div>
            <StabilityBadge stability={population.stability} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                Quy mô
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatNumber(population.size)}
              </p>
              <TrendIndicator {...population.sizeTrend} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Percent className="w-3.5 h-3.5" />
                Tỷ trọng doanh thu
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatPercent(population.revenueShare / 100)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5" />
                Giá trị kỳ vọng (Equity)
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatVNDCompact(population.estimatedEquity)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
                Insight liên quan
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {population.relatedInsights.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Natural Language Definition */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Định nghĩa bằng ngôn ngữ tự nhiên</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              {population.naturalLanguageDescription}
            </p>
          </CardContent>
        </Card>

        {/* Classification Logic */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Logic phân loại</CardTitle>
            <CardDescription>Chỉ đọc — Chỉnh sửa qua CDP Registry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Điều kiện bao gồm
              </p>
              <ul className="space-y-1.5">
                {population.inclusionCriteria.map((criteria, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-success mt-0.5">✓</span>
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>
            {population.exclusionCriteria.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Điều kiện loại trừ
                </p>
                <ul className="space-y-1.5">
                  {population.exclusionCriteria.map((criteria, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-destructive mt-0.5">✗</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Các chỉ số theo dõi chính</CardTitle>
          <CardDescription>Dữ liệu chỉ đọc từ CDP registry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">AOV trung bình</p>
              <p className="text-base font-semibold tabular-nums">
                {formatVNDCompact(population.aov)}
              </p>
              <TrendIndicator {...population.aovTrend} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Chu kỳ mua lại</p>
              <p className="text-base font-semibold tabular-nums">
                {population.purchaseCycle} ngày
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tỷ lệ hoàn trả</p>
              <p className="text-base font-semibold tabular-nums">
                {formatPercent(population.returnRate / 100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tỷ trọng equity</p>
              <p className="text-base font-semibold tabular-nums">
                {formatPercent(population.equityShare / 100)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stability & Volatility */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Biến động & Độ ổn định</CardTitle>
            <StabilityBadge stability={population.stability} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {population.stabilityNote}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Related Insights */}
      {population.relatedInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Insight liên quan</CardTitle>
            <CardDescription>
              Các insight đang áp dụng cho tập khách này
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {population.relatedInsights.map((insight) => (
                <Link
                  key={insight.code}
                  to={`/cdp/insights/${insight.code}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={getSeverityColor(insight.severity)}
                    >
                      {insight.code}
                    </Badge>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {insight.name}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence CTA */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Xem bằng chứng</p>
                <p className="text-sm text-muted-foreground">
                  Kiểm tra 3–5 khách hàng mẫu để xác minh logic phân loại
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onViewEvidence}>
              <Eye className="w-4 h-4 mr-2" />
              Xem mẫu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
