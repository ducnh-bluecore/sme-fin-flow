import { DollarSign, Clock, TrendingUp, ShieldAlert, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export interface TopicSummary {
  category: 'value' | 'velocity' | 'mix' | 'risk' | 'quality';
  signalCount: number;
  criticalCount: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  headline: string;
}

interface TopicSummarySectionProps {
  topics: TopicSummary[];
}

const categoryConfig = {
  value: {
    label: 'Giá trị',
    icon: DollarSign,
    color: 'text-primary'
  },
  velocity: {
    label: 'Tần suất mua',
    icon: Clock,
    color: 'text-blue-600'
  },
  mix: {
    label: 'Cơ cấu',
    icon: TrendingUp,
    color: 'text-purple-600'
  },
  risk: {
    label: 'Rủi ro',
    icon: ShieldAlert,
    color: 'text-warning-foreground'
  },
  quality: {
    label: 'Chất lượng',
    icon: Database,
    color: 'text-muted-foreground'
  }
};

function TopicCard({ topic }: { topic: TopicSummary }) {
  const navigate = useNavigate();
  const config = categoryConfig[topic.category];
  const Icon = config.icon;

  const trendStyles = {
    improving: 'text-success',
    declining: 'text-destructive',
    stable: 'text-muted-foreground'
  };

  const trendLabels = {
    improving: 'Cải thiện',
    declining: 'Suy giảm',
    stable: 'Ổn định'
  };

  return (
    <Card 
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate('/cdp/insights')}
    >
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-muted/50 ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{config.label}</span>
              <span className={`text-xs font-medium ${trendStyles[topic.trendDirection]}`}>
                {trendLabels[topic.trendDirection]}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {topic.headline}
            </p>
            
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                {topic.signalCount} tín hiệu
              </span>
              {topic.criticalCount > 0 && (
                <span className="text-destructive font-medium">
                  {topic.criticalCount} nghiêm trọng
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopicSummarySection({ topics }: TopicSummarySectionProps) {
  return (
    <section>
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
        Tóm tắt theo chủ đề
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {topics.map((topic) => (
          <TopicCard key={topic.category} topic={topic} />
        ))}
      </div>
    </section>
  );
}
