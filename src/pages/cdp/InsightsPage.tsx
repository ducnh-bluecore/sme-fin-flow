import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Database,
  Filter,
  SortDesc
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
import { cn } from '@/lib/utils';

// Topic filter options
type TopicFilter = 'all' | 'demand' | 'value' | 'timing' | 'risk' | 'equity';

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

// Mock data for insights feed
const mockInsights: InsightFeedItem[] = [
  {
    code: 'V01',
    title: 'Chi tiêu trung bình của nhóm Top 20% giảm 15.9% so với 30 ngày trước',
    topic: 'value',
    populationName: 'Top 20% khách hàng',
    populationSize: 2456,
    revenueContribution: 65,
    severity: 'high',
    confidence: 'high',
    detectedAt: new Date('2025-01-18'),
    status: 'active',
    changePercent: -15.9,
    changeDirection: 'down',
  },
  {
    code: 'T01',
    title: 'Khoảng cách giữa các đơn hàng của khách mua lại tăng 12 ngày',
    topic: 'timing',
    populationName: 'Khách mua lại',
    populationSize: 8234,
    revenueContribution: 78,
    severity: 'medium',
    confidence: 'high',
    detectedAt: new Date('2025-01-17'),
    status: 'active',
    changePercent: 18.5,
    changeDirection: 'up',
  },
  {
    code: 'R02',
    title: 'Tỷ lệ hoàn trả của khách mới tăng từ 8% lên 14%',
    topic: 'risk',
    populationName: 'Khách mới (< 60 ngày)',
    populationSize: 1567,
    revenueContribution: 12,
    severity: 'high',
    confidence: 'medium',
    detectedAt: new Date('2025-01-16'),
    status: 'active',
    changePercent: 75,
    changeDirection: 'up',
  },
  {
    code: 'V02',
    title: 'AOV nén lại: khách chi trung bình thấp hơn 18% so với Q4/2024',
    topic: 'value',
    populationName: 'Toàn bộ khách hàng',
    populationSize: 12450,
    revenueContribution: 100,
    severity: 'medium',
    confidence: 'high',
    detectedAt: new Date('2025-01-15'),
    status: 'cooldown',
    changePercent: -18,
    changeDirection: 'down',
  },
  {
    code: 'E01',
    title: 'Customer Equity của phân khúc Loyal giảm 8.2% trong 30 ngày',
    topic: 'equity',
    populationName: 'Loyal (> 5 đơn)',
    populationSize: 3421,
    revenueContribution: 52,
    severity: 'medium',
    confidence: 'medium',
    detectedAt: new Date('2025-01-14'),
    status: 'active',
    changePercent: -8.2,
    changeDirection: 'down',
  },
  {
    code: 'D01',
    title: 'Tần suất mua của nhóm Dormant không có dấu hiệu phục hồi',
    topic: 'demand',
    populationName: 'Dormant (> 90 ngày)',
    populationSize: 4532,
    revenueContribution: 8,
    severity: 'low',
    confidence: 'high',
    detectedAt: new Date('2025-01-12'),
    status: 'active',
    changePercent: -2.1,
    changeDirection: 'down',
  },
];

// Summary stats component
function TopicSummaryCards({ 
  insights, 
  activeTopic, 
  onTopicClick 
}: { 
  insights: InsightFeedItem[];
  activeTopic: TopicFilter;
  onTopicClick: (topic: TopicFilter) => void;
}) {
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = { demand: 0, value: 0, timing: 0, risk: 0, equity: 0 };
    insights.forEach(i => { counts[i.topic] = (counts[i.topic] || 0) + 1; });
    return counts;
  }, [insights]);

  const topics: TopicFilter[] = ['demand', 'value', 'timing', 'risk', 'equity'];

  return (
    <div className="grid grid-cols-5 gap-3">
      {topics.map((topic) => {
        const Icon = topicIcons[topic];
        const count = topicCounts[topic] || 0;
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

  // Filter and sort insights
  const filteredInsights = useMemo(() => {
    let result = [...mockInsights];
    
    // Filter by topic
    if (topicFilter !== 'all') {
      result = result.filter(i => i.topic === topicFilter);
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    // Sort
    if (sortBy === 'severity') {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });
    } else {
      result.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    }
    
    return result;
  }, [topicFilter, sortBy, statusFilter]);

  const activeCount = mockInsights.filter(i => i.status === 'active').length;

  return (
    <InsightLayout title="Dòng Insight">
      <div className="space-y-6">
        {/* Topic Summary Cards */}
        <TopicSummaryCards 
          insights={mockInsights}
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
              <p className="font-medium">Không có insight nào phù hợp</p>
              <p className="text-sm text-muted-foreground mt-1">
                Thử thay đổi bộ lọc hoặc chờ hệ thống phát hiện thêm
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
