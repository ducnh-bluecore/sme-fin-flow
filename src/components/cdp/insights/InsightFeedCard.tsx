import { useNavigate } from 'react-router-dom';
import { 
  TrendingDown, 
  TrendingUp, 
  ChevronRight,
  Clock,
  DollarSign,
  Layers,
  ShieldAlert,
  Database
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InsightFeedItem {
  code: string;
  title: string;
  topic: 'demand' | 'value' | 'timing' | 'risk' | 'equity';
  populationName: string;
  populationSize: number;
  revenueContribution: number;
  severity: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  detectedAt: Date;
  status: 'active' | 'cooldown';
  changePercent: number;
  changeDirection: 'up' | 'down';
}

interface InsightFeedCardProps {
  insight: InsightFeedItem;
}

const topicConfig: Record<InsightFeedItem['topic'], { label: string; icon: typeof DollarSign; className: string }> = {
  demand: { label: 'Nhu cầu', icon: TrendingUp, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  value: { label: 'Giá trị', icon: DollarSign, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  timing: { label: 'Thời gian mua', icon: Clock, className: 'bg-purple-50 text-purple-700 border-purple-200' },
  risk: { label: 'Hoàn trả & Rủi ro', icon: ShieldAlert, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  equity: { label: 'Giá trị KH', icon: Layers, className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const severityConfig: Record<InsightFeedItem['severity'], { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Trung bình', className: 'bg-warning/10 text-warning-foreground border-warning/30' },
  high: { label: 'Cao', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const confidenceConfig: Record<InsightFeedItem['confidence'], { label: string }> = {
  low: { label: 'Thấp' },
  medium: { label: 'Trung bình' },
  high: { label: 'Cao' },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function InsightFeedCard({ insight }: InsightFeedCardProps) {
  const navigate = useNavigate();
  const topic = topicConfig[insight.topic];
  const severity = severityConfig[insight.severity];
  const confidence = confidenceConfig[insight.confidence];
  const TopicIcon = topic.icon;

  return (
    <Card 
      className={cn(
        'hover:shadow-sm transition-all cursor-pointer group',
        insight.status === 'cooldown' && 'opacity-60'
      )}
      onClick={() => navigate(`/cdp/insights/${insight.code}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {insight.code}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', topic.className)}>
                <TopicIcon className="w-3 h-3 mr-1" />
                {topic.label}
              </Badge>
              <Badge className={cn('text-xs', severity.className)}>
                {severity.label}
              </Badge>
              {insight.status === 'cooldown' && (
                <Badge variant="outline" className="text-xs bg-muted">
                  Cooldown
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-medium text-sm mb-3 text-foreground">
              {insight.title}
            </h3>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Tập khách hàng</p>
                <p className="font-medium">{insight.populationName}</p>
                <p className="text-muted-foreground">
                  {insight.populationSize.toLocaleString()} khách
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Tỷ trọng DT</p>
                <p className="font-medium">{insight.revenueContribution}%</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Độ tin cậy</p>
                <p className="font-medium">{confidence.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Phát hiện</p>
                <p className="font-medium">{formatDate(insight.detectedAt)}</p>
              </div>
            </div>
          </div>

          {/* Right Side - Change Indicator + Arrow */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                insight.changeDirection === 'down' ? 'text-destructive' : 'text-success'
              )}>
                {insight.changeDirection === 'down' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                {insight.changePercent > 0 ? '+' : ''}{insight.changePercent.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">so với baseline</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
