import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Database,
  Filter,
  SortDesc,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InsightLayout } from '@/components/cdp/insights/InsightLayout';
import { InsightFeedCard, InsightFeedItem } from '@/components/cdp/insights/InsightFeedCard';
import { useCDPInsights, InsightTopic } from '@/hooks/useCDPInsightFeed';
import { cn } from '@/lib/utils';

// Topic filter options
type TopicFilter = 'all' | InsightTopic;

const topicLabels: Record<TopicFilter, string> = {
  all: 'Tất cả chủ đề',
  demand: 'Nhu cầu',
  value: 'Giá trị',
  timing: 'Thời gian mua',
  risk: 'Hoàn trả & Rủi ro',
  equity: 'Giá trị KH',
};

const topicIcons: Record<string, typeof DollarSign> = {
  demand: Layers,
  value: DollarSign,
  timing: Clock,
  risk: ShieldAlert,
  equity: Database,
};

// Summary stats component using topic counts from hook
function TopicSummaryCards({ 
  topicCounts,
  insights,
  activeTopic, 
  onTopicClick 
}: { 
  topicCounts: Record<InsightTopic, { total_count: number; active_count: number }>;
  insights: Array<{ topic: InsightTopic; status: string }>;
  activeTopic: TopicFilter;
  onTopicClick: (topic: TopicFilter) => void;
}) {
  const topics: InsightTopic[] = ['demand', 'value', 'timing', 'risk', 'equity'];

  return (
    <div className="grid grid-cols-5 gap-3">
      {topics.map((topic) => {
        const Icon = topicIcons[topic];
        const count = topicCounts[topic]?.active_count || 0;
        const hasActiveInsights = insights.some(i => i.topic === topic && i.status === 'active');
        
        return (
          <Card 
            key={topic}
            className={cn(
              'cursor-pointer transition-all hover:shadow-sm',
              activeTopic === topic && 'ring-2 ring-primary',
              hasActiveInsights && 'border-warning/30'
            )}
            onClick={() => onTopicClick(activeTopic === topic ? 'all' : topic)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className={cn(
                  'text-lg font-bold',
                  count > 0 ? 'text-warning-foreground' : 'text-muted-foreground'
                )}>
                  {count}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{topicLabels[topic]}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function InsightsPage() {
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'date'>('severity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cooldown'>('all');

  // Fetch from database
  const { insights, topicCounts, isLoading } = useCDPInsights();

  // Convert DB format to component format
  const feedItems: InsightFeedItem[] = useMemo(() => {
    return insights.map(i => ({
      code: i.code,
      title: i.title,
      topic: i.topic,
      populationName: i.population_name,
      populationSize: i.population_size,
      revenueContribution: i.revenue_contribution,
      severity: i.severity === 'critical' ? 'high' : i.severity as 'low' | 'medium' | 'high',
      confidence: i.confidence,
      detectedAt: new Date(i.detected_at),
      status: i.status,
      changePercent: i.change_percent,
      changeDirection: i.change_direction === 'stable' ? 'up' : i.change_direction,
    }));
  }, [insights]);

  // Filter and sort insights (filtering done client-side for responsiveness)
  const filteredInsights = useMemo(() => {
    let result = [...feedItems];
    
    if (topicFilter !== 'all') {
      result = result.filter(i => i.topic === topicFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    if (sortBy === 'severity') {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
        if (severityDiff !== 0) return severityDiff;
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });
    } else {
      result.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    }
    
    return result;
  }, [feedItems, topicFilter, sortBy, statusFilter]);

  if (isLoading) {
    return (
      <InsightLayout title="Dòng Insight">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Đang tải...</span>
        </div>
      </InsightLayout>
    );
  }

  return (
    <InsightLayout title="Dòng Insight">
      <div className="space-y-6">
        {/* Topic Summary Cards */}
        <TopicSummaryCards 
          topicCounts={topicCounts}
          insights={feedItems}
          activeTopic={topicFilter}
          onTopicClick={setTopicFilter}
        />

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {topicFilter === 'all' 
                ? `Tất cả Insight (${filteredInsights.length})`
                : `${topicLabels[topicFilter]} (${filteredInsights.length})`
              }
            </h2>
            {topicFilter !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setTopicFilter('all')}
                className="text-xs"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hiệu lực</SelectItem>
                <SelectItem value="cooldown">Cooldown</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SortDesc className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">Nghiêm trọng + Mới nhất</SelectItem>
                <SelectItem value="date">Mới nhất trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Insights List */}
        {filteredInsights.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Database className="w-8 h-8 text-success mx-auto mb-3" />
              <p className="font-medium">Không có insight nào</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hệ thống chưa phát hiện insight hoặc chưa có dữ liệu CDP
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {filteredInsights.map((insight) => (
                <InsightFeedCard key={insight.code} insight={insight} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Insight chỉ dẫn tới quyết định điều hành, không dẫn tới hành động marketing</p>
        </div>
      </div>
    </InsightLayout>
  );
}
